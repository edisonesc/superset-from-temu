import Redis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error(
    "REDIS_URL environment variable is missing. " +
      "Set it to a valid Redis URL, e.g. redis://localhost:6379"
  );
}

/**
 * Singleton ioredis client.
 * Shared across the process to avoid opening a new connection per request.
 */
const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on("error", (err) => {
  // Log but don't crash — cache misses are non-fatal.
  console.error("[redis] connection error:", err.message);
});

/**
 * Typed cache helper built on top of the singleton ioredis client.
 *
 * @example
 * import { cache } from "@/lib/redis";
 * await cache.set("key", { foo: "bar" }, 300);
 * const value = await cache.get<{ foo: string }>("key");
 * await cache.del("key");
 */
export const cache = {
  /**
   * Retrieve a cached value and JSON-parse it.
   * Returns `null` on cache miss or parse failure.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  /**
   * Serialize `value` to JSON and store it with an optional TTL.
   * @param key   Cache key
   * @param value Any JSON-serialisable value
   * @param ttlSeconds  Expiry in seconds (default: no expiry)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialised = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.set(key, serialised, "EX", ttlSeconds);
    } else {
      await redis.set(key, serialised);
    }
  },

  /**
   * Delete a key from the cache.
   */
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  /**
   * Delete all keys matching a glob-style pattern (e.g. "chart:abc123:*").
   * Uses SCAN to avoid blocking the Redis event loop.
   */
  async delPattern(pattern: string): Promise<void> {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== "0");
  },
};

export default redis;
