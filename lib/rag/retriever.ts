import { chromaClient, COLLECTION_NAME } from "./chroma-client";
import { embed } from "./embeddings";
import { redis } from "./redis-client";

/**
 * Embed the query and retrieve the top-5 most similar chunks from the
 * ChromaDB knowledge-base collection. Returns a formatted string suitable
 * for injection into a system prompt, or an empty string if nothing is found.
 *
 * Uses a cache-aside pattern with Redis: normalized queries are cached under
 * "rag:{normalized_query}" with a 3600s TTL. Redis failures are swallowed
 * silently so the cache is purely an optimization, never a dependency.
 */
export async function retrieve(query: string): Promise<string> {
  const cacheKey = `rag:${query.trim().toLowerCase()}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return cached;
    }
  } catch {
    // Redis read failed — fall through to the normal flow
  }

  const queryEmbedding = await embed(query);

  const collection = await chromaClient.getOrCreateCollection({
    name: COLLECTION_NAME,
  });

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: 5,
    include: ["documents", "metadatas", "distances"],
  });

  const documents = results.documents[0];
  const metadatas = results.metadatas[0];
  const distances = results.distances[0];

  if (!documents || documents.length === 0) {
    return "";
  }

  const parts = documents.map((doc, i) => {
    const meta = metadatas[i] as Record<string, string> | null;
    const filename = meta?.filename ?? "unknown";
    const distance = distances[i]?.toFixed(4) ?? "?";
    const content = doc ?? "";
    return `### ${filename} (relevance: ${distance})\n${content}`;
  });

  const result = parts.join("\n\n");

  try {
    await redis.set(cacheKey, result, "EX", 3600);
  } catch {
    // Redis write failed — result is still returned below
  }

  return result;
}