import { tool } from "ai";
import { z } from "zod";

export const saveToNotion = tool({
  description:
    "Save research notes to the user's Notion workspace as a new page. Returns the URL of the created page.",
  inputSchema: z.object({
    title: z.string().describe("The title of the Notion page to create"),
    content: z
      .string()
      .describe("Markdown content to write into the Notion page"),
  }),
  execute: async ({ title, content }) => {
    const notionApiKey = process.env.NOTION_API_KEY;
    const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

    if (!notionApiKey) {
      throw new Error("NOTION_API_KEY is not configured");
    }

    // Convert markdown to Notion block format
    const children = markdownToBlocks(content);

    // Convert markdown bold/italic in title to plain text for page title
    const plainTitle = title.replace(/\*\*/g, "").replace(/\*/g, "");

    const body: Record<string, unknown> = {
      parent: parentPageId
        ? { page_id: parentPageId }
        : { workspace: true },
      properties: {
        title: {
          title: [{ text: { content: plainTitle } }],
        },
      },
      children,
    };

    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Notion API error (${res.status}): ${error}`);
    }

    const page = (await res.json()) as { url: string };
    return page.url;
  },
});

/**
 * Converts basic markdown into Notion block objects.
 * Supports paragraphs, headings (## – ######), bullet lists, and numbered lists.
 */
function markdownToBlocks(markdown: string): Record<string, unknown>[] {
  const lines = markdown.split("\n");
  const blocks: Record<string, unknown>[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{2,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 2 | 3 | 4 | 5 | 6;
      const tag = `heading_${level}` as const;
      blocks.push({
        object: "block",
        type: tag,
        [tag]: {
          rich_text: [{ text: { content: headingMatch[2] } }],
        },
      });
      i++;
      continue;
    }

    // Bullet list items
    if (/^[-*]\s/.test(line.trimStart())) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [
            { text: { content: line.trimStart().replace(/^[-*]\s/, "") } },
          ],
        },
      });
      i++;
      continue;
    }

    // Numbered list items
    const numberedMatch = line.match(/^\d+\.\s(.+)$/);
    if (numberedMatch) {
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [{ text: { content: numberedMatch[1] } }],
        },
      });
      i++;
      continue;
    }

    // Default: paragraph — merge consecutive non-special lines
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{2,6}\s|[-*]\s|\d+\.\s)/.test(lines[i].trimStart())
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          { text: { content: paragraphLines.join("\n") } },
        ],
      },
    });
  }

  return blocks;
}