import { redis } from "@/lib/rag/redis-client";

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 20;

/**
 * Fixed-window rate limiter using a fixed-window counter in Redis.
 *
 * For each IP, increments a key `rl:<ip>` with a 60-second TTL.
 * If the count exceeds 20 within the window, returns `{ allowed: false }`.
 *
 * Falls back to `{ allowed: true }` if Redis is unreachable so the
 * application remains functional during Redis outages.
 */
export async function checkRateLimit(
  ip: string
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rl:${ip}`;

  try {
    const count = await redis.incr(key);

    // Set expiry on first request in the window
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }

    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - count);
    const allowed = count <= RATE_LIMIT_MAX_REQUESTS;

    return { allowed, remaining };
  } catch (err) {
    // Redis is down — allow the request through
    console.error("Rate limit check failed, allowing request:", err);
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS };
  }
}