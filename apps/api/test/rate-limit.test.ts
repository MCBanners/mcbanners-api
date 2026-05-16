import { describe, it, expect } from "bun:test";
import { createRateLimitMiddleware } from "../src/middleware/rate-limit";
import { Hono } from "hono";

describe("rate limit middleware", () => {
  it("allows requests within limit", async () => {
    const app = new Hono();
    app.use("*", createRateLimitMiddleware({ windowMs: 60000, maxRequests: 5 }));
    app.get("/test", (c) => c.text("ok"));

    const res = await app.request("/test", { headers: { "cf-connecting-ip": "1.2.3.4" } });
    expect(res.status).toBe(200);
  });

  it("returns 429 when limit exceeded", async () => {
    const app = new Hono();
    app.use("*", createRateLimitMiddleware({ windowMs: 60000, maxRequests: 2 }));
    app.get("/test", (c) => c.text("ok"));

    const headers = { "cf-connecting-ip": "10.0.0.99" };
    await app.request("/test", { headers });
    await app.request("/test", { headers });
    const res = await app.request("/test", { headers });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });

  it("returns Retry-After header on 429", async () => {
    const app = new Hono();
    app.use("*", createRateLimitMiddleware({ windowMs: 30000, maxRequests: 1 }));
    app.get("/test", (c) => c.text("ok"));

    const headers = { "cf-connecting-ip": "10.0.1.1" };
    await app.request("/test", { headers });
    const res = await app.request("/test", { headers });
    const retryAfter = Number(res.headers.get("retry-after"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(30);
  });

  it("uses x-forwarded-for when cf-connecting-ip is absent", async () => {
    const app = new Hono();
    app.use("*", createRateLimitMiddleware({ windowMs: 60000, maxRequests: 1 }));
    app.get("/test", (c) => c.text("ok"));

    const headers = { "x-forwarded-for": "192.168.1.50, 10.0.0.1" };
    await app.request("/test", { headers });
    const res = await app.request("/test", { headers });
    expect(res.status).toBe(429);
  });

  it("different IPs have independent limits", async () => {
    const app = new Hono();
    app.use("*", createRateLimitMiddleware({ windowMs: 60000, maxRequests: 1 }));
    app.get("/test", (c) => c.text("ok"));

    await app.request("/test", { headers: { "cf-connecting-ip": "10.0.2.1" } });
    await app.request("/test", { headers: { "cf-connecting-ip": "10.0.2.1" } });

    const res = await app.request("/test", { headers: { "cf-connecting-ip": "10.0.2.2" } });
    expect(res.status).toBe(200);
  });
});
