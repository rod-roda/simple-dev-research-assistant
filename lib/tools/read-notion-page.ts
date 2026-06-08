import { tool } from "ai";
import { z } from "zod";

export const readNotionPage = tool({
  description:
    "Read the content of a Notion page by its page ID or URL. Returns the page title and all content blocks as readable text.",
  inputSchema: z.object({
    pageIdOrUrl: z
      .string()
      .describe(
        "The Notion page ID (e.g. '3666e546f81680369426d12325c02872') or full Notion URL"
      ),
  }),
  execute: async ({ pageIdOrUrl }) => {
    const notionApiKey = process.env.NOTION_API_KEY;
    if (!notionApiKey) {
      throw new Error("NOTION_API_KEY is not configured");
    }

    const notionVersion = "2022-06-28";
    const headers = {
      Authorization: `Bearer ${notionApiKey}`,
      "Notion-Version": notionVersion,
    };

    // Extract page ID from URL if needed
    // Notion URLs look like: https://www.notion.so/Page-Title-3666e546f81680369426d12325c02872
    // or: https://www.notion.so/3666e546f81680369426d12325c02872
    let pageId = pageIdOrUrl;
    if (pageIdOrUrl.startsWith("http")) {
      const url = new URL(pageIdOrUrl);
      // The page ID is the last segment, possibly after a hyphen-separated title
      const lastSegment = url.pathname.split("/").pop() || "";
      // Notion page IDs are 32 hex chars (no dashes) or 36 chars (with dashes)
      const match = lastSegment.match(/([0-9a-f]{32}|[0-9a-f-]{36})$/i);
      if (match) {
        pageId = match[1];
      } else {
        // Use the whole last segment as-is
        pageId = lastSegment;
      }
    }

    // Remove dashes from page ID for Notion API (API accepts both formats but consistency helps)
    // Actually, Notion API accepts both 32-char and 36-char IDs, so we keep it as-is.

    // 1. Fetch page metadata (title)
    const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers,
    });

    if (!pageRes.ok) {
      const error = await pageRes.text();
      throw new Error(`Notion API error fetching page (${pageRes.status}): ${error}`);
    }

    const page = (await pageRes.json()) as {
      properties: Record<string, unknown>;
      url: string;
    };

    // 2. Fetch page content (blocks)
    const blocks = await fetchAllBlocks(pageId, headers);

    // 3. Extract title
    const title = extractTitle(page.properties);

    // 4. Render blocks to text
    const content = blocks.map(renderBlock).join("\n");

    return title ? `# ${title}\n\n${content}` : content || "(empty page)";
  },
});

// ── Helpers ──────────────────────────────────────────────────────────

const notionHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Notion-Version": "2022-06-28",
});

function extractTitle(
  properties: Record<string, unknown>
): string {
  // Title property can be named anything; find the one with type "title"
  for (const value of Object.values(properties) as Record<string, unknown>[]) {
    if (value.type === "title" && Array.isArray(value.title)) {
      return value.title
        .map((t: { plain_text?: string }) => t.plain_text ?? "")
        .join("");
    }
  }
  return "";
}

interface NotionBlock {
  id: string;
  type: string;
  [key: string]: unknown;
}

async function fetchAllBlocks(
  pageId: string,
  headers: Record<string, string>
): Promise<NotionBlock[]> {
  let url: string | null = `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`;
  const allBlocks: NotionBlock[] = [];

  while (url) {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Notion API error fetching blocks: ${error}`);
    }
    const data = (await res.json()) as {
      results: NotionBlock[];
      has_more: boolean;
      next_cursor: string | null;
    };
    allBlocks.push(...data.results);

    // Recursively fetch children for blocks that have them (e.g. toggle, synced block)
    for (const block of data.results) {
      if (block.has_children) {
        const children = await fetchAllBlocks(block.id, headers);
        // Attach children as a known property for rendering
        (block as Record<string, unknown>).__children = children;
      }
    }

    url = data.has_more && data.next_cursor
      ? `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100&start_cursor=${data.next_cursor}`
      : null;
  }

  return allBlocks;
}

function renderBlock(block: NotionBlock): string {
  const data = block[block.type] as Record<string, unknown> | undefined;
  if (!data) return "";

  const richText = data.rich_text as RichText[] | undefined;
  const text = richText ? richText.map(renderRichText).join("") : "";

  switch (block.type) {
    case "heading_1":
      return `# ${text}`;
    case "heading_2":
      return `## ${text}`;
    case "heading_3":
      return `### ${text}`;
    case "paragraph":
      return text;
    case "bulleted_list_item":
      return `- ${text}`;
    case "numbered_list_item":
      return `1. ${text}`;
    case "to_do": {
      const checked = (data as { checked?: boolean }).checked ? "x" : " ";
      return `- [${checked}] ${text}`;
    }
    case "toggle": {
      const children = (block as Record<string, unknown>).__children as NotionBlock[] | undefined;
      const childText = children ? children.map(renderBlock).join("\n") : "";
      return `> ${text}\n${childText.split("\n").map((l: string) => `> ${l}`).join("\n")}`;
    }
    case "code": {
      const lang = (data as { language?: string }).language ?? "";
      return `\`\`\`${lang}\n${text}\n\`\`\``;
    }
    case "quote":
      return text.split("\n").map((l: string) => `> ${l}`).join("\n");
    case "divider":
      return "---";
    case "callout": {
      const emoji = (data as { icon?: { emoji?: string } }).icon?.emoji ?? "💡";
      return `> ${emoji} ${text}`;
    }
    case "image": {
      const caption = (data as { caption?: RichText[] }).caption?.map(renderRichText).join("") ?? "";
      return caption ? `![${caption}]` : "![image]";
    }
    default:
      return text;
  }
}

interface RichText {
  plain_text: string;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    strikethrough?: boolean;
  };
  href?: string | null;
}

function renderRichText(rt: RichText): string {
  let text = rt.plain_text;
  const a = rt.annotations ?? {};
  if (a.code) text = `\`${text}\``;
  if (a.bold) text = `**${text}**`;
  if (a.italic) text = `*${text}**`;
  if (a.strikethrough) text = `~~${text}~~`;
  if (rt.href) text = `[${text}](${rt.href})`;
  return text;
}