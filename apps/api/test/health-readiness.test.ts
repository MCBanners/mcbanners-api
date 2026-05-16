import { describe, expect, it } from "bun:test";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import { createApp } from "../src/app";

const adapter = createFixtureAdapter(MC_STATUS_FIXTURES);

describe("health and readiness routes", () => {
  it("returns a simple health response", async () => {
    const app = createApp(adapter, {});

    const res = await app.request("/health");
    const body = (await res.json()) as { service: string; status: string };

    expect(res.status).toBe(200);
    expect(body).toEqual({
      service: "mcbanners-api-next",
      status: "ok"
    });
  });

  it("returns ready when renderer assets pass and saved DB is disabled", async () => {
    const app = createApp(adapter, {}, undefined, undefined, undefined, undefined, undefined, {
      rendererAssets: () => Promise.resolve(),
      savedBannerDb: { enabled: false }
    });

    const res = await app.request("/ready");
    const body = (await res.json()) as {
      status: string;
      checks: {
        rendererAssets: { status: string };
        savedBannerDb: { status: string };
      };
    };

    expect(res.status).toBe(200);
    expect(body.status).toBe("ready");
    expect(body.checks.rendererAssets.status).toBe("ok");
    expect(body.checks.savedBannerDb.status).toBe("disabled");
  });

  it("returns 503 when configured saved DB readiness fails", async () => {
    const app = createApp(adapter, {}, undefined, undefined, undefined, undefined, undefined, {
      rendererAssets: () => Promise.resolve(),
      savedBannerDb: {
        enabled: true,
        check: () =>
          Promise.reject(new Error("DATABASE_URL=mysql://user:super-secret@example.test/mcbanners"))
      }
    });

    const res = await app.request("/ready");
    const text = await res.text();
    const body = JSON.parse(text) as {
      status: string;
      checks: {
        rendererAssets: { status: string };
        savedBannerDb: { status: string };
      };
    };

    expect(res.status).toBe(503);
    expect(body.status).toBe("not-ready");
    expect(body.checks.rendererAssets.status).toBe("ok");
    expect(body.checks.savedBannerDb.status).toBe("unavailable");
    expect(text).not.toContain("super-secret");
    expect(text).not.toContain("DATABASE_URL");
  });

  it("returns 503 when renderer assets are unavailable", async () => {
    const app = createApp(adapter, {}, undefined, undefined, undefined, undefined, undefined, {
      rendererAssets: () => Promise.reject(new Error("asset failure")),
      savedBannerDb: { enabled: false }
    });

    const res = await app.request("/ready");
    const body = (await res.json()) as {
      checks: {
        rendererAssets: { status: string };
        savedBannerDb: { status: string };
      };
    };

    expect(res.status).toBe(503);
    expect(body.checks.rendererAssets.status).toBe("unavailable");
    expect(body.checks.savedBannerDb.status).toBe("disabled");
  });
});
