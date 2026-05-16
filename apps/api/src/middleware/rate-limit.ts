import type { MiddlewareHandler } from "hono";

export interface RateLimitOptions {
  readonly windowMs: number;
  readonly maxRequests: number;
}

export const createRateLimitMiddleware = (opts: RateLimitOptions): MiddlewareHandler => {
  const store = new Map<string, { count: number; resetAt: number }>();

  return async (c, next) => {
    const ip =
      c.req.header("cf-connecting-ip") ??
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";

    const now = Date.now();
    const entry = store.get(ip);

    if (entry === undefined || now >= entry.resetAt) {
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
