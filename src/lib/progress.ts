import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

// Which tasks each person has completed, keyed by their Google email.
//
// With DATABASE_URL set (production), records live in Postgres. Without it,
// they go to .data/progress.json so the app runs locally with no setup.

type ProgressStore = {
  completedTaskIds(email: string): Promise<string[]>;
  // Resolves true only when the task wasn't already marked complete.
  markComplete(email: string, name: string, taskId: string): Promise<boolean>;
  markIncomplete(email: string, taskId: string): Promise<void>;
};

function postgresStore(databaseUrl: string): ProgressStore {
  const sql = neon(databaseUrl);

  let tableReady: Promise<unknown> | undefined;
  const ensureTable = () =>
    (tableReady ??= sql`
      create table if not exists task_completions (
        user_email   text        not null,
        task_id      text        not null,
        user_name    text,
        completed_at timestamptz not null default now(),
        primary key (user_email, task_id)
      )
    `.catch((error) => {
      tableReady = undefined;
      throw error;
    }));

  return {
    async completedTaskIds(email) {
      await ensureTable();
      const rows = await sql`
        select task_id from task_completions where user_email = ${email}
      `;
      return rows.map((row) => row.task_id as string);
    },
    async markComplete(email, name, taskId) {
      await ensureTable();
      const rows = await sql`
        insert into task_completions (user_email, user_name, task_id)
        values (${email}, ${name}, ${taskId})
        on conflict do nothing
        returning task_id
      `;
      return rows.length > 0;
    },
    async markIncomplete(email, taskId) {
      await ensureTable();
      await sql`
        delete from task_completions
        where user_email = ${email} and task_id = ${taskId}
      `;
    },
  };
}

// Local development only: serverless hosts have no writable disk.
function fileStore(): ProgressStore {
  type Data = Record<string, Record<string, string>>; // email -> taskId -> completedAt
  const file = path.join(process.cwd(), ".data", "progress.json");

  async function read(): Promise<Data> {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as Data;
    } catch {
      return {};
    }
  }

  async function write(data: Data) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2));
  }

  return {
    async completedTaskIds(email) {
      return Object.keys((await read())[email] ?? {});
    },
    async markComplete(email, _name, taskId) {
      const data = await read();
      const tasks = (data[email] ??= {});
      if (tasks[taskId]) return false;
      tasks[taskId] = new Date().toISOString();
      await write(data);
      return true;
    },
    async markIncomplete(email, taskId) {
      const data = await read();
      if (!data[email]?.[taskId]) return;
      delete data[email][taskId];
      await write(data);
    },
  };
}

const store: ProgressStore = process.env.DATABASE_URL
  ? postgresStore(process.env.DATABASE_URL)
  : fileStore();

export const { completedTaskIds, markComplete, markIncomplete } = store;
