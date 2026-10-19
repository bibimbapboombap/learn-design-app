// Checks the admin overview: per-person progress, recent activity, time labels.
import assert from "node:assert/strict";
import test from "node:test";
import { buildOverview, timeAgo } from "../src/lib/overview.ts";

const sections = [
  {
    id: "s0",
    title: "Start here",
    tasks: [{ id: "note", title: "Core rule", resources: [], note: true }],
  },
  {
    id: "s1",
    title: "Phase 1",
    tasks: [
      { id: "a", title: "Task A", resources: [] },
      { id: "b", title: "Task B", resources: [] },
    ],
  },
  { id: "s2", title: "Phase 2", tasks: [{ id: "c", title: "Task C", resources: [] }] },
];

const day = 86_400_000;
const now = 100 * day;

test("builds per-person progress and recent activity", () => {
  const people = [
    { email: "ann@x.com", name: "Ann", firstSeen: now - 9 * day, lastSeen: now - day },
    { email: "bob@x.com", name: "Bob", firstSeen: now - 2 * day, lastSeen: now - 2 * day },
  ];
  const completions = [
    { email: "ann@x.com", taskId: "a", completedAt: now - 5 * day },
    { email: "ann@x.com", taskId: "c", completedAt: now - 3 * day },
    { email: "ann@x.com", taskId: "deleted-from-notion", completedAt: now - day },
    // Completed before visits were recorded: still listed, named by email.
    { email: "cat@x.com", taskId: "b", completedAt: now - 4 * day },
  ];

  const { people: progress, recent } = buildOverview(sections, people, completions, 2);

  // Most recently active first; Bob has visited but done nothing.
  assert.deepEqual(progress.map((p) => p.email), ["ann@x.com", "bob@x.com", "cat@x.com"]);

  const [ann, bob, cat] = progress;
  assert.equal(ann.total, 3, "info cards don't count");
  assert.equal(ann.done, 2, "tasks no longer in Notion don't count");
  assert.equal(ann.percent, 67);
  assert.deepEqual(ann.latest, { title: "Task C", at: now - 3 * day });
  assert.deepEqual(
    ann.sections.map((s) => [s.title, s.done.length, s.total]),
    [["Phase 1", 1, 2], ["Phase 2", 1, 1]],
  );
  assert.equal(bob.done, 0);
  assert.equal(bob.latest, undefined);
  assert.equal(cat.name, "cat@x.com");

  assert.deepEqual(
    recent.map((r) => [r.name, r.taskTitle]),
    [["Ann", "Task C"], ["cat@x.com", "Task B"]],
  );
});

test("labels times relative to now", () => {
  assert.equal(timeAgo(now - 20_000, now), "just now");
  assert.equal(timeAgo(now - 5 * 60_000, now), "5 minutes ago");
  assert.equal(timeAgo(now - 3 * 3_600_000, now), "3 hours ago");
  assert.equal(timeAgo(now - day, now), "yesterday");
  assert.equal(timeAgo(now - 15 * day, now), "2 weeks ago");
});
