import { tool } from "ai";
import { z } from "zod";
import { digestQueue } from "@/lib/queue/client";

export const sendDigest = tool({
  description:
    "Queue a background email digest to be sent to the specified email address. Returns a confirmation immediately without waiting for delivery.",
  inputSchema: z.object({
    email: z.string().describe("Recipient email address"),
    title: z.string().describe("Subject line for the digest email"),
    content: z.string().describe("HTML body of the digest email"),
  }),
  execute: async ({ email, title, content }) => {
    await digestQueue.add("send-digest", { email, title, content });
    return `Digest queued for ${email}: "${title}"`;
  },
});