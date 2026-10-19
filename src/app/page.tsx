import Link from "next/link";
import { after } from "next/server";
import { Suspense } from "react";
import { getCurriculum } from "@/lib/curriculum";
import { getCurrentUser } from "@/lib/current-user";
import { completedTaskIds, recordVisit } from "@/lib/store";
import { signOutAction } from "./actions";
import { TaskList } from "./task-list";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.icon} aria-hidden="true">
          📚
        </div>
        <h1 className={styles.title}>Design Learning</h1>
        <p className={styles.intro}>
          Work through the tasks below at your own pace. Tick a task off when you finish it.
        </p>
      </header>

      {/* The session is read per request, so this part streams in. */}
      <Suspense fallback={<p className={styles.loading}>Loading your progress…</p>}>
        <Plan />
      </Suspense>
    </main>
  );
}

async function Plan() {
  const user = await getCurrentUser();
  const [sections, completedIds] = await Promise.all([
    getCurriculum(),
    completedTaskIds(user.email),
  ]);
  // Feeds "last visit" on the admin overview; doesn't hold up the page.
  after(() =>
    recordVisit(user.email, user.name).catch((error) =>
      console.error("[visits] Couldn't record visit:", error),
    ),
  );

  return (
    <>
      <div className={styles.userBar}>
        <span className={styles.avatar} aria-hidden="true">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className={styles.who}>
          <strong className={styles.name}>{user.name}</strong>
          <span className={styles.email}>{user.email}</span>
        </span>
        {user.isAdmin && (
          <Link href="/admin" className={styles.button}>
            Admin
          </Link>
        )}
        <form action={signOutAction}>
          <button type="submit" className={styles.button}>
            Sign out
          </button>
        </form>
      </div>

      <TaskList sections={sections} completedIds={completedIds} />
    </>
  );
}
