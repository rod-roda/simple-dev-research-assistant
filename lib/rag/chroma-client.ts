import { ChromaClient } from "chromadb";

const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
const parsed = new URL(chromaUrl);

export const chromaClient = new ChromaClient({
  host: parsed.hostname,
  port: parseInt(parsed.port, 10) || 8000,
  ssl: parsed.protocol === "https:",
});

export const COLLECTION_NAME =
  process.env.CHROMA_COLLECTION_NAME || "dev-research-kb";