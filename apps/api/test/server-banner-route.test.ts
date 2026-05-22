import { beforeAll, describe, expect, it } from "bun:test";
import { registerRendererFonts } from "@mcbanners/banner-renderer";
import { MemoryCache } from "@mcbanners/cache";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import { createApp } from "../src/app";

// Pre-register fonts once for all render tests.
beforeAll(() => {
  registerRendererFonts();
});

const adapter = createFixtureAdapter(MC_STATUS_FIXTURES);
const app = createApp(adapter, {});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

describe("GET /health", () => {
  it("returns 200 with service status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { service: string; status: string };
    expect(body.service).toBe("mcbanners-api-next");
    expect(body.status).toBe("ok");
  });
});

// ---------------------------------------------------------------------------
// GET /mc/server
// ---------------------------------------------------------------------------

describe("GET /mc/server", () => {
  it("returns 200 JSON for a known fixture", async () => {
    const res = await app.request("/mc/server?host=mc.hypixel.net&port=25565");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const body = (await res.json()) as {
      host: string;
      players: { online: number; max: number };
    };
    expect(body.host).toBe("mc.hypixel.net");
    expect(body.players.online).toBe(42_500);
  });

  it("returns 404 for an unknown server", async () => {
    const res = await app.request("/mc/server?host=unknown.server.invalid&port=25565");
    expect(res.status).toBe(404);
  });

  it("returns 400 when host is missing", async () => {
    const res = await app.request("/mc/server?port=25565");
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid port", async () => {
    const res = await app.request("/mc/server?host=mc.hypixel.net&port=notanumber");
    expect(res.status).toBe(400);
  });

  it("defaults port to 25565 when not provided", async () => {
    const res = await app.request("/mc/server?host=mc.hypixel.net");
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /mc/icon
// ---------------------------------------------------------------------------

describe("GET /mc/icon", () => {
  it("returns 200 PNG bytes for a server with an icon", async () => {
    const res = await app.request("/mc/icon?host=mc.hypixel.net&port=25565");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const buf = Buffer.from(await res.arrayBuffer());
    // PNG magic bytes: 89 50 4E 47
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
    expect(buf.length).toBeGreaterThan(50);
  });

  it("returns 404 for a server with no icon", async () => {
    const res = await app.request("/mc/icon?host=noicon.local&port=25565");
    expect(res.status).toBe(404);
  });

  it("returns 404 for an unknown server", async () => {
    const res = await app.request("/mc/icon?host=unknown.server.invalid&port=25565");
    expect(res.status).toBe(404);
  });

  it("returns 400 when host is missing", async () => {
    const res = await app.request("/mc/icon?port=25565");
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid port", async () => {
    const res = await app.request("/mc/icon?host=mc.hypixel.net&port=notanumber");
    expect(res.status).toBe(400);
  });

  it("defaults port to 25565 when not provided", async () => {
    const res = await app.request("/mc/icon?host=mc.hypixel.net");
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /banner/server/:host/:port/isValid  (public compatibility route)
// ---------------------------------------------------------------------------

describe("GET /banner/server/:host/:port/isValid", () => {
  it("returns { valid: true } for a known fixture", async () => {
    const res = await app.request("/banner/server/mc.hypixel.net/25565/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });

  it("returns { valid: false } for an unknown server", async () => {
    const res = await app.request("/banner/server/unknown.invalid/25565/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });

  it("returns { valid: false } for a non-numeric port", async () => {
    const res = await app.request("/banner/server/mc.hypixel.net/abc/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /banner/server/:host/:port/banner.png  (public compatibility route)
// ---------------------------------------------------------------------------

describe("GET /banner/server/:host/:port/banner.png", () => {
  it("returns 200 PNG image for a known fixture", async () => {
    const res = await app.request("/banner/server/mc.hypixel.net/25565/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });

  it("returns 404 for an unknown server", async () => {
    const res = await app.request("/banner/server/unknown.invalid/25565/banner.png");
    expect(res.status).toBe(404);
  });

  it("returns 400 for an invalid port", async () => {
    const res = await app.request("/banner/server/mc.hypixel.net/99999/banner.png");
    expect(res.status).toBe(400);
  });

  it("renders the no-icon fixture without crashing", async () => {
    const res = await app.request("/banner/server/noicon.local/25565/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("renders the long-MOTD fixture", async () => {
    const res = await app.request("/banner/server/longmotd.local/25565/banner.png");
    expect(res.status).toBe(200);
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf.length).toBeGreaterThan(50);
  });

  it("renders the unicode fixture", async () => {
    const res = await app.request("/banner/server/unicode.local/25565/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });
});

// ---------------------------------------------------------------------------
// GET /banner/server/:host/:port/banner.jpg  (public compatibility route)
// ---------------------------------------------------------------------------

describe("GET /banner/server/:host/:port/banner.jpg", () => {
  it("returns 200 JPEG image for a known fixture", async () => {
    const res = await app.request("/banner/server/mc.hypixel.net/25565/banner.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xd8);
    expect(buf[2]).toBe(0xff);
  });

  it("returns 404 for an unknown server (jpg)", async () => {
    const res = await app.request("/banner/server/unknown.invalid/25565/banner.jpg");
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Invalid output type (via public route)
// ---------------------------------------------------------------------------

describe("Invalid output type", () => {
  it("returns 400 for .gif", async () => {
    const res = await app.request("/banner/server/mc.hypixel.net/25565/banner.gif");
    expect(res.status).toBe(400);
  });

  it("returns 400 for .webp", async () => {
    const res = await app.request("/banner/server/mc.hypixel.net/25565/banner.webp");
    expect(res.status).toBe(400);
  });

  it("returns 400 for .bmp", async () => {
    const res = await app.request("/banner/server/mc.hypixel.net/25565/banner.bmp");
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Query parameter passthrough (via public route)
// ---------------------------------------------------------------------------

describe("Query parameter passthrough", () => {
  it("accepts background__template query param without error", async () => {
    const res = await app.request(
      "/banner/server/mc.hypixel.net/25565/banner.png?background__template=SPACE"
    );
    expect(res.status).toBe(200);
  });

  it("accepts server_name__enable=false and still renders", async () => {
    const res = await app.request(
      "/banner/server/mc.hypixel.net/25565/banner.png?server_name__enable=false"
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Internal /server alias
// ---------------------------------------------------------------------------

describe("/server alias (internal)", () => {
  it("isValid works via /server alias", async () => {
    const res = await app.request("/server/mc.hypixel.net/25565/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });

  it("banner.png works via /server alias", async () => {
    const res = await app.request("/server/mc.hypixel.net/25565/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });
});

// ---------------------------------------------------------------------------
// Deterministic output
// ---------------------------------------------------------------------------

describe("Deterministic output", () => {
  it("produces identical PNG bytes on two requests with same params", async () => {
    const res1 = await app.request("/banner/server/mc.hypixel.net/25565/banner.png");
    const res2 = await app.request("/banner/server/mc.hypixel.net/25565/banner.png");

    const buf1 = Buffer.from(await res1.arrayBuffer());
    const buf2 = Buffer.from(await res2.arrayBuffer());

    expect(buf1.equals(buf2)).toBe(true);
  });

  it("produces identical JPG bytes on two requests with same params", async () => {
    const res1 = await app.request("/banner/server/mc.hypixel.net/25565/banner.jpg");
    const res2 = await app.request("/banner/server/mc.hypixel.net/25565/banner.jpg");

    const buf1 = Buffer.from(await res1.arrayBuffer());
    const buf2 = Buffer.from(await res2.arrayBuffer());

    expect(buf1.equals(buf2)).toBe(true);
  });

  it("PNG and JPG outputs are different byte sequences", async () => {
    const resPng = await app.request("/banner/server/mc.hypixel.net/25565/banner.png");
    const resJpg = await app.request("/banner/server/mc.hypixel.net/25565/banner.jpg");

    const bufPng = Buffer.from(await resPng.arrayBuffer());
    const bufJpg = Buffer.from(await resJpg.arrayBuffer());

    expect(bufPng.equals(bufJpg)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

describe("GET /health", () => {
  it("returns 200 with service status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { service: string; status: string };
    expect(body.service).toBe("mcbanners-api-next");
    expect(body.status).toBe("ok");
  });
});

// ---------------------------------------------------------------------------
// GET /mc/server
// ---------------------------------------------------------------------------

describe("GET /mc/server", () => {
  it("returns 200 JSON for a known fixture", async () => {
    const res = await app.request("/mc/server?host=mc.hypixel.net&port=25565");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const body = (await res.json()) as {
      host: string;
      players: { online: number; max: number };
    };
    expect(body.host).toBe("mc.hypixel.net");
    expect(body.players.online).toBe(42_500);
  });

  it("returns 404 for an unknown server", async () => {
    const res = await app.request("/mc/server?host=unknown.server.invalid&port=25565");
    expect(res.status).toBe(404);
  });

  it("returns 400 when host is missing", async () => {
    const res = await app.request("/mc/server?port=25565");
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid port", async () => {
    const res = await app.request("/mc/server?host=mc.hypixel.net&port=notanumber");
    expect(res.status).toBe(400);
  });

  it("defaults port to 25565 when not provided", async () => {
    const res = await app.request("/mc/server?host=mc.hypixel.net");
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /server/:host/:port/isValid
// ---------------------------------------------------------------------------

describe("GET /server/:host/:port/isValid", () => {
  it("returns { valid: true } for a known fixture", async () => {
    const res = await app.request("/server/mc.hypixel.net/25565/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(true);
  });

  it("returns { valid: false } for an unknown server", async () => {
    const res = await app.request("/server/unknown.invalid/25565/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });

  it("returns { valid: false } for a non-numeric port", async () => {
    const res = await app.request("/server/mc.hypixel.net/abc/isValid");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean };
    expect(body.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /server/:host/:port/banner.png
// ---------------------------------------------------------------------------

describe("GET /server/:host/:port/banner.png", () => {
  it("returns 200 PNG image for a known fixture", async () => {
    const res = await app.request("/server/mc.hypixel.net/25565/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const buf = Buffer.from(await res.arrayBuffer());
    // PNG magic bytes: 89 50 4E 47
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });

  it("returns 404 for an unknown server", async () => {
    const res = await app.request("/server/unknown.invalid/25565/banner.png");
    expect(res.status).toBe(404);
  });

  it("returns 400 for an invalid port", async () => {
    const res = await app.request("/server/mc.hypixel.net/99999/banner.png");
    expect(res.status).toBe(400);
  });

  it("renders the no-icon fixture without crashing", async () => {
    const res = await app.request("/server/noicon.local/25565/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("renders the long-MOTD fixture", async () => {
    const res = await app.request("/server/longmotd.local/25565/banner.png");
    expect(res.status).toBe(200);
    const buf = Buffer.from(await res.arrayBuffer());
    // PNG magic bytes confirm it's a real PNG (not an error body)
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf.length).toBeGreaterThan(50);
  });

  it("renders the unicode fixture", async () => {
    const res = await app.request("/server/unicode.local/25565/banner.png");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });
});

// ---------------------------------------------------------------------------
// GET /server/:host/:port/banner.jpg
// ---------------------------------------------------------------------------

describe("GET /server/:host/:port/banner.jpg", () => {
  it("returns 200 JPEG image for a known fixture", async () => {
    const res = await app.request("/server/mc.hypixel.net/25565/banner.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    const buf = Buffer.from(await res.arrayBuffer());
    // JPEG magic bytes: FF D8 FF
    expect(buf[0]).toBe(0xff);
    expect(buf[1]).toBe(0xd8);
    expect(buf[2]).toBe(0xff);
  });

  it("returns 404 for an unknown server (jpg)", async () => {
    const res = await app.request("/server/unknown.invalid/25565/banner.jpg");
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Invalid output type
// ---------------------------------------------------------------------------

describe("Invalid output type", () => {
  it("returns 400 for .gif", async () => {
    const res = await app.request("/server/mc.hypixel.net/25565/banner.gif");
    expect(res.status).toBe(400);
  });

  it("returns 400 for .webp", async () => {
    const res = await app.request("/server/mc.hypixel.net/25565/banner.webp");
    expect(res.status).toBe(400);
  });

  it("returns 400 for .bmp", async () => {
    const res = await app.request("/server/mc.hypixel.net/25565/banner.bmp");
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Query parameter passthrough
// ---------------------------------------------------------------------------

describe("Query parameter passthrough", () => {
  it("accepts background__template query param without error", async () => {
    const res = await app.request(
      "/server/mc.hypixel.net/25565/banner.png?background__template=SPACE"
    );
    expect(res.status).toBe(200);
  });

  it("accepts server_name__enable=false and still renders", async () => {
    const res = await app.request(
      "/server/mc.hypixel.net/25565/banner.png?server_name__enable=false"
    );
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Deterministic output
// ---------------------------------------------------------------------------

describe("Deterministic output", () => {
  it("produces identical PNG bytes on two requests with same params", async () => {
    const res1 = await app.request("/server/mc.hypixel.net/25565/banner.png");
    const res2 = await app.request("/server/mc.hypixel.net/25565/banner.png");

    const buf1 = Buffer.from(await res1.arrayBuffer());
    const buf2 = Buffer.from(await res2.arrayBuffer());

    expect(buf1.equals(buf2)).toBe(true);
  });

  it("produces identical JPG bytes on two requests with same params", async () => {
    const res1 = await app.request("/server/mc.hypixel.net/25565/banner.jpg");
    const res2 = await app.request("/server/mc.hypixel.net/25565/banner.jpg");

    const buf1 = Buffer.from(await res1.arrayBuffer());
    const buf2 = Buffer.from(await res2.arrayBuffer());

    expect(buf1.equals(buf2)).toBe(true);
  });

  it("PNG and JPG outputs are different byte sequences", async () => {
    const resPng = await app.request("/server/mc.hypixel.net/25565/banner.png");
    const resJpg = await app.request("/server/mc.hypixel.net/25565/banner.jpg");

    const bufPng = Buffer.from(await resPng.arrayBuffer());
    const bufJpg = Buffer.from(await resJpg.arrayBuffer());

    expect(bufPng.equals(bufJpg)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cache key normalization
// ---------------------------------------------------------------------------

describe("Cache key normalization", () => {
  it("host casing does not create duplicate banner cache entries", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    const appWithCache = createApp(adapter, {}, { bannerImage: cache });

    const res1 = await appWithCache.request("/banner/server/mc.hypixel.net/25565/banner.png");
    const res2 = await appWithCache.request("/banner/server/MC.HYPIXEL.NET/25565/banner.png");

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Both map to the same normalised key → only 1 render, 1 cache set.
    expect(cache.stats().sets).toBe(1);
  });

  it("output type casing does not create duplicate banner cache entries", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    const appWithCache = createApp(adapter, {}, { bannerImage: cache });

    const res1 = await appWithCache.request("/banner/server/mc.hypixel.net/25565/banner.png");
    const res2 = await appWithCache.request("/banner/server/mc.hypixel.net/25565/banner.PNG");

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    // Both map to the same normalised key → only 1 render, 1 cache set.
    expect(cache.stats().sets).toBe(1);
  });

  it("banner cache records byte estimate from rendered buffer length", async () => {
    // maxBytes large enough to not evict; verify the entry is stored (sets=1, evictions=0).
    const cache = new MemoryCache({ ttlMs: 60_000, maxBytes: 10_000_000 });
    const appWithCache = createApp(adapter, {}, { bannerImage: cache });

    await appWithCache.request("/banner/server/mc.hypixel.net/25565/banner.png");

    const s = cache.stats();
    expect(s.sets).toBe(1);
    expect(s.evictions).toBe(0); // rendered PNG is well under 10 MB
  });
});
