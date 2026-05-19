import { redis } from "../config/redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export async function checkRateLimit(
  userId: string,
  limit: number = 10,
  windowSeconds: number = 60,
): Promise<RateLimitResult> {
  const key = `rate_limit:jobs:${userId}`;

  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);

  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetIn: ttl,
  };
}
