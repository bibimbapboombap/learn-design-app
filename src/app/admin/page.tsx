import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCurriculum } from "@/lib/curriculum";
import { getCurrentUser } from "@/lib/current-user";
import { buildOverview, timeAgo, type PersonProgress } from "@/lib/overview";
import { listCompletions, listPeople } from "@/lib/store";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Progress overview · Design Learning" };

export default function AdminPage() {
  return (
    <main className={styles.page}>
      {/* Everything, including the heading, waits for the admin check. */}
      <Suspense fallback={<p className={styles.muted}>Loading progress…</p>}>
        <Overview />
      </Suspense>
    </main>
  );
}

async function Overview() {
  const user = await getCurrentUser();
  if (!user.isAdmin) notFound();

  const { overview, now } = await loadOverview();
  const totalDone = overview.people.reduce((sum, person) => sum + person.done, 0);
  const totalTasks = overview.people[0]?.total ?? 0;

  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← Back to tasks
        </Link>
        <h1 className={styles.title}>Progress overview</h1>
        <p className={styles.muted}>
          {overview.people.length} {overview.people.length === 1 ? "person" : "people"} ·{" "}
          {totalDone} tasks done in total
          {totalTasks > 0 && ` · ${totalTasks} tasks in the plan`}
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent activity</h2>
        {overview.recent.length === 0 ? (
          <p className={styles.muted}>No tasks done yet.</p>
        ) : (
          <ul className={styles.activity}>
            {overview.recent.map((item) => (
              <li key={`${item.email}-${item.at}-${item.taskTitle}`} className={styles.activityRow}>
                <span>
                  <strong>{item.name}</strong> finished {item.taskTitle}
                </span>
                <span className={styles.when}>{timeAgo(item.at, now)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>People</h2>
        {overview.people.length === 0 ? (
          <p className={styles.muted}>Nobody has opened the app yet.</p>
        ) : (
          <ul className={styles.people}>
            {overview.people.map((person) => (
              <li key={person.email}>
                <PersonRow person={person} now={now} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// Request-time data, read once per page load.
async function loadOverview() {
  const [sections, people, completions] = await Promise.all([
    getCurriculum(),
    listPeople(),
    listCompletions(),
  ]);
  return { overview: buildOverview(sections, people, completions), now: Date.now() };
}

function PersonRow({ person, now }: { person: PersonProgress; now: number }) {
  const status = person.latest
    ? `Latest: ${person.latest.title} · ${timeAgo(person.latest.at, now)}`
    : person.lastSeen
      ? `Nothing done yet · last visit ${timeAgo(person.lastSeen, now)}`
      : "Nothing done yet";

  return (
    <details className={styles.person}>
      <summary className={styles.summary}>
        <span className={styles.avatar} aria-hidden="true">
          {person.name.charAt(0).toUpperCase()}
        </span>
        <span className={styles.who}>
          <span className={styles.nameLine}>
            <strong>{person.name}</strong>
            <span className={styles.email}>{person.email}</span>
          </span>
          <span className={styles.status}>{status}</span>
        </span>
        <span className={styles.score}>
          <span className={styles.count}>
            {person.done} / {person.total}
          </span>
          <Bar percent={person.percent} label={`${person.name}: ${person.percent}% done`} />
        </span>
      </summary>

      <div className={styles.detail}>
        {person.sections.map((section) => (
          <div key={section.id} className={styles.phase}>
            <div className={styles.phaseHead} data-empty={section.done.length === 0}>
              <span className={styles.phaseTitle}>{section.title}</span>
              <span className={styles.count}>
                {section.done.length} / {section.total}
              </span>
            </div>
            {section.done.length > 0 && (
              <ul className={styles.doneList}>
                {section.done.map((task) => (
                  <li key={task.id} className={styles.doneRow}>
                    <span className={styles.check} aria-hidden="true">
                      ✓
                    </span>
                    <span className={styles.doneTitle}>{task.title}</span>
                    <time className={styles.when} dateTime={new Date(task.completedAt).toISOString()}>
                      {formatDate(task.completedAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

function Bar({ percent, label }: { percent: number; label: string }) {
  return (
    <span
      className={styles.track}
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className={styles.fill} style={{ width: `${percent}%` }} />
    </span>
  );
}

function formatDate(at: number): string {
  return new Date(at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
