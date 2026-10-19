import "server-only";
import { cacheLife } from "next/cache";
import { sampleCurriculum } from "@/content/sample-curriculum";
import type { Section, Task } from "@/content/types";
import { fetchBlockTree, notionPageId } from "./notion/client";
import { parseCurriculum } from "./notion/parse";

// The learning plan, read from the Notion page in NOTION_PAGE_ID. Cached for
// about a minute, so Notion edits show up shortly after they're made. Without
// Notion credentials, the sample plan is used.
export async function getCurriculum(): Promise<Section[]> {
  "use cache";
  cacheLife("minutes");

  const token = process.env.NOTION_TOKEN;
  const page = process.env.NOTION_PAGE_ID;
  if (!token || !page) return sampleCurriculum;

  return parseCurriculum(await fetchBlockTree(notionPageId(page), token));
}

export function allTasks(sections: Section[]): Task[] {
  return sections.flatMap((section) => section.tasks);
}
