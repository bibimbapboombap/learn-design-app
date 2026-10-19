"use client";

import { useEffect } from "react";
import styles from "./page.module.css";

// Shown when the page fails to render, e.g. Notion is unreachable.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Couldn&apos;t load the tasks</h1>
      <p className={styles.intro}>Something went wrong on our side. Please try again.</p>
      <p>
        <button type="button" className={styles.button} onClick={() => retry()}>
          Try again
        </button>
      </p>
    </main>
  );
}
