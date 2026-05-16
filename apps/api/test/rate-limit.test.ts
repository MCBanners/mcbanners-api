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

  it("expired entries are cleaned up when store reaches maxKeys", async () => {
    const app = new Hono();
    // maxKeys=2: fill with 2 IPs, let them expire, then a 3rd IP should be tracked normally
    app.use("*", createRateLimitMiddleware({ windowMs: 1, maxRequests: 10, maxKeys: 2 }));
    app.get("/test", (c) => c.text("ok"));

    await app.request("/test", { headers: { "cf-connecting-ip": "10.1.0.1" } });
    await app.request("/test", { headers: { "cf-connecting-ip": "10.1.0.2" } });
    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 5));
    // 3rd IP: store is at maxKeys but entries are expired, so cleanup makes room
    const res = await app.request("/test", { headers: { "cf-connecting-ip": "10.1.0.3" } });
    expect(res.status).toBe(200);
  });

  it("fails open when store is at maxKeys and no entries can be expired", async () => {
    const app = new Hono();
    app.use("*", createRateLimitMiddleware({ windowMs: 60000, maxRequests: 10, maxKeys: 2 }));
    app.get("/test", (c) => c.text("ok"));

    // Fill store with 2 active IPs
    await app.request("/test", { headers: { "cf-connecting-ip": "10.2.0.1" } });
    await app.request("/test", { headers: { "cf-connecting-ip": "10.2.0.2" } });
    // 3rd IP: at capacity, nothing expired → fail open (allow)
    const res = await app.request("/test", { headers: { "cf-connecting-ip": "10.2.0.3" } });
    expect(res.status).toBe(200);
  });
});
