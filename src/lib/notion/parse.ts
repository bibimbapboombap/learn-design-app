import type { Resource, Section, Task } from "../../content/types";
import type { NotionBlock, RichText } from "./client";

// Turns the Notion page into sections and tasks. The page format, as explained
// in the callout at the top of the page itself:
// - Each heading starts a section. Paragraphs between the heading and its first
//   task become the section's description.
// - Each list item, to-do or toggle under a heading is a task.
// - Each callout under a heading is an info card: shown like a task, but with
//   its icon instead of a checkbox, and not counted as a task.
// - Under a task or callout, lines without links become its description and
//   links become its resources.
// - Everything before the first heading is ignored.
// Toggle headings work too: their nested blocks belong to that section.

const HEADINGS = new Set(["heading_1", "heading_2", "heading_3"]);
const TASKS = new Set(["bulleted_list_item", "numbered_list_item", "to_do", "toggle"]);
const LINK_BLOCKS = new Set(["bookmark", "embed", "link_preview", "video"]);

export function parseCurriculum(blocks: NotionBlock[]): Section[] {
  const sections: Section[] = [];
  let current: Section | undefined;

  function visit(block: NotionBlock) {
    if (HEADINGS.has(block.type)) {
      current = { id: block.id, title: plainText(richText(block)), tasks: [] };
      sections.push(current);
      block.children?.forEach(visit);
      return;
    }
    if (!current) return;

    if (TASKS.has(block.type)) {
      const task = parseTask(block);
      if (task) current.tasks.push(task);
    } else if (block.type === "callout") {
      const note = parseTask(block);
      if (note) current.tasks.push({ ...note, note: true, icon: calloutEmoji(block) });
    } else if (block.type === "paragraph" && current.tasks.length === 0) {
      const text = plainText(richText(block));
      if (text) current.description = joinLines(current.description, text);
    }
  }

  blocks.forEach(visit);
  return sections.filter((section) => section.tasks.length > 0);
}

function parseTask(block: NotionBlock): Task | undefined {
  const title = plainText(richText(block));
  if (!title) return undefined;

  let description: string | undefined;
  const resources: Resource[] = [];
  const addResource = (resource: Resource | undefined) => {
    if (resource && !resources.some((existing) => existing.url === resource.url)) {
      resources.push(resource);
    }
  };

  // A link in the task's own text counts as a resource too.
  linksIn(richText(block)).forEach(addResource);

  for (const child of block.children ?? []) {
    if (LINK_BLOCKS.has(child.type)) {
      addResource(linkBlockResource(child));
      continue;
    }
    const text = richText(child);
    const links = linksIn(text);
    if (links.length === 1) {
      // "Don Norman: [The Design of Everyday Things](…)" keeps the whole line.
      addResource({ ...links[0], title: readableTitle(plainText(text), links[0].url) });
    } else if (links.length > 1) {
      links.forEach(addResource);
    } else if (plainText(text)) {
      description = joinLines(description, plainText(text));
    }
  }

  return { id: block.id, title, description, resources };
}

function calloutEmoji(block: NotionBlock): string | undefined {
  const icon = (block.callout as { icon?: { type?: string; emoji?: string } } | undefined)?.icon;
  return icon?.type === "emoji" ? icon.emoji : undefined;
}

function richText(block: NotionBlock): RichText[] {
  const content = block[block.type] as { rich_text?: RichText[] } | undefined;
  return content?.rich_text ?? [];
}

function plainText(text: RichText[]): string {
  return text
    .map((part) => part.plain_text)
    .join("")
    .trim();
}

function joinLines(existing: string | undefined, line: string): string {
  return existing ? `${existing}\n${line}` : line;
}

// Notion splits a link into several parts when only some of it is bold etc.,
// so neighbouring parts with the same href are merged into one link.
function linksIn(text: RichText[]): Resource[] {
  const links: Resource[] = [];
  let previousHref: string | null = null;
  for (const part of text) {
    const url = part.href ? safeUrl(part.href) : undefined;
    if (url && part.href === previousHref) {
      links[links.length - 1].title += part.plain_text;
    } else if (url) {
      links.push({ title: part.plain_text, url });
    }
    previousHref = url ? part.href : null;
  }
  return links.map((link) => ({ ...link, title: readableTitle(link.title.trim(), link.url) }));
}

function linkBlockResource(block: NotionBlock): Resource | undefined {
  const content = block[block.type] as
    | { url?: string; external?: { url?: string }; caption?: RichText[] }
    | undefined;
  const url = safeUrl(content?.url ?? content?.external?.url ?? "");
  if (!url) return undefined;
  return { title: readableTitle(plainText(content?.caption ?? []), url), url };
}

// Only web and mail links; relative hrefs are links to other Notion pages.
function safeUrl(href: string): string | undefined {
  try {
    const url = new URL(href, "https://www.notion.so");
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

// A pasted bare URL reads better as "example.com/path".
function readableTitle(title: string, url: string): string {
  if (title && title !== url && !/^https?:\/\//.test(title)) return title;
  const { hostname, pathname } = new URL(url);
  return (hostname.replace(/^www\./, "") + pathname).replace(/\/$/, "");
}
