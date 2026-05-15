import { describe, it, expect, beforeAll } from "bun:test";
import { createApp } from "../src/app";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import { registerRendererFonts } from "@mcbanners/banner-renderer";
import type { ResourceBannerData } from "@mcbanners/banner-renderer";
import type { ResourceClients } from "../src/routes/resource-banner";

beforeAll(() => {
  registerRendererFonts();
});

/** Minimal 1×1 pixel transparent PNG as base64 (no data URI prefix). */
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const FIXTURE_SPIGOT_FREE: ResourceBannerData = {
  resource: {
    name: "EssentialsX",
    logoBase64: TINY_PNG_B64,
    downloadCount: 1_250_000,
    lastUpdated: null,
    rating: { count: 4320, average: 4.5 },
    price: null
  },
  author: { name: "md_5" },
  backend: "SPIGOT"
};

const FIXTURE_MODRINTH: ResourceBannerData = {
  resource: {
    name: "Sodium",
    logoBase64: TINY_PNG_B64,
    downloadCount: 3_500_000,
    lastUpdated: "2024-07-01T00:00:00Z",
    rating: { count: 0, average: null },
    price: null
  },
  author: { name: "jellysquid3" },
  backend: "MODRINTH"
};

class FixtureResourceClient {
  constructor(private readonly data: ResourceBannerData | null) {}
  getResourceBannerData(): Promise<ResourceBannerData | null> {
    return Promise.resolve(this.data);
  }
}

const adapter = createFixtureAdapter(MC_STATUS_FIXTURES);

const makeApp = (clients: ResourceClients) => createApp(adapter, clients);

const clients: ResourceClients = {
  SPIGOT: new FixtureResourceClient(FIXTURE_SPIGOT_FREE),
  MODRINTH: new FixtureResourceClient(FIXTURE_MODRINTH)
};

const app = makeApp(clients);

// ---------------------------------------------------------------------------
// isValid endpoint
// ---------------------------------------------------------------------------

describe("GET /banner/resource/:platform/:id/isValid", () => {
  it("returns { valid: true } when client returns data", async () => {
    const res = await app.request("/banner/resource/spigot/12345/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });

  it("returns { valid: false } when client returns null", async () => {
    const nullClients: ResourceClients = { SPIGOT: new FixtureResourceClient(null) };
    const nullApp = makeApp(nullClients);
    const res = await nullApp.request("/banner/resource/spigot/99999/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });

  it("returns { valid: false } for unknown platform", async () => {
    const res = await app.request("/banner/resource/unknown/12345/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PNG / JPG rendering
// ---------------------------------------------------------------------------

describe("GET /banner/resource/:platform/:id/banner.png", () => {
  it("returns 200 PNG for a known spigot resource", async () => {
    const res = await app.request("/banner/resource/spigot/12345/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });

  it("returns 200 PNG for a known modrinth resource", async () => {
    const res = await app.request("/banner/resource/modrinth/some-slug/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("is case-insensitive for platform (SPIGOT → spigot)", async () => {
    const res = await app.request("/banner/resource/SPIGOT/12345/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 404 for unknown platform", async () => {
    const res = await app.request("/banner/resource/unknown/12345/banner.png");
    expect(res.status).toBe(404);
  });

  it("returns 404 when client returns null (resource not found)", async () => {
    const nullClients: ResourceClients = { SPIGOT: new FixtureResourceClient(null) };
    const nullApp = makeApp(nullClients);
    const res = await nullApp.request("/banner/resource/spigot/missing/banner.png");
    expect(res.status).toBe(404);
  });

  it("returns 400 for unsupported file type", async () => {
    const res = await app.request("/banner/resource/spigot/12345/banner.webp");
    expect(res.status).toBe(400);
  });
});

describe("GET /banner/resource/:platform/:id/banner.jpg", () => {
  it("returns 200 JPEG for a known spigot resource", async () => {
    const res = await app.request("/banner/resource/spigot/12345/banner.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xd8);
    expect(buf[2]).toBe(0xff);
  });
});

// ---------------------------------------------------------------------------
// Cache-Control header
// ---------------------------------------------------------------------------

describe("Cache-Control header", () => {
  it("includes cache-control header on successful PNG response", async () => {
    const res = await app.request("/banner/resource/spigot/12345/banner.png");
    expect(res.headers.get("Cache-Control")).toBe(
      "public, max-age=60, stale-while-revalidate=300"
    );
  });
});
