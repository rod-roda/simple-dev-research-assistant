import { createOpenAI } from "@ai-sdk/openai";
import { embed as aiEmbed } from "ai";

const openai = createOpenAI();

/**
 * Generate an embedding vector for the given text using OpenAI's
 * text-embedding-3-small model via the Vercel AI SDK.
 */
export async function embed(text: string): Promise<number[]> {
  const result = await aiEmbed({
    model: openai.embeddingModel("text-embedding-3-small"),
    value: text,
  });

  return result.embedding;
}