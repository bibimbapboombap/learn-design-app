// Checks which tasks get the NEW label.
import assert from "node:assert/strict";
import test from "node:test";
import { newTaskIds } from "../src/lib/new-tasks.ts";

const day = 86_400_000;
const now = 100 * day;
const sections = [
  {
    id: "s",
    title: "Phase",
    tasks: [
      { id: "old", title: "Original", resources: [], addedAt: now - 40 * day },
      { id: "recent", title: "Added 5 days ago", resources: [], addedAt: now - 5 * day },
      { id: "card", title: "Info card", resources: [], note: true, addedAt: now - 5 * day },
      { id: "stale", title: "Added 35 days ago", resources: [], addedAt: now - 35 * day },
      { id: "unknown", title: "No date", resources: [] },
    ],
  },
];

test("labels tasks added after the person started, within 30 days", () => {
  // Started 50 days ago: only tasks from the last 30 days count.
  assert.deepEqual(newTaskIds(sections, now - 50 * day, now), ["recent", "card"]);
  // Started 3 days ago: nothing was added since.
  assert.deepEqual(newTaskIds(sections, now - 3 * day, now), []);
  // No recorded first visit: everything is new to them, so no labels.
  assert.deepEqual(newTaskIds(sections, undefined, now), []);
});
