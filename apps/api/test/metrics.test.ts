import { describe, it, expect } from "bun:test";
import { createApp } from "../src/app";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";

const adapter = createFixtureAdapter(MC_STATUS_FIXTURES);

describe("metrics endpoint", () => {
  it("returns 404 when metrics not configured", async () => {
    const app = createApp(adapter, {});
    const res = await app.request("/metrics");
    expect(res.status).toBe(404);
  });

  it("returns metrics JSON when configured", async () => {
    const app = createApp(
      adapter,
      {},
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        getSnapshot: () => ({ uptimeSeconds: 42 })
      }
    );
    const res = await app.request("/metrics");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { uptimeSeconds: number };
    expect(body.uptimeSeconds).toBe(42);
  });

  it("does not expose secrets in metrics snapshot", async () => {
    const app = createApp(
      adapter,
      {},
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        getSnapshot: () => ({ uptimeSeconds: 1 })
      }
    );
    const res = await app.request("/metrics");
    const text = await res.text();
    expect(text).not.toContain("password");
    expect(text).not.toContain("DATABASE_URL");
    expect(text).not.toContain("API_KEY");
  });
});
