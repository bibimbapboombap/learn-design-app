import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import type { Section } from "@/content/types";

// Everything the app saves:
// - which tasks each person has completed, keyed by their Google email;
// - everyone who has opened the app, with their first and last visit;
// - the last task list read from Notion, so pages don't wait on Notion.
//
// With DATABASE_URL set (production), records live in Postgres. Without it,
// they go to .data/ so the app runs locally with no setup.

export type CurriculumSnapshot = {
  sections: Section[];
  fetchedAt: number; // ms since epoch
};

export type Person = {
  email: string;
  name: string;
  firstSeen: number; // ms since epoch
  lastSeen: number;
};

export type Completion = {
  email: string;
  taskId: string;
  completedAt: number; // ms since epoch
};

type Store = {
  completedTaskIds(email: string): Promise<string[]>;
  // Resolves true only when the task wasn't already marked complete.
  markComplete(email: string, name: string, taskId: string): Promise<boolean>;
  markIncomplete(email: string, taskId: string): Promise<void>;
  recordVisit(email: string, name: string): Promise<void>;
  // For the admin overview: everyone, and every completion.
  listPeople(): Promise<Person[]>;
  listCompletions(): Promise<Completion[]>;
  readCurriculumSnapshot(): Promise<CurriculumSnapshot | undefined>;
  saveCurriculumSnapshot(sections: Section[]): Promise<void>;
};

// Bump when the Section shape changes, so older snapshots are ignored.
const SNAPSHOT_VERSION = 1;
type StoredSnapshot = { version: number; sections: Section[] };

function fromStored(stored: StoredSnapshot | undefined, fetchedAt: number) {
  return stored?.version === SNAPSHOT_VERSION ? { sections: stored.sections, fetchedAt } : undefined;
}

function postgresStore(databaseUrl: string): Store {
  const sql = neon(databaseUrl);

  let tablesReady: Promise<unknown> | undefined;
  const ensureTables = () =>
    (tablesReady ??= Promise.all([
      sql`
        create table if not exists task_completions (
          user_email   text        not null,
          task_id      text        not null,
          user_name    text,
          completed_at timestamptz not null default now(),
          primary key (user_email, task_id)
        )
      `,
      sql`
        create table if not exists people (
          email      text        primary key,
          name       text        not null,
          first_seen timestamptz not null default now(),
          last_seen  timestamptz not null default now()
        )
      `,
      sql`
        create table if not exists curriculum_snapshot (
          id         int         primary key,
          data       jsonb       not null,
          fetched_at timestamptz not null default now()
        )
      `,
    ]).catch((error) => {
      tablesReady = undefined;
      throw error;
    }));

  return {
    async completedTaskIds(email) {
      await ensureTables();
      const rows = await sql`
        select task_id from task_completions where user_email = ${email}
      `;
      return rows.map((row) => row.task_id as string);
    },
    async markComplete(email, name, taskId) {
      await ensureTables();
      const rows = await sql`
        insert into task_completions (user_email, user_name, task_id)
        values (${email}, ${name}, ${taskId})
        on conflict do nothing
        returning task_id
      `;
      return rows.length > 0;
    },
    async markIncomplete(email, taskId) {
      await ensureTables();
      await sql`
        delete from task_completions
        where user_email = ${email} and task_id = ${taskId}
      `;
    },
    async recordVisit(email, name) {
      await ensureTables();
      await sql`
        insert into people (email, name) values (${email}, ${name})
        on conflict (email) do update set name = excluded.name, last_seen = now()
      `;
    },
    async listPeople() {
      await ensureTables();
      const rows = await sql`
        select email, name,
          extract(epoch from first_seen) * 1000 as first_ms,
          extract(epoch from last_seen) * 1000 as last_ms
        from people
      `;
      return rows.map((row) => ({
        email: row.email as string,
        name: row.name as string,
        firstSeen: Number(row.first_ms),
        lastSeen: Number(row.last_ms),
      }));
    },
    async listCompletions() {
      await ensureTables();
      const rows = await sql`
        select user_email, task_id, extract(epoch from completed_at) * 1000 as completed_ms
        from task_completions
      `;
      return rows.map((row) => ({
        email: row.user_email as string,
        taskId: row.task_id as string,
        completedAt: Number(row.completed_ms),
      }));
    },
    async readCurriculumSnapshot() {
      await ensureTables();
      const rows = await sql`
        select data, extract(epoch from fetched_at) * 1000 as fetched_ms
        from curriculum_snapshot where id = 1
      `;
      const row = rows[0];
      return row ? fromStored(row.data as StoredSnapshot, Number(row.fetched_ms)) : undefined;
    },
    async saveCurriculumSnapshot(sections) {
      await ensureTables();
      const data: StoredSnapshot = { version: SNAPSHOT_VERSION, sections };
      await sql`
        insert into curriculum_snapshot (id, data, fetched_at)
        values (1, ${JSON.stringify(data)}::jsonb, now())
        on conflict (id) do update set data = excluded.data, fetched_at = excluded.fetched_at
      `;
    },
  };
}

// Local development only: serverless hosts have no writable disk.
function fileStore(): Store {
  type Progress = Record<string, Record<string, string>>; // email -> taskId -> completedAt
  const dir = path.join(process.cwd(), ".data");
  const progressFile = path.join(dir, "progress.json");
  const snapshotFile = path.join(dir, "curriculum.json");
  const peopleFile = path.join(dir, "people.json");

  async function read<T>(file: string): Promise<T | undefined> {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as T;
    } catch {
      return undefined;
    }
  }

  async function write(file: string, data: unknown) {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2));
  }

  return {
    async completedTaskIds(email) {
      return Object.keys((await read<Progress>(progressFile))?.[email] ?? {});
    },
    async markComplete(email, _name, taskId) {
      const data = (await read<Progress>(progressFile)) ?? {};
      const tasks = (data[email] ??= {});
      if (tasks[taskId]) return false;
      tasks[taskId] = new Date().toISOString();
      await write(progressFile, data);
      return true;
    },
    async markIncomplete(email, taskId) {
      const data = await read<Progress>(progressFile);
      if (!data?.[email]?.[taskId]) return;
      delete data[email][taskId];
      await write(progressFile, data);
    },
    async recordVisit(email, name) {
      const people = (await read<Record<string, Person>>(peopleFile)) ?? {};
      const now = Date.now();
      people[email] = { email, name, firstSeen: people[email]?.firstSeen ?? now, lastSeen: now };
      await write(peopleFile, people);
    },
    async listPeople() {
      return Object.values((await read<Record<string, Person>>(peopleFile)) ?? {});
    },
    async listCompletions() {
      const data = (await read<Progress>(progressFile)) ?? {};
      return Object.entries(data).flatMap(([email, tasks]) =>
        Object.entries(tasks).map(([taskId, at]) => ({
          email,
          taskId,
          completedAt: Date.parse(at),
        })),
      );
    },
    async readCurriculumSnapshot() {
      const file = await read<StoredSnapshot & { fetchedAt: number }>(snapshotFile);
      return file ? fromStored(file, file.fetchedAt) : undefined;
    },
    async saveCurriculumSnapshot(sections) {
      await write(snapshotFile, { version: SNAPSHOT_VERSION, sections, fetchedAt: Date.now() });
    },
  };
}

const store: Store = process.env.DATABASE_URL
  ? postgresStore(process.env.DATABASE_URL)
  : fileStore();

export const {
  completedTaskIds,
  markComplete,
  markIncomplete,
  recordVisit,
  listPeople,
  listCompletions,
  readCurriculumSnapshot,
  saveCurriculumSnapshot,
} = store;
