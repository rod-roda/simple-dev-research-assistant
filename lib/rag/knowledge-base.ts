import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { chromaClient, COLLECTION_NAME } from "./chroma-client";
import { embed } from "./embeddings";
import { embedMany } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import 'dotenv/config';

const openai = createOpenAI();

/**
 * Rough heuristic: ~4 characters per token. Split text into chunks of
 * approximately CHUNK_TARGET_TOKENS tokens by splitting on paragraph breaks.
 */
const CHUNK_TARGET_TOKENS = 500;
const CHARS_PER_TOKEN = 4;
const CHUNK_CHAR_TARGET = CHUNK_TARGET_TOKENS * CHARS_PER_TOKEN;

interface Chunk {
  text: string;
  filename: string;
}

/**
 * Split a markdown document into chunks of roughly CHUNK_TARGET_TOKENS
 * by accumulating paragraphs until the target size is exceeded.
 */
function chunkMarkdown(text: string, filename: string): Chunk[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: Chunk[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (
      current.length + paragraph.length > CHUNK_CHAR_TARGET &&
      current.length > 0
    ) {
      chunks.push({ text: current.trim(), filename });
      current = paragraph;
    } else {
      current += "\n\n" + paragraph;
    }
  }

  if (current.trim()) {
    chunks.push({ text: current.trim(), filename });
  }

  return chunks;
}

/**
 * One-time ingestion: reads .md files from data/knowledge/, chunks them,
 * generates embeddings, and upserts them into the ChromaDB collection.
 */
async function ingest(): Promise<void> {
  const knowledgeDir = join(process.cwd(), "data", "knowledge");

  let files: string[];
  try {
    files = readdirSync(knowledgeDir).filter((f) => f.endsWith(".md"));
  } catch {
    console.error(`Knowledge directory not found: ${knowledgeDir}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("No .md files found in data/knowledge/. Nothing to ingest.");
    return;
  }

  console.log(`Found ${files.length} .md file(s) to ingest.`);

  // Read and chunk all files
  const allChunks: Chunk[] = [];
  for (const file of files) {
    const content = readFileSync(join(knowledgeDir, file), "utf-8");
    const chunks = chunkMarkdown(content, file);
    allChunks.push(...chunks);
    console.log(`  ${file}: ${chunks.length} chunk(s)`);
  }

  console.log(`Total chunks: ${allChunks.length}`);

  // Generate embeddings in batch using embedMany
  const { embeddings } = await embedMany({
    model: openai.embeddingModel("text-embedding-3-small"),
    values: allChunks.map((c) => c.text),
  });

  // Get or create the collection
  const collection = await chromaClient.getOrCreateCollection({
    name: COLLECTION_NAME,
  });

  // Upsert chunks into the collection
  const ids = allChunks.map((_, i) => `chunk-${i}`);
  const metadatas = allChunks.map((c) => ({ filename: c.filename }));
  const documents = allChunks.map((c) => c.text);

  await collection.upsert({
    ids,
    embeddings: embeddings.map((e) => Array.from(e)),
    metadatas,
    documents,
  });

  console.log(
    `Successfully upserted ${allChunks.length} chunks into "${COLLECTION_NAME}".`
  );
}

ingest().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});