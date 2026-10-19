import type { Section } from "../content/types";
import type { Completion, Person } from "./store";

// Builds the admin overview: each person's progress against the current task
// list, plus the latest completions across everyone. Completions of tasks that
// are no longer on the Notion page are ignored. No runtime imports, so
// `npm test` can run it with plain Node.

export type SectionProgress = {
  id: string;
  title: string;
  total: number;
  done: { id: string; title: string; completedAt: number }[];
};

export type PersonProgress = {
  email: string;
  name: string;
  total: number;
  done: number;
  percent: number;
  lastSeen?: number;
  latest?: { title: string; at: number };
  sections: SectionProgress[];
};

export type Activity = {
  email: string;
  name: string;
  taskTitle: string;
  at: number;
};

export function buildOverview(
  sections: Section[],
  people: Person[],
  completions: Completion[],
  recentLimit = 10,
): { people: PersonProgress[]; recent: Activity[] } {
  const checkable = sections
    .map((section) => ({ ...section, tasks: section.tasks.filter((task) => !task.note) }))
    .filter((section) => section.tasks.length > 0);
  const titles = new Map(checkable.flatMap((s) => s.tasks.map((t) => [t.id, t.title] as const)));
  const total = titles.size;

  const known = completions.filter((completion) => titles.has(completion.taskId));
  const byEmail = new Map<string, Map<string, number>>();
  for (const { email, taskId, completedAt } of known) {
    if (!byEmail.has(email)) byEmail.set(email, new Map());
    byEmail.get(email)!.set(taskId, completedAt);
  }

  // Everyone who visited, plus anyone with completions from before visits
  // were recorded.
  const names = new Map(people.map((person) => [person.email, person.name]));
  const lastSeen = new Map(people.map((person) => [person.email, person.lastSeen]));
  const emails = new Set([...names.keys(), ...byEmail.keys()]);

  const progress: PersonProgress[] = [...emails].map((email) => {
    const doneAt = byEmail.get(email) ?? new Map<string, number>();
    const sectionProgress = checkable.map((section) => ({
      id: section.id,
      title: section.title,
      total: section.tasks.length,
      done: section.tasks
        .filter((task) => doneAt.has(task.id))
        .map((task) => ({ id: task.id, title: task.title, completedAt: doneAt.get(task.id)! })),
    }));
    const latestEntry = [...doneAt.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      email,
      name: names.get(email) ?? email,
      total,
      done: doneAt.size,
      percent: total ? Math.round((doneAt.size / total) * 100) : 0,
      lastSeen: lastSeen.get(email),
      latest: latestEntry && { title: titles.get(latestEntry[0])!, at: latestEntry[1] },
      sections: sectionProgress,
    };
  });

  // Most recently active first.
  const activity = (person: PersonProgress) =>
    Math.max(person.latest?.at ?? 0, person.lastSeen ?? 0);
  progress.sort((a, b) => activity(b) - activity(a));

  const recent = [...known]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, recentLimit)
    .map((completion) => ({
      email: completion.email,
      name: names.get(completion.email) ?? completion.email,
      taskTitle: titles.get(completion.taskId)!,
      at: completion.completedAt,
    }));

  return { people: progress, recent };
}

// "just now", "5 minutes ago", "yesterday", "3 weeks ago"…
export function timeAgo(at: number, now: number): string {
  const seconds = Math.round((at - now) / 1000);
  if (Math.abs(seconds) < 60) return "just now";
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const [unit, size] = units.find(([, size]) => Math.abs(seconds) >= size)!;
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    Math.round(seconds / size),
    unit,
  );
}
