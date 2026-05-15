import { describe, it, expect, beforeAll } from "bun:test";
import { createApp, type AppCaches } from "../src/app";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import { registerRendererFonts } from "@mcbanners/banner-renderer";
import { MemoryCache } from "@mcbanners/cache";
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

const makeApp = (clients: ResourceClients, caches?: AppCaches) =>
  createApp(adapter, clients, caches);

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
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60, stale-while-revalidate=300");
  });

  it("includes cache-control header on isValid response", async () => {
    const res = await app.request("/banner/resource/spigot/12345/isValid");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=30, stale-while-revalidate=60");
  });

  it("does not include cache-control header on 404 (unknown platform)", async () => {
    const res = await app.request("/banner/resource/unknown/12345/banner.png");
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBeNull();
  });

  it("does not include cache-control header on 404 (resource not found)", async () => {
    const nullClients: ResourceClients = { SPIGOT: new FixtureResourceClient(null) };
    const nullApp = makeApp(nullClients);
    const res = await nullApp.request("/banner/resource/spigot/missing/banner.png");
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBeNull();
  });

  it("does not include cache-control header on 400 (bad output type)", async () => {
    const res = await app.request("/banner/resource/spigot/12345/banner.webp");
    expect(res.status).toBe(400);
    expect(res.headers.get("Cache-Control")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Content-Length header
// ---------------------------------------------------------------------------

describe("Content-Length header", () => {
  it("includes Content-Length on successful PNG response", async () => {
    const res = await app.request("/banner/resource/spigot/12345/banner.png");
    expect(res.status).toBe(200);
    const contentLength = res.headers.get("Content-Length");
    expect(contentLength).not.toBeNull();
    expect(Number(contentLength)).toBeGreaterThan(0);
  });

  it("includes Content-Length on successful JPEG response", async () => {
    const res = await app.request("/banner/resource/spigot/12345/banner.jpg");
    expect(res.status).toBe(200);
    const contentLength = res.headers.get("Content-Length");
    expect(contentLength).not.toBeNull();
    expect(Number(contentLength)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Platform case-insensitivity
// ---------------------------------------------------------------------------

describe("platform case-insensitivity", () => {
  it("mixed-case platform (Spigot) renders PNG successfully", async () => {
    const res = await app.request("/banner/resource/Spigot/12345/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("mixed-case platform (SpIgOt) renders PNG successfully", async () => {
    const res = await app.request("/banner/resource/SpIgOt/12345/banner.png");
    expect(res.status).toBe(200);
  });

  it("mixed-case platform (Spigot) isValid returns true", async () => {
    const res = await app.request("/banner/resource/Spigot/12345/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cache key deduplication (with injected MemoryCache)
// ---------------------------------------------------------------------------

describe("cache key deduplication", () => {
  it("query param order does not create separate cache entries", async () => {
    const cache = new MemoryCache({ maxEntries: 100, ttlMs: 60_000 });
    const cachedApp = makeApp(clients, { resourceBannerImage: cache });

    await cachedApp.request("/banner/resource/spigot/12345/banner.png?z=last&a=first");
    const afterFirst = cache.stats();
    expect(afterFirst.sets).toBe(1);
    expect(afterFirst.misses).toBe(1);

    await cachedApp.request("/banner/resource/spigot/12345/banner.png?a=first&z=last");
    const afterSecond = cache.stats();
    expect(afterSecond.hits).toBe(1);
    expect(afterSecond.sets).toBe(1);
  });

  it("id casing does not create separate cache entries", async () => {
    const cache = new MemoryCache({ maxEntries: 100, ttlMs: 60_000 });
    const cachedApp = makeApp(clients, { resourceBannerImage: cache });

    await cachedApp.request("/banner/resource/spigot/SomePlugin/banner.png");
    expect(cache.stats().sets).toBe(1);

    await cachedApp.request("/banner/resource/spigot/someplugin/banner.png");
    expect(cache.stats().hits).toBe(1);
    expect(cache.stats().sets).toBe(1);
  });

  it("different query params produce separate cache entries", async () => {
    const cache = new MemoryCache({ maxEntries: 100, ttlMs: 60_000 });
    const cachedApp = makeApp(clients, { resourceBannerImage: cache });

    await cachedApp.request("/banner/resource/spigot/12345/banner.png");
    await cachedApp.request(
      "/banner/resource/spigot/12345/banner.png?background__template=OCEAN_DUSK"
    );
    expect(cache.stats().sets).toBe(2);
  });

  it("second identical request hits cache (set then hit)", async () => {
    const cache = new MemoryCache({ maxEntries: 100, ttlMs: 60_000 });
    const cachedApp = makeApp(clients, { resourceBannerImage: cache });

    await cachedApp.request("/banner/resource/modrinth/sodium/banner.png");
    expect(cache.stats().sets).toBe(1);
    expect(cache.stats().misses).toBe(1);

    await cachedApp.request("/banner/resource/modrinth/sodium/banner.png");
    expect(cache.stats().hits).toBe(1);
    expect(cache.stats().sets).toBe(1);
  });

  it("byte estimate is set from buffer length (cache accepts large entries)", async () => {
    const cache = new MemoryCache({ maxEntries: 100, ttlMs: 60_000, maxBytes: 10_000_000 });
    const cachedApp = makeApp(clients, { resourceBannerImage: cache });

    // Two identical requests: first sets, second hits — if byte estimate caused
    // an immediate eviction, the second would be a miss instead of a hit.
    await cachedApp.request("/banner/resource/spigot/12345/banner.png");
    await cachedApp.request("/banner/resource/spigot/12345/banner.png");
    expect(cache.stats().hits).toBe(1);
    expect(cache.stats().evictions).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CurseForge platform
// ---------------------------------------------------------------------------

const FIXTURE_CURSEFORGE: ResourceBannerData = {
  resource: {
    name: "JourneyMap",
    logoBase64: TINY_PNG_B64,
    downloadCount: 50_000_000,
    lastUpdated: "2024-06-01T12:00:00Z",
    rating: { count: 0, average: 0 },
    price: null
  },
  author: { name: "techbrew" },
  backend: "CURSEFORGE"
};

const cfClients: ResourceClients = {
  SPIGOT: new FixtureResourceClient(null),
  MODRINTH: new FixtureResourceClient(null),
  CURSEFORGE: new FixtureResourceClient(FIXTURE_CURSEFORGE),
  HANGAR: new FixtureResourceClient(null),
  ORE: new FixtureResourceClient(null)
};

describe("CurseForge resource route", () => {
  const cfApp = makeApp(cfClients);

  it("returns 200 PNG for a known CurseForge resource", async () => {
    const res = await cfApp.request("/banner/resource/curseforge/12345/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 200 JPEG for a known CurseForge resource", async () => {
    const res = await cfApp.request("/banner/resource/curseforge/12345/banner.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns { valid: true } for CurseForge isValid", async () => {
    const res = await cfApp.request("/banner/resource/curseforge/12345/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });

  it("is case-insensitive (CURSEFORGE upper-case)", async () => {
    const res = await cfApp.request("/banner/resource/CURSEFORGE/12345/banner.png");
    expect(res.status).toBe(200);
  });

  it("returns 404 when CurseForge client returns null", async () => {
    const nullCfClients: ResourceClients = { CURSEFORGE: new FixtureResourceClient(null) };
    const res = await makeApp(nullCfClients).request(
      "/banner/resource/curseforge/99999/banner.png"
    );
    expect(res.status).toBe(404);
  });

  it("returns { valid: false } for CurseForge isValid when client returns null", async () => {
    const nullCfClients: ResourceClients = { CURSEFORGE: new FixtureResourceClient(null) };
    const res = await makeApp(nullCfClients).request("/banner/resource/curseforge/99999/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Hangar platform
// ---------------------------------------------------------------------------

const FIXTURE_HANGAR: ResourceBannerData = {
  resource: {
    name: "EternalLight",
    logoBase64: TINY_PNG_B64,
    downloadCount: 8500,
    lastUpdated: "2024-07-15T10:00:00Z",
    rating: { count: 42, average: 0 },
    price: null
  },
  author: { name: "papermc" },
  backend: "HANGAR"
};

const hangarClients: ResourceClients = {
  SPIGOT: new FixtureResourceClient(null),
  MODRINTH: new FixtureResourceClient(null),
  CURSEFORGE: new FixtureResourceClient(null),
  HANGAR: new FixtureResourceClient(FIXTURE_HANGAR),
  ORE: new FixtureResourceClient(null)
};

describe("Hangar resource route", () => {
  const hangarApp = makeApp(hangarClients);

  it("returns 200 PNG for a known Hangar resource", async () => {
    const res = await hangarApp.request("/banner/resource/hangar/papermc/eternal-light/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 200 JPEG for a known Hangar resource", async () => {
    const res = await hangarApp.request("/banner/resource/hangar/papermc/eternal-light/banner.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns { valid: true } for Hangar isValid", async () => {
    const res = await hangarApp.request("/banner/resource/hangar/papermc/eternal-light/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });

  it("is case-insensitive (HANGAR upper-case)", async () => {
    const res = await hangarApp.request("/banner/resource/HANGAR/papermc/eternal-light/banner.png");
    expect(res.status).toBe(200);
  });

  it("returns 404 when Hangar client returns null", async () => {
    const nullHangarClients: ResourceClients = { HANGAR: new FixtureResourceClient(null) };
    const res = await makeApp(nullHangarClients).request(
      "/banner/resource/hangar/unknown/plugin/banner.png"
    );
    expect(res.status).toBe(404);
  });

  it("returns { valid: false } for Hangar isValid when client returns null", async () => {
    const nullHangarClients: ResourceClients = { HANGAR: new FixtureResourceClient(null) };
    const res = await makeApp(nullHangarClients).request(
      "/banner/resource/hangar/unknown/plugin/isValid"
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Ore platform
// ---------------------------------------------------------------------------

const FIXTURE_ORE: ResourceBannerData = {
  resource: {
    name: "MyPlugin",
    logoBase64: TINY_PNG_B64,
    downloadCount: 3200,
    lastUpdated: null,
    rating: { count: 78, average: null },
    price: null
  },
  author: { name: "PluginDev" },
  backend: "ORE"
};

const oreClients: ResourceClients = {
  SPIGOT: new FixtureResourceClient(null),
  MODRINTH: new FixtureResourceClient(null),
  CURSEFORGE: new FixtureResourceClient(null),
  HANGAR: new FixtureResourceClient(null),
  ORE: new FixtureResourceClient(FIXTURE_ORE)
};

describe("Ore resource route", () => {
  const oreApp = makeApp(oreClients);

  it("returns 200 PNG for a known Ore resource", async () => {
    const res = await oreApp.request("/banner/resource/ore/myplugin/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 200 JPEG for a known Ore resource", async () => {
    const res = await oreApp.request("/banner/resource/ore/myplugin/banner.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns { valid: true } for Ore isValid", async () => {
    const res = await oreApp.request("/banner/resource/ore/myplugin/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });

  it("is case-insensitive (ORE upper-case)", async () => {
    const res = await oreApp.request("/banner/resource/ORE/myplugin/banner.png");
    expect(res.status).toBe(200);
  });

  it("returns 404 when Ore client returns null", async () => {
    const nullOreClients: ResourceClients = { ORE: new FixtureResourceClient(null) };
    const res = await makeApp(nullOreClients).request("/banner/resource/ore/unknown/banner.png");
    expect(res.status).toBe(404);
  });

  it("returns { valid: false } for Ore isValid when client returns null", async () => {
    const nullOreClients: ResourceClients = { ORE: new FixtureResourceClient(null) };
    const res = await makeApp(nullOreClients).request("/banner/resource/ore/unknown/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BuiltByBit platform
// ---------------------------------------------------------------------------

const FIXTURE_BUILTBYBIT: ResourceBannerData = {
  resource: {
    name: "BuiltByBitPlugin",
    logoBase64: null,
    downloadCount: 8500,
    lastUpdated: null,
    rating: { count: 200, average: 4.8 },
    price: null
  },
  author: { name: "BBBDev" },
  backend: "BUILTBYBIT"
};

const FIXTURE_BUILTBYBIT_PREMIUM: ResourceBannerData = {
  resource: {
    name: "PremiumBBBPlugin",
    logoBase64: null,
    downloadCount: 350,
    lastUpdated: null,
    rating: { count: 50, average: 4.9 },
    price: { amount: 9.99, currency: "USD" }
  },
  author: { name: "BBBPremDev" },
  backend: "BUILTBYBIT"
};

const bbbClients: ResourceClients = {
  SPIGOT: new FixtureResourceClient(null),
  MODRINTH: new FixtureResourceClient(null),
  CURSEFORGE: new FixtureResourceClient(null),
  HANGAR: new FixtureResourceClient(null),
  ORE: new FixtureResourceClient(null),
  BUILTBYBIT: new FixtureResourceClient(FIXTURE_BUILTBYBIT)
};

describe("BuiltByBit resource route", () => {
  const bbbApp = makeApp(bbbClients);

  it("returns 200 PNG for a known BBB resource", async () => {
    const res = await bbbApp.request("/banner/resource/builtbybit/12345/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 200 JPEG for a known BBB resource", async () => {
    const res = await bbbApp.request("/banner/resource/builtbybit/12345/banner.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns { valid: true } for BBB isValid", async () => {
    const res = await bbbApp.request("/banner/resource/builtbybit/12345/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });

  it("is case-insensitive (BUILTBYBIT upper-case)", async () => {
    const res = await bbbApp.request("/banner/resource/BUILTBYBIT/12345/banner.png");
    expect(res.status).toBe(200);
  });

  it("renders a premium resource banner (with price)", async () => {
    const premApp = makeApp({
      BUILTBYBIT: new FixtureResourceClient(FIXTURE_BUILTBYBIT_PREMIUM)
    });
    const res = await premApp.request("/banner/resource/builtbybit/55555/banner.png");
    expect(res.status).toBe(200);
  });

  it("returns 404 when BBB client returns null", async () => {
    const nullBbbClients: ResourceClients = { BUILTBYBIT: new FixtureResourceClient(null) };
    const res = await makeApp(nullBbbClients).request(
      "/banner/resource/builtbybit/unknown/banner.png"
    );
    expect(res.status).toBe(404);
  });

  it("returns { valid: false } for BBB isValid when client returns null", async () => {
    const nullBbbClients: ResourceClients = { BUILTBYBIT: new FixtureResourceClient(null) };
    const res = await makeApp(nullBbbClients).request(
      "/banner/resource/builtbybit/unknown/isValid"
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Polymart platform
// ---------------------------------------------------------------------------

const FIXTURE_POLYMART_FREE: ResourceBannerData = {
  resource: {
    name: "PolymartPlugin",
    logoBase64: TINY_PNG_B64,
    downloadCount: 12000,
    lastUpdated: null,
    rating: { count: 300, average: 5 },
    price: null
  },
  author: { name: "PolyAuthor" },
  backend: "POLYMART"
};

const FIXTURE_POLYMART_PREMIUM: ResourceBannerData = {
  resource: {
    name: "PolymartPremiumPlugin",
    logoBase64: TINY_PNG_B64,
    downloadCount: 7500,
    lastUpdated: null,
    rating: { count: 120, average: 4 },
    price: { amount: 4.99, currency: "USD" }
  },
  author: { name: "PolyPremAuthor" },
  backend: "POLYMART"
};

const polymartClients: ResourceClients = {
  SPIGOT: new FixtureResourceClient(null),
  MODRINTH: new FixtureResourceClient(null),
  CURSEFORGE: new FixtureResourceClient(null),
  HANGAR: new FixtureResourceClient(null),
  ORE: new FixtureResourceClient(null),
  BUILTBYBIT: new FixtureResourceClient(null),
  POLYMART: new FixtureResourceClient(FIXTURE_POLYMART_FREE)
};

describe("Polymart resource route", () => {
  const polymartApp = makeApp(polymartClients);

  it("returns 200 PNG for a known Polymart resource", async () => {
    const res = await polymartApp.request("/banner/resource/polymart/123/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 200 JPEG for a known Polymart resource", async () => {
    const res = await polymartApp.request("/banner/resource/polymart/123/banner.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns { valid: true } for Polymart isValid", async () => {
    const res = await polymartApp.request("/banner/resource/polymart/123/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });

  it("is case-insensitive (POLYMART upper-case)", async () => {
    const res = await polymartApp.request("/banner/resource/POLYMART/123/banner.png");
    expect(res.status).toBe(200);
  });

  it("renders a premium Polymart resource banner (with price)", async () => {
    const premApp = makeApp({
      POLYMART: new FixtureResourceClient(FIXTURE_POLYMART_PREMIUM)
    });
    const res = await premApp.request("/banner/resource/polymart/123/banner.png");
    expect(res.status).toBe(200);
  });

  it("returns 404 when Polymart client returns null", async () => {
    const nullPolyClients: ResourceClients = { POLYMART: new FixtureResourceClient(null) };
    const res = await makeApp(nullPolyClients).request(
      "/banner/resource/polymart/unknown/banner.png"
    );
    expect(res.status).toBe(404);
  });

  it("returns { valid: false } for Polymart isValid when client returns null", async () => {
    const nullPolyClients: ResourceClients = { POLYMART: new FixtureResourceClient(null) };
    const res = await makeApp(nullPolyClients).request("/banner/resource/polymart/unknown/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Route edge cases — wildcard parser integration
// ---------------------------------------------------------------------------

describe("route edge cases", () => {
  it("returns 404 when action segment is missing (/spigot/123 with no banner.png)", async () => {
    // No action — the wildcard yields only one segment, cannot split id+action
    const res = await app.request("/banner/resource/spigot/123");
    expect(res.status).toBe(404);
  });

  it("returns 400 for unknown action (banner.webp)", async () => {
    const res = await app.request("/banner/resource/spigot/12345/banner.webp");
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown platform with banner.png", async () => {
    const res = await app.request("/banner/resource/unknown/12345/banner.png");
    expect(res.status).toBe(404);
  });

  it("returns { valid: false } for unknown platform with isValid", async () => {
    const res = await app.request("/banner/resource/unknown/12345/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });

  it("spigot with slash in id routes to client with slash id (client returns null → 404)", async () => {
    // /banner/resource/spigot/a/b/banner.png parses as id="a/b", action="banner.png".
    // The spigot fixture returns data for any id, so the render succeeds here.
    const res = await app.request("/banner/resource/spigot/a/b/banner.png");
    // The fixture client ignores the id and always returns FIXTURE_SPIGOT_FREE
    expect(res.status).toBe(200);
  });

  it("spigot with slash in id — isValid returns true (fixture always returns data)", async () => {
    const res = await app.request("/banner/resource/spigot/a/b/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });

  it("hangar too-many-slashes passes multi-segment id to client (client returns data)", async () => {
    const hangarClientsLocal: ResourceClients = {
      HANGAR: new FixtureResourceClient({
        resource: {
          name: "TooManySlashes",
          logoBase64: null,
          downloadCount: 0,
          lastUpdated: null,
          rating: { count: 0, average: 0 },
          price: null
        },
        author: { name: "author" },
        backend: "HANGAR"
      })
    };
    const res = await makeApp(hangarClientsLocal).request(
      "/banner/resource/hangar/too/many/slashes/banner.png"
    );
    // The fixture client ignores the id and returns data → 200
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Cache key safety — Hangar slash ids
// ---------------------------------------------------------------------------

describe("cache key safety for slash-containing ids", () => {
  it("hangar author/slug id is cached and retrieved on second request", async () => {
    const hangarClientsLocal: ResourceClients = {
      HANGAR: new FixtureResourceClient({
        resource: {
          name: "EternalLight",
          logoBase64: TINY_PNG_B64,
          downloadCount: 1000,
          lastUpdated: null,
          rating: { count: 5, average: 0 },
          price: null
        },
        author: { name: "papermc" },
        backend: "HANGAR"
      })
    };
    const cache = new MemoryCache({ maxEntries: 100, ttlMs: 60_000 });
    const cachedApp = makeApp(hangarClientsLocal, { resourceBannerImage: cache });

    await cachedApp.request("/banner/resource/hangar/papermc/eternal-light/banner.png");
    expect(cache.stats().sets).toBe(1);
    expect(cache.stats().misses).toBe(1);

    await cachedApp.request("/banner/resource/hangar/papermc/eternal-light/banner.png");
    expect(cache.stats().hits).toBe(1);
    expect(cache.stats().sets).toBe(1);
  });

  it("different Hangar ids produce different cache entries", async () => {
    const hangarClientsLocal: ResourceClients = {
      HANGAR: new FixtureResourceClient({
        resource: {
          name: "Plugin",
          logoBase64: null,
          downloadCount: 0,
          lastUpdated: null,
          rating: { count: 0, average: 0 },
          price: null
        },
        author: { name: "org" },
        backend: "HANGAR"
      })
    };
    const cache = new MemoryCache({ maxEntries: 100, ttlMs: 60_000 });
    const cachedApp = makeApp(hangarClientsLocal, { resourceBannerImage: cache });

    await cachedApp.request("/banner/resource/hangar/org/plugin-a/banner.png");
    await cachedApp.request("/banner/resource/hangar/org/plugin-b/banner.png");
    expect(cache.stats().sets).toBe(2);
    expect(cache.stats().hits).toBe(0);
  });

  it("Hangar id casing is normalized in cache key", async () => {
    const hangarClientsLocal: ResourceClients = {
      HANGAR: new FixtureResourceClient({
        resource: {
          name: "Plugin",
          logoBase64: null,
          downloadCount: 0,
          lastUpdated: null,
          rating: { count: 0, average: 0 },
          price: null
        },
        author: { name: "org" },
        backend: "HANGAR"
      })
    };
    const cache = new MemoryCache({ maxEntries: 100, ttlMs: 60_000 });
    const cachedApp = makeApp(hangarClientsLocal, { resourceBannerImage: cache });

    await cachedApp.request("/banner/resource/hangar/Org/Plugin-A/banner.png");
    expect(cache.stats().sets).toBe(1);

    // Same id, different casing → should hit the cache
    await cachedApp.request("/banner/resource/hangar/org/plugin-a/banner.png");
    expect(cache.stats().hits).toBe(1);
    expect(cache.stats().sets).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Output format casing (banner.PNG, banner.JPG)
// ---------------------------------------------------------------------------

describe("output format casing", () => {
  it("banner.PNG (uppercase) returns 200 PNG", async () => {
    const res = await app.request("/banner/resource/spigot/12345/banner.PNG");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("banner.JPG (uppercase) returns 200 JPEG", async () => {
    const res = await app.request("/banner/resource/spigot/12345/banner.JPG");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("banner.Png (mixed case) returns 200 PNG", async () => {
    const res = await app.request("/banner/resource/spigot/12345/banner.Png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });
});

// ---------------------------------------------------------------------------
// Display name override
// ---------------------------------------------------------------------------

describe("display name override", () => {
  it("resource_name__display override changes rendered output vs no override", async () => {
    const resDefault = await app.request("/banner/resource/spigot/12345/banner.png");
    const resOverride = await app.request(
      "/banner/resource/spigot/12345/banner.png?resource_name__display=CustomOverrideName"
    );
    expect(resDefault.status).toBe(200);
    expect(resOverride.status).toBe(200);

    const bufDefault = Buffer.from(await resDefault.arrayBuffer());
    const bufOverride = Buffer.from(await resOverride.arrayBuffer());
    // Different text content → different rendered bytes
    expect(bufDefault.equals(bufOverride)).toBe(false);
  });

  it("resource_name__display override creates a separate cache entry", async () => {
    const cache = new MemoryCache({ maxEntries: 100, ttlMs: 60_000 });
    const cachedApp = makeApp(clients, { resourceBannerImage: cache });

    await cachedApp.request("/banner/resource/spigot/12345/banner.png");
    expect(cache.stats().sets).toBe(1);

    await cachedApp.request(
      "/banner/resource/spigot/12345/banner.png?resource_name__display=Override"
    );
    // Different query params → separate cache entry
    expect(cache.stats().sets).toBe(2);
    expect(cache.stats().hits).toBe(0);
  });

  it("author_name__display override changes rendered output vs no override", async () => {
    const resDefault = await app.request("/banner/resource/spigot/12345/banner.png");
    const resOverride = await app.request(
      "/banner/resource/spigot/12345/banner.png?author_name__display=by+Override+Author"
    );
    expect(resDefault.status).toBe(200);
    expect(resOverride.status).toBe(200);
    const bufDefault = Buffer.from(await resDefault.arrayBuffer());
    const bufOverride = Buffer.from(await resOverride.arrayBuffer());
    expect(bufDefault.equals(bufOverride)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Modrinth platform — dedicated coverage
// ---------------------------------------------------------------------------

describe("Modrinth resource route", () => {
  it("returns { valid: false } for Modrinth isValid when client returns null", async () => {
    const nullClients: ResourceClients = { MODRINTH: new FixtureResourceClient(null) };
    const res = await makeApp(nullClients).request("/banner/resource/modrinth/nonexistent/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });

  it("is case-insensitive (MODRINTH upper-case)", async () => {
    const res = await app.request("/banner/resource/MODRINTH/some-slug/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("is case-insensitive (MODRINTH upper-case) for isValid", async () => {
    const res = await app.request("/banner/resource/MODRINTH/some-slug/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });
});
