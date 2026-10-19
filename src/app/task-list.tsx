"use client";

import { startTransition, useOptimistic, useState } from "react";
import type { Section } from "@/content/curriculum";
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

  const total = sections.reduce((sum, section) => sum + section.tasks.length, 0);
  const doneCount = sections
    .flatMap((section) => section.tasks)
    .filter((task) => completed.has(task.id)).length;

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

  return (
    <div>
      <p className={styles.progress} aria-live="polite">
        {doneCount} of {total} tasks done
      </p>
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
              const done = completed.has(task.id);
              const inputId = `task-${task.id}`;
              return (
                <li key={task.id} className={styles.task} data-done={done}>
                  <input
                    id={inputId}
                    type="checkbox"
                    className={styles.checkbox}
                    checked={done}
                    onChange={(event) => toggle(task.id, event.target.checked)}
                  />
                  <div>
                    <label htmlFor={inputId} className={styles.taskTitle}>
                      {task.title}
                    </label>
                    {task.description && (
                      <p className={styles.taskDescription}>{task.description}</p>
                    )}
                    {task.resources && task.resources.length > 0 && (
                      <ul className={styles.resources}>
                        {task.resources.map((resource) => (
                          <li key={resource.url}>
                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                              {resource.title}
                            </a>
                            {resource.kind && (
                              <span className={styles.kind}> · {resource.kind}</span>
                            )}
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
