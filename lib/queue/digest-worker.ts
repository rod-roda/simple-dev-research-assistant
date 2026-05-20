import { Worker } from "bullmq";
import { Resend } from "resend";
import { redisConnection } from "@/lib/queue/client";
import type { DigestJobData } from "./jobs/digest";
import "dotenv/config";

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is not configured");
}
const resend = new Resend(resendApiKey);

export const digestWorker = new Worker<DigestJobData>(
  "digest",
  async (job) => {
    const { email, title, content } = job.data;

    const from = process.env.RESEND_FROM;
    if (!from) {
      throw new Error("RESEND_FROM is not configured");
    }

    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: title,
      html: content,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    console.log(`[${Date.now()}] - Digest sent to ${email}: "${title}"`);
  },
  { connection: redisConnection }
);

digestWorker.on("failed", (job, err) => {
  console.error(`Digest job ${job?.id} failed:`, err.message);
});