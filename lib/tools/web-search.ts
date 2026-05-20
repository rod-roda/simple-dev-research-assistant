import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";

export const webSearch = tool({
  description:
    "Search the web for information. Returns the top 5 results with titles, URLs, and content snippets.",
  inputSchema: z.object({
    query: z.string().describe("The search query to look up on the web"),
  }),
  execute: async ({ query }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      throw new Error("TAVILY_API_KEY is not configured");
    }
    const client = tavily({ apiKey });

    const response = await client.search(query, {
      maxResults: 5,
    });

    return response.results
      .map(
        (r, i) =>
          `## ${i + 1}. ${r.title}\nURL: ${r.url}\n${r.content}`
      )
      .join("\n\n");
  },
});