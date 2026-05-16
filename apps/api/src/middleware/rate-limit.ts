import type { MiddlewareHandler } from "hono";

export interface RateLimitOptions {
  readonly windowMs: number;
  readonly maxRequests: number;
  /** Max IPs tracked in the store before expired entries are swept. Default 10 000. */
  readonly maxKeys?: number;
}

export const createRateLimitMiddleware = (opts: RateLimitOptions): MiddlewareHandler => {
  const store = new Map<string, { count: number; resetAt: number }>();
  const maxKeys = opts.maxKeys ?? 10_000;

  return async (c, next) => {
    const ip =
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const now = Date.now();
    const entry = store.get(ip);

    if (entry === undefined || now >= entry.resetAt) {
      // Before adding a new key, sweep expired entries if at capacity.
      if (!store.has(ip) && store.size >= maxKeys) {
        for (const [k, v] of store) {
          if (now >= v.resetAt) store.delete(k);
        }
        // If still at capacity after cleanup, fail open (allow without counting).
        if (store.size >= maxKeys) {
          await next();
          return;
        }
      }
      store.set(ip, { count: 1, resetAt: now + opts.windowMs });
    } else {
      entry.count++;
    }

    const current = store.get(ip)!;
    if (current.count > opts.maxRequests) {
      const retryAfterSecs = Math.ceil((current.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfterSecs));
      return c.json({ error: "Too Many Requests" }, 429);
    }

    await next();
  };
};
