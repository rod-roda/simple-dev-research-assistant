# Tool Calling in LLMs

## How Tool Calling Works

Tool calling extends an LLM's capabilities beyond text generation. The model receives a list of available tools with names, descriptions, and input schemas. When the model determines it needs to call a tool, it emits a structured JSON tool call instead of (or alongside) a text response. The application executes the tool, then feeds the result back to the model as a tool result message. The model then continues generation.

The flow: user → model (decides to call tool) → application (executes tool) → model (uses tool result) → final response.

## Agentic Loop and maxSteps

The agentic loop is the cycle of model → tool call → tool result → model that repeats until the model produces a final text response with no more tool calls. In the Vercel AI SDK, `maxSteps` controls the maximum number of loop iterations. Without `maxSteps`, tool calls stop after one round (the model produces one tool call, you handle it, but don't continue).

Set `maxSteps: 5` (or higher) to allow multi-step reasoning where the model calls several tools in sequence. Each step can call one or more tools. The loop terminates when the model outputs no tool calls or hits the step limit.

```ts
const result = await generateText({
  model: anthropic("claude-sonnet-4-20250514"),
  tools: { webSearch, saveToNotion },
  maxSteps: 5,
  prompt: "Research X and save notes to Notion",
});
```

## Parallel vs Sequential Tool Calls

Some models support parallel tool calls — emitting multiple tool calls in a single response to execute simultaneously. The AI SDK handles this: all tool calls in one step are executed in parallel via `Promise.all`, and all results are sent back together in the next round.

Sequential tool calls occur when the model needs the result of one tool before deciding what to call next. The `maxSteps` mechanism handles this — each step is one model invocation, and the model decides whether to call more tools based on prior results.

Force parallel execution by setting `toolChoice: "required"` and providing multiple tools. Force a specific tool with `toolChoice: { type: "tool", toolName: "webSearch" }`.

## Tool Input Validation with Zod

Define tool input schemas using Zod. The AI SDK validates tool call inputs against the schema before executing the `execute` function. If validation fails, the model receives a type error and can retry with corrected inputs.

```ts
const myTool = tool({
  description: "Does something specific",
  inputSchema: z.object({
    query: z.string().describe("Search query"),
    limit: z.number().min(1).max(100).default(10),
  }),
  execute: async ({ query, limit }) => { /* typed */ },
});
```

In AI SDK v6, the parameter is `inputSchema` (not `parameters`). Zod descriptions on fields are passed to the model as parameter descriptions, improving tool call accuracy. The `execute` function receives fully typed and validated input. Tools without `execute` are client-side only and won't run on the server.