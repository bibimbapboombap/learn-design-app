"use client";

import { startTransition, useOptimistic, useState } from "react";
import type { Section } from "@/content/types";
import { setTaskCompleted } from "./actions";
import styles from "./task-list.module.css";

type Props = {
  sections: Section[];
  completedIds: string[];
};

export function TaskList({ sections, completedIds }: Props) {
  const [completed, setOptimisticCompleted] = useOptimistic(
    new Set(completedIds),
    (current, change: { taskId: string; done: boolean }) => {
      const next = new Set(current);
      if (change.done) next.add(change.taskId);
      else next.delete(change.taskId);
      return next;
    },
  );
  const [error, setError] = useState<string | null>(null);

  const tasks = sections.flatMap((section) => section.tasks).filter((task) => !task.note);
  const doneCount = tasks.filter((task) => completed.has(task.id)).length;
  const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  function toggle(taskId: string, done: boolean) {
    setError(null);
    startTransition(async () => {
      setOptimisticCompleted({ taskId, done });
      try {
        await setTaskCompleted(taskId, done);
      } catch {
        setError("Couldn't save that change. Please try again.");
      }
    });
  }

  if (tasks.length === 0) {
    return <p className={styles.empty}>No tasks yet. Check back soon.</p>;
  }

  return (
    <div>
      <div className={styles.progress}>
        <div className={styles.progressLabel} aria-live="polite">
          <span>
            {doneCount} of {tasks.length} tasks done
          </span>
          <span className={styles.percent}>{percent}%</span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="Tasks done"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {sections.map((section) => (
        <section key={section.id} className={styles.section}>
          <h2 className={styles.sectionTitle}>{section.title}</h2>
          {section.description && (
            <p className={styles.sectionDescription}>{section.description}</p>
          )}

          <ul className={styles.tasks}>
            {section.tasks.map((task) => {
              const done = !task.note && completed.has(task.id);
              const inputId = `task-${task.id}`;
              return (
                <li key={task.id} className={styles.task} data-done={done} data-note={task.note}>
                  {task.note ? (
                    <span className={styles.icon} aria-hidden="true">
                      {task.icon ?? "💡"}
                    </span>
                  ) : (
                    <input
                      id={inputId}
                      type="checkbox"
                      className={styles.checkbox}
                      checked={done}
                      onChange={(event) => toggle(task.id, event.target.checked)}
                    />
                  )}
                  <div className={styles.body}>
                    {task.note ? (
                      <p className={styles.taskTitle}>{task.title}</p>
                    ) : (
                      <label htmlFor={inputId} className={styles.taskTitle}>
                        {task.title}
                      </label>
                    )}
                    {task.description && (
                      <p className={styles.taskDescription}>{task.description}</p>
                    )}
                    {task.resources.length > 0 && (
                      <ul className={styles.resources}>
                        {task.resources.map((resource) => (
                          <li key={resource.url}>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.resource}
                            >
                              {resource.title}
                            </a>
                            <span className={styles.host}> · {hostOf(resource.url)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function hostOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
