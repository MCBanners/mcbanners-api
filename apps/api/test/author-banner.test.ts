import { beforeAll, describe, expect, it } from "bun:test";

import { MemoryCache } from "@mcbanners/cache";
import type { AuthorBannerData } from "@mcbanners/banner-renderer";
import { registerRendererFonts } from "@mcbanners/banner-renderer";
import type { AuthorClient } from "@mcbanners/external-clients";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import { createApp } from "../src/app";
import { buildAuthorBannerCacheKey, type AuthorClients } from "../src/routes/author-banner";

beforeAll(() => {
  registerRendererFonts();
});

const FIXTURE_AUTHOR: AuthorBannerData = {
  author: {
    name: "md_5",
    resourceCount: 42,
    logoBase64: null,
    downloadCount: 1_250_000,
    likes: null,
    reviews: 320
  },
  backend: "SPIGOT"
};

class FixtureAuthorClient implements AuthorClient {
  calls: string[] = [];

  constructor(private readonly data: AuthorBannerData | null = FIXTURE_AUTHOR) {}

  getAuthorBannerData(id: string): Promise<AuthorBannerData | null> {
    this.calls.push(id);
    return Promise.resolve(this.data);
  }
}

const makeApp = (authorClients: AuthorClients, caches = {}) =>
  createApp(createFixtureAdapter(MC_STATUS_FIXTURES), {}, caches, undefined, authorClients);

describe("GET /banner/author/:platform/:id/isValid", () => {
  it("returns true when an author client returns data", async () => {
    const res = await makeApp({ SPIGOT: new FixtureAuthorClient() }).request(
      "/banner/author/spigot/123/isValid"
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ valid: true });
  });

  it("returns false for missing authors and unknown platforms", async () => {
    const app = makeApp({ SPIGOT: new FixtureAuthorClient(null) });
    const missing = await app.request("/banner/author/spigot/123/isValid");
    const unknown = await app.request("/banner/author/unknown/123/isValid");

    expect(await missing.json()).toEqual({ valid: false });
    expect(await unknown.json()).toEqual({ valid: false });
  });
});

describe("GET /banner/author/:platform/:id/banner", () => {
  it("renders PNG and JPG author banners", async () => {
    const app = makeApp({ SPIGOT: new FixtureAuthorClient() });
    const png = await app.request("/banner/author/spigot/123/banner.png");
    const jpg = await app.request("/banner/author/spigot/123/banner.jpg");

    expect(png.status).toBe(200);
    expect(png.headers.get("Content-Type")).toBe("image/png");
    expect((await png.arrayBuffer()).byteLength).toBeGreaterThan(0);
    expect(jpg.status).toBe(200);
    expect(jpg.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns 404 for unknown platform or missing author", async () => {
    const app = makeApp({ SPIGOT: new FixtureAuthorClient(null) });
    const missing = await app.request("/banner/author/spigot/123/banner.png");
    const unknown = await app.request("/banner/author/unknown/123/banner.png");

    expect(missing.status).toBe(404);
    expect(unknown.status).toBe(404);
  });

  it("returns 400 for unsupported output filename", async () => {
    const res = await makeApp({ SPIGOT: new FixtureAuthorClient() }).request(
      "/banner/author/spigot/123/banner.webp"
    );

    expect(res.status).toBe(400);
  });

  it("normalizes platform casing and author id before client lookup", async () => {
    const client = new FixtureAuthorClient();
    const res = await makeApp({ MODRINTH: client }).request(
      "/banner/author/MoDrInTh/SomeUser/banner.png"
    );

    expect(res.status).toBe(200);
    expect(client.calls).toEqual(["someuser"]);
  });

  it("normalizes query order in the rendered author banner cache key", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000, maxEntries: 50 });
    const app = makeApp({ SPIGOT: new FixtureAuthorClient() }, { authorBannerImage: cache });
    const first = await app.request(
      "/banner/author/spigot/123/banner.png?downloads__display=DL&author_name__display=A"
    );
    const second = await app.request(
      "/banner/author/spigot/123/banner.png?author_name__display=A&downloads__display=DL"
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(cache.stats().hits).toBeGreaterThan(0);
  });

  it("uses display override settings in render output", async () => {
    const app = makeApp({ SPIGOT: new FixtureAuthorClient() });
    const base = await app.request("/banner/author/spigot/123/banner.png");
    const custom = await app.request(
      "/banner/author/spigot/123/banner.png?author_name__display=Override"
    );

    expect(
      Buffer.from(await base.arrayBuffer()).equals(Buffer.from(await custom.arrayBuffer()))
    ).toBe(false);
  });

  it("exposes stable cache key helper", () => {
    expect(
      buildAuthorBannerCacheKey("SPIGOT", "123", "PNG", {
        b: "2",
        a: "1"
      })
    ).toBe("banner:author:spigot:123:png:a=1&b=2");
  });
});
