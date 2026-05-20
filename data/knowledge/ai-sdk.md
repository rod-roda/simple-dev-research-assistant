# Vercel AI SDK

## streamText()

`streamText()` from `ai` streams LLM responses in chunks. Call with `model` (any provider model), `messages`, and optional `tools`. Returns an object with streaming methods: `.toDataStreamResponse()` (for Route Handlers), `.toTextStreamResponse()`, and `.pipeDataStreamToResponse()`.

```ts
import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({ model: anthropic("claude-sonnet-4-20250514"), messages });
  return result.toDataStreamResponse();
}
```

## useChat()

Client-side React hook from `ai/react`. Connects to a streaming Route Handler, manages `messages`, `input`, `handleSubmit`, `isLoading`, `error`, and `append`. Automatically parses tool calls from the stream.

```tsx
const { messages, input, handleInputChange, handleSubmit } = useChat({ api: "/api/chat" });
```

Tool results show up as messages with `role: "tool"`. Use `messages` to render the full conversation including interleaved tool call/result pairs.

## tool() Helper

`tool()` from `ai` defines tools with Zod schemas:

```ts
import { tool } from "ai";
import { z } from "zod";

const searchTool = tool({
  description: "Search the web",
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => { /* ... */ return result; },
});
```

In AI SDK v6, the parameter is `inputSchema` (not `parameters`). Zod v3 and v4 are both supported via `FlexibleSchema`. Tools without `execute` are client-side only. Pass the tools object to `streamText({ tools })`.

## embed() and embedMany()

```ts
import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const { embedding } = await embed({ model: openai.embeddingModel("text-embedding-3-small"), value: text });

const { embeddings } = await embedMany({ model: openai.embeddingModel("text-embedding-3-small"), values: texts });
```

`embed()` returns a single embedding vector. `embedMany()` accepts an array of strings and returns all embeddings in one call, handling batching automatically. Models return `Float32Array` vectors.

## MCP Client

The AI SDK includes an MCP client (`@ai-sdk/mcp`) for connecting to Model Context Protocol servers. Create an MCP client, connect to a transport (stdio or SSE), and pass `mcpClient.tools()` to `streamText()`.

## Model Providers

Install the provider package, import the factory, create model instances:

```ts
import { anthropic } from "@ai-sdk/anthropic";  // package: @ai-sdk/anthropic
import { openai } from "@ai-sdk/openai";         // package: @ai-sdk/openai

const claude = anthropic("claude-sonnet-4-20250514");
const gpt = openai("gpt-4o");

// Embedding model
const embedModel = openai.embeddingModel("text-embedding-3-small");
```

Each provider reads its API key from the standard env var (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.) automatically. Use `createOpenAI()` or `createAnthropic()` for custom base URLs or API keys.