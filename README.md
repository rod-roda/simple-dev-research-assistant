# Dev Research Assistant

An applied study project exploring **AI Frameworks, Streams, Tool Calling, and RAG** — built as a full-stack chat application that demonstrates how modern AI SDKs, vector search, background job queues, and real-time streaming come together in a production-style Next.js app.

> **Not a production app** — this is a learning playground for experimenting with AI-powered features and patterns.

---

## What It Demonstrates

### 🤖 AI SDK & Streaming (Vercel AI SDK v6)

- **`streamText()`** with Anthropic Claude for server-side streaming responses
- **`useChat()`** React hook for client-side real-time message streaming
- **`convertToModelMessages()`** for transforming UI message formats to model-compatible ones
- **`stepCountIs()` stop condition** for multi-step tool-call loops (up to 5 steps)

### 🔧 Tool Calling

The assistant has three tools defined via the AI SDK `tool()` helper with Zod schemas:

| Tool | Purpose |
|------|---------|
| **`webSearch`** | Searches the web via Tavily API — returns top 5 results with titles, URLs, and snippets |
| **`saveToNotion`** | Persists research notes to a Notion page — converts Markdown to Notion block format |
| **`sendDigest`** | Queues a background email digest via BullMQ + Resend — returns immediately, delivers asynchronously |

Tool call states (streaming, completed, errored) are rendered inline in the chat UI with visual indicators.

### 📚 RAG (Retrieval-Augmented Generation)

A full RAG pipeline built from scratch:

- **Ingestion** (`lib/rag/knowledge-base.ts`): Reads `.md` files from `data/knowledge/`, splits them into ~500-token chunks by paragraph boundaries, and batch-embeds them using `embedMany()` with OpenAI's `text-embedding-3-small`
- **Storage**: Chunks + embeddings are upserted into a **ChromaDB** collection with filename metadata
- **Retrieval** (`lib/rag/retriever.ts`): On each user message, the query is embedded and ChromaDB's similarity search returns the top-5 most relevant chunks, injected into the system prompt under a "Retrieved Context" section
- **Caching**: A Redis cache-aside layer (`rag:<query>`) with 1-hour TTL avoids redundant embedding + search calls

Knowledge base documents cover: AI SDK, ChromaDB, RAG fundamentals, Tool Calling, and Next.js App Router.

### 🔄 Background Jobs (BullMQ)

- **`digestQueue`**: A BullMQ queue backed by Redis for asynchronous email delivery
- **`digestWorker`**: Processes jobs by sending HTML emails via **Resend**
- Job types defined in `lib/queue/jobs/digest.ts`

### 🛡️ Rate Limiting

Fixed-window rate limiter using Redis counters (`rl:<ip>`) — 20 requests/minute per IP. Falls back to allowing requests if Redis is unavailable.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| AI SDK | Vercel AI SDK v6 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`) |
| LLM | Anthropic Claude Sonnet 4 |
| Embeddings | OpenAI `text-embedding-3-small` |
| Vector DB | ChromaDB |
| Cache / Rate Limit | Redis (ioredis) |
| Job Queue | BullMQ |
| Email | Resend |
| Web Search | Tavily |
| Notes Integration | Notion API |
| Validation | Zod v4 |
| UI Styling | Tailwind CSS v4 |
| Markdown Rendering | react-markdown + remark-gfm + rehype-highlight |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Browser (React)                 │
│  useChat() ←→ /api/chat (streaming SSE)         │
└──────────────────────┬──────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │      Next.js API Route      │
        │  streamText() + tools + RAG  │
        └──┬──────┬──────┬───────────┘
           │      │      │
     ┌─────▼──┐ ┌▼─────┐ │  ┌─────────────────┐
     │Tavily  │ │Notion│ │  │  Redis          │
     │Search  │ │ API  │ │  │ - RAG cache     │
     └────────┘ └──────┘ │  │ - Rate limiting  │
                         │  └─────────────────┘
              ┌──────────▼──────────┐
              │     BullMQ Queue     │
              │  (digest jobs)      │──→ Resend (email)
              └─────────────────────┘

   ┌─────────────────────────────────┐
   │        ChromaDB                  │
   │  (knowledge-base vectors)       │
   │  Ingested from data/knowledge/   │
   └─────────────────────────────────┘
```

---

## Project Structure

```
app/
  page.tsx                  # Main chat UI (useChat hook)
  layout.tsx                # Root layout with metadata
  globals.css               # Tailwind styles
  api/chat/route.ts         # Streaming API route (RAG + tools)
components/chat/
  InputBar.tsx              # Auto-growing textarea + send/stop
  MessageList.tsx            # Scrollable message list with auto-scroll
  MessageBubble.tsx          # Markdown + tool-call state rendering
lib/
  tools/
    definitions.ts           # Tool registry export
    web-search.ts            # Tavily web search tool
    save-to-notion.ts        # Notion page creation tool
    send-digest.ts           # BullMQ email digest tool
  rag/
    chroma-client.ts         # ChromaDB client config
    embeddings.ts            # OpenAI embedding helper (embed)
    retriever.ts             # RAG retrieval with Redis caching
    knowledge-base.ts        # Ingestion script (markdown → vectors)
    redis-client.ts          # ioredis client
  queue/
    client.ts                # BullMQ Queue + Redis connection
    digest-worker.ts         # Worker: processes digest jobs via Resend
    jobs/digest.ts           # DigestJobData type
  rate-limit.ts              # Redis fixed-window rate limiter
data/knowledge/              # Source .md files for the RAG knowledge base
docker-compose.yml           # ChromaDB + Redis for local development
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for ChromaDB and Redis)
- API keys: Anthropic, OpenAI, Tavily, Notion, Resend

### 1. Start infrastructure

```bash
docker compose up -d    # Starts ChromaDB (port 8000) and Redis (port 6379)
```

### 2. Configure environment

Copy `.env.example` to `.env` (or create one) and fill in your keys:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
NOTION_API_KEY=ntn_...
NOTION_PARENT_PAGE_ID=...
RESEND_API_KEY=re_...
RESEND_FROM=you@yourdomain.com
CHROMA_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
```

### 3. Ingest knowledge base

```bash
npx tsx lib/rag/knowledge-base.ts
```

This reads `data/knowledge/*.md`, chunks them, generates embeddings, and upserts into ChromaDB.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start chatting.

### 5. (Optional) Start the digest worker

```bash
npx tsx lib/queue/digest-worker.ts
```

This processes email digest jobs from the BullMQ queue.

---

## Key Patterns & Learnings

- **Streaming-first**: The entire response flows through SSE. Tool calls are interleaved in the stream and rendered incrementally in the UI.
- **RAG context injection**: Retrieved chunks are appended to the system prompt rather than passed as separate tool results — keeping the prompt construction simple and deterministic.
- **Cache-aside over caching-everything**: Redis caches RAG results but is never a hard dependency. If Redis is down, the system degrades gracefully.
- **Background jobs for side effects**: Email delivery is offloaded to BullMQ so the LLM response streams back immediately without waiting for the email API.
- **Tool-call UX**: The chat UI shows real-time tool call states (spinner while running, checkmark on success, error banner on failure) — making the agent's actions transparent.
- **Rate limiting as a safety net**: Fixed-window per-IP limiting prevents abuse while remaining functional when Redis is unavailable.

---

## License

MIT