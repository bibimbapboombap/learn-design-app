import type { Section } from "../content/types";

// Which tasks to label NEW for one person: those added to the plan after
// they first opened the app, within the last 30 days. Someone without a
// recorded first visit is new themselves, so nothing is new to them. No
// runtime imports, so `npm test` can run it with plain Node.

export const NEW_FOR_DAYS = 30;

export function newTaskIds(
  sections: Section[],
  firstSeen: number | undefined,
  now = Date.now(),
): string[] {
  const since = Math.max(firstSeen ?? now, now - NEW_FOR_DAYS * 86_400_000);
  return sections
    .flatMap((section) => section.tasks)
    .filter((task) => task.addedAt !== undefined && task.addedAt > since)
    .map((task) => task.id);
}
