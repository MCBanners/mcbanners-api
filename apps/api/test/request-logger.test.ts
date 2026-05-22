import { describe, expect, it } from "bun:test";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import { createApp } from "../src/app";

const adapter = createFixtureAdapter(MC_STATUS_FIXTURES);

describe("request logger middleware", () => {
  it("generates X-Request-ID when none provided", async () => {
    const app = createApp(adapter, {});
    const res = await app.request("/health");
    const requestId = res.headers.get("x-request-id");
    expect(requestId).toBeTruthy();
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("passes through provided X-Request-ID", async () => {
    const app = createApp(adapter, {});
    const res = await app.request("/health", {
      headers: { "x-request-id": "my-custom-id-123" }
    });
    expect(res.headers.get("x-request-id")).toBe("my-custom-id-123");
  });

  it("sets X-Request-ID on non-200 responses", async () => {
    const app = createApp(adapter, {});
    const res = await app.request("/not-found-route-that-does-not-exist");
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });

  it("rejects X-Request-ID longer than 128 characters and generates a UUID", async () => {
    const app = createApp(adapter, {});
    const oversized = "a".repeat(129);
    const res = await app.request("/health", { headers: { "x-request-id": oversized } });
    const returned = res.headers.get("x-request-id");
    expect(returned).not.toBe(oversized);
    expect(returned).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects X-Request-ID containing control characters and generates a UUID", async () => {
    const app = createApp(adapter, {});
    const withControl = "valid-prefix\x01bad";
    const res = await app.request("/health", { headers: { "x-request-id": withControl } });
    const returned = res.headers.get("x-request-id");
    expect(returned).not.toBe(withControl);
    expect(returned).toMatch(/^[0-9a-f-]{36}$/);
  });
});
