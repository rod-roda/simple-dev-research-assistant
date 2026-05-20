import { anthropic } from "@ai-sdk/anthropic";
import { streamText, stepCountIs, convertToModelMessages } from "ai";
import type { ModelMessage, UIMessage } from "ai";
import { tools } from "@/lib/tools/definitions";
import { retrieve } from "@/lib/rag/retriever";
import { checkRateLimit } from "@/lib/rate-limit";

const BASE_SYSTEM_PROMPT = `You are a Dev Research Assistant. You help developers research topics, find relevant information, and save their findings.

Use the available tools when they would be helpful:
- Use webSearch to look up information on the web.
- Use saveToNotion to persist research notes when the user asks you to save something.

All research notes are saved to a public Notion page at: https://www.notion.so/NOTES-REPOSITORY-3666e546f81680369426d12325c02872
When the user asks where to find their notes, how to view saved notes, or anything about the Notion page, share this link.

Be concise, technical, and accurate. Cite sources when possible.`;

function extractUserText(messages: ModelMessage[]): string {
  const lastUser = messages.findLast((m) => m.role === "user");
  if (!lastUser) return "";
  if (typeof lastUser.content === "string") return lastUser.content;
  // content is a parts array (UserContent = string | TextPart[])
  if (Array.isArray(lastUser.content)) {
    return lastUser.content
      .filter((p): p is Extract<(typeof lastUser.content)[number], { type: "text" }> => p.type === "text")
      .map((p) => p.text)
      .join(" ");
  }
  return "";
}

function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for may contain a comma-separated list; first entry is the client
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

export async function POST(req: Request) {
  // Rate limit: 20 requests per minute per IP
  const ip = getClientIP(req);
  const { allowed } = await checkRateLimit(ip);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const { messages } = (await req.json()) as { messages: UIMessage[] };

  // Convert UI messages (parts-based) to model messages (content-based)
  const modelMessages = await convertToModelMessages(messages);

  // Retrieve relevant context from the knowledge base
  const userText = extractUserText(modelMessages);
  let context = "";
  if (userText) {
    try {
      context = await retrieve(userText);
    } catch (err) {
      console.error("RAG retrieval failed:", err);
    }
  }

  // Build system prompt with optional context injection
  const systemPrompt = context
    ? `${BASE_SYSTEM_PROMPT}\n\n## Retrieved Context\n\n${context}\n\nUse the retrieved context above to inform your answer when relevant. Cite sources by filename. If the context is not relevant to the question, ignore it.`
    : BASE_SYSTEM_PROMPT;

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}