// Reads a Notion page's blocks through the public API, including the nested
// blocks the parser needs (tasks inside toggle headings, details under tasks).
// No runtime imports, so it can be exercised outside Next.js.

export type RichText = {
  plain_text: string;
  href: string | null;
};

export type NotionBlock = {
  id: string;
  type: string;
  has_children: boolean;
  children?: NotionBlock[];
} & Record<string, unknown>;

const API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
// Notion allows about three requests per second per integration.
const MAX_CONCURRENT_REQUESTS = 3;
// Page → heading → task → task details. Deeper blocks are never shown.
const MAX_DEPTH = 3;
const EXPANDABLE = new Set([
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "to_do",
  "toggle",
]);

// Accepts a bare id (with or without dashes) or a full Notion page URL.
export function notionPageId(value: string): string {
  const compact = value.trim().split(/[?#]/)[0].replace(/-/g, "");
  const match = compact.match(/[0-9a-f]{32}$/i);
  if (!match) throw new Error("NOTION_PAGE_ID is not a Notion page id or URL");
  return match[0];
}

export async function fetchBlockTree(pageId: string, token: string): Promise<NotionBlock[]> {
  const limit = createLimiter(MAX_CONCURRENT_REQUESTS);

  async function request(path: string, attempt = 1): Promise<unknown> {
    const response = await limit(() =>
      fetch(`${API}${path}`, {
        headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_VERSION },
        cache: "no-store",
      }),
    );
    if (response.status === 429 && attempt < 4) {
      const seconds = Number(response.headers.get("Retry-After")) || attempt;
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      return request(path, attempt + 1);
    }
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(`Notion API ${response.status}: ${body.message ?? response.statusText}`);
    }
    return response.json();
  }

  async function children(blockId: string, depth: number): Promise<NotionBlock[]> {
    const blocks: NotionBlock[] = [];
    let cursor: string | null = null;
    do {
      const query = cursor ? `&start_cursor=${cursor}` : "";
      const page = (await request(`/blocks/${blockId}/children?page_size=100${query}`)) as {
        results: NotionBlock[];
        next_cursor: string | null;
      };
      blocks.push(...page.results);
      cursor = page.next_cursor;
    } while (cursor);

    if (depth < MAX_DEPTH) {
      await Promise.all(
        blocks
          .filter((block) => block.has_children && EXPANDABLE.has(block.type))
          .map(async (block) => {
            block.children = await children(block.id, depth + 1);
          }),
      );
    }
    return blocks;
  }

  return children(pageId, 1);
}

function createLimiter(max: number) {
  let active = 0;
  const waiting: (() => void)[] = [];

  return async function limit<T>(task: () => Promise<T>): Promise<T> {
    if (active < max) active++;
    else await new Promise<void>((resolve) => waiting.push(resolve));
    try {
      return await task();
    } finally {
      // Hand the slot straight to the next task, or free it.
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}
