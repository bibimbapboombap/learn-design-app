/* eslint-disable @typescript-eslint/no-explicit-any */
// Checks the Notion reader and parser against a fake Notion API.
// Run with `npm test` (Node runs the TypeScript directly).
import assert from "node:assert/strict";
import test from "node:test";
import { fetchBlockTree, notionPageId } from "../src/lib/notion/client.ts";
import { parseCurriculum } from "../src/lib/notion/parse.ts";

const t = (text: string, href: string | null = null) => ({ plain_text: text, href });
const b = (id: string, type: string, rich: any[] = [], has_children = false, extra: any = {}) =>
  ({ id, type, has_children, [type]: { rich_text: rich, ...extra } });

// Fake Notion: page children split over two pages of results.
const tree: Record<string, any[]> = {
  PAGE: [
    b("callout", "callout", [t("How this page works")], true),
    b("orphan", "bulleted_list_item", [t("Above first heading, ignored")]),
    b("h-found", "heading_2", [t("Foundations")]),
    b("p1", "paragraph", [t("Start here.")]),
    b("t1", "bulleted_list_item", [t("Read "), t("The Design", "https://nngroup.com/book"), t(" of Everyday Things", "https://nngroup.com/book")], true),
  ],
  PAGE_2: [
    b("t2", "to_do", [t("Typography basics")], true),
    b("p-after", "paragraph", [t("Notes after tasks are ignored")]),
    b("h-empty", "heading_2", [t("Empty section")]),
    b("h-toggle", "heading_3", [t("Practice")], true),
  ],
  t1: [
    b("d1", "paragraph", [t("Focus on chapters 1–2.")]),
    b("r1", "bulleted_list_item", [t("Don Norman: "), t("NN/g page", "https://www.nngroup.com/books/x")]),
  ],
  t2: [
    b("r2", "bulleted_list_item", [t("https://practicaltypography.com/", "https://practicaltypography.com/")]),
    { id: "bm", type: "bookmark", has_children: false, bookmark: { url: "https://www.youtube.com/watch?v=1", caption: [] } },
    b("bad", "paragraph", [t("evil", "javascript:alert(1)")]),
    b("two", "paragraph", [t("A", "https://a.com"), t(" and "), t("B", "https://b.com")]),
  ],
  "h-toggle": [
    b("t3", "toggle", [t("Redesign a screen")], true),
    b("blank", "bulleted_list_item", [t("   ")]),
    b("note", "callout", [t("Weekly rhythm")], true, { icon: { type: "emoji", emoji: "🗓️" } }),
  ],
  t3: [b("d3", "paragraph", [t("Line one")]), b("d4", "paragraph", [t("Line two")])],
  note: [b("n1", "paragraph", [t("3–4 h reading.")]), b("n2", "bulleted_list_item", [t("Guide", "https://example.com/guide")])],
};

test("reads a Notion page into sections and tasks", async () => {
  let inFlight = 0, maxInFlight = 0, rateLimited = false;
  globalThis.fetch = (async (url: string, init: any) => {
    inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    assert.equal(init.headers.Authorization, "Bearer secret");
    const u = new URL(url);
    const id = u.pathname.split("/")[3];
    if (id === "t2" && !rateLimited) { rateLimited = true; return new Response("{}", { status: 429, headers: { "Retry-After": "0" } }); }
    if (id === "PAGE" && !u.searchParams.get("start_cursor"))
      return Response.json({ results: tree.PAGE, next_cursor: "c2" });
    if (id === "PAGE") return Response.json({ results: tree.PAGE_2, next_cursor: null });
    return Response.json({ results: tree[id] ?? [], next_cursor: null });
  }) as any;

  const blocks = await fetchBlockTree("PAGE", "secret");
  const sections = parseCurriculum(blocks);
  assert.equal(rateLimited, true);

  assert.equal(maxInFlight <= 3, true);
  assert.deepEqual(sections.map((s: any) => s.title), ["Foundations", "Practice"]);
  const [found, practice] = sections;
  assert.equal(found.description, "Start here.");
  assert.deepEqual(found.tasks.map((x: any) => x.id), ["t1", "t2"]);
  assert.equal(found.tasks[0].title, "Read The Design of Everyday Things");
  assert.equal(found.tasks[0].description, "Focus on chapters 1–2.");
  assert.deepEqual(found.tasks[0].resources, [
    { title: "The Design of Everyday Things", url: "https://nngroup.com/book" },
    { title: "Don Norman: NN/g page", url: "https://www.nngroup.com/books/x" },
  ]);
  assert.deepEqual(found.tasks[1].resources.map((r: any) => r.title),
    ["practicaltypography.com", "youtube.com/watch", "A", "B"]);
  assert.equal(practice.tasks.length, 2);
  assert.equal(practice.tasks[0].description, "Line one\nLine two");
  assert.equal(practice.tasks[0].note, undefined);
  // A callout becomes an info card, keeping its icon, description and links.
  assert.deepEqual(practice.tasks[1], {
    id: "note",
    title: "Weekly rhythm",
    description: "3–4 h reading.",
    resources: [{ title: "Guide", url: "https://example.com/guide" }],
    note: true,
    icon: "🗓️",
  });
});

test("accepts a page id or URL for NOTION_PAGE_ID", () => {

  assert.equal(notionPageId("https://www.notion.so/Cafe-Design-3fe68d167fdb815c9dfac3548e06a8bc?pvs=4"), "3fe68d167fdb815c9dfac3548e06a8bc");
  assert.equal(notionPageId("3fe68d16-7fdb-815c-9dfa-c3548e06a8bc"), "3fe68d167fdb815c9dfac3548e06a8bc");
});
