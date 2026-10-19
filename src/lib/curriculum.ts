import "server-only";
import { after } from "next/server";
import { sampleCurriculum } from "@/content/sample-curriculum";
import type { Section, Task } from "@/content/types";
import { fetchBlockTree, notionPageId } from "./notion/client";
import { parseCurriculum } from "./notion/parse";
import { readCurriculumSnapshot, saveCurriculumSnapshot } from "./store";

// The learning plan, read from the Notion page in NOTION_PAGE_ID.
//
// Reading the whole page takes Notion tens of seconds (one request per task
// with details, about three requests a second), so pages are served from the
// last saved copy. When that copy is over a minute old, a fresh one is fetched
// in the background after the response. Only the very first load waits.
// Without Notion credentials, the sample plan is used.

const REFRESH_AFTER_MS = 60_000;

let refreshing: Promise<Section[]> | undefined;

export async function getCurriculum(): Promise<Section[]> {
  const token = process.env.NOTION_TOKEN;
  const page = process.env.NOTION_PAGE_ID;
  if (!token || !page) return sampleCurriculum;

  const snapshot = await readCurriculumSnapshot();
  if (!snapshot) return refresh(token, page);

  if (Date.now() - snapshot.fetchedAt > REFRESH_AFTER_MS) {
    after(() =>
      refresh(token, page).catch((error) =>
        console.error("[curriculum] Couldn't refresh from Notion:", error),
      ),
    );
  }
  return snapshot.sections;
}

// One fetch at a time per server instance.
function refresh(token: string, page: string): Promise<Section[]> {
  refreshing ??= fetchBlockTree(notionPageId(page), token)
    .then(async (blocks) => {
      const sections = parseCurriculum(blocks);
      await saveCurriculumSnapshot(sections);
      return sections;
    })
    .finally(() => {
      refreshing = undefined;
    });
  return refreshing;
}

export function allTasks(sections: Section[]): Task[] {
  return sections.flatMap((section) => section.tasks);
}
