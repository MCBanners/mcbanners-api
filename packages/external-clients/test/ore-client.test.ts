import { describe, it, expect } from "bun:test";
import { OreResourceClient } from "../src/ore-client";
import type { FetchFn } from "../src/http-client";

interface MockResponse {
  status: number;
  body: string | Uint8Array;
}

/**
 * Mock fetch that dispatches on URL. For Ore's POST authenticate we still key
 * on URL only, since the method is POST but the URL is unique.
 */
const makeMockFetch =
  (responses: Record<string, MockResponse>): FetchFn =>
  (input) => {
    const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;
    const resp = responses[url];
    if (resp === undefined) throw new Error(`Unmocked URL: ${url}`);
    return Promise.resolve(new Response(resp.body, { status: resp.status }));
  };

const ORE_BASE = "https://ore.spongepowered.org/api/v2";

const AUTH_JSON = JSON.stringify({
  session: "abc-token-123",
  // expires 1 hour from a fixed point — any future Date string works
  expires: "2099-01-01T00:00:00.000+00:00"
});

const NOMINAL_PROJECT_JSON = JSON.stringify({
  plugin_id: "myplugin",
  name: "MyPlugin",
  namespace: { owner: "PluginDev", slug: "myplugin" },
  stats: { views: 5000, downloads: 3200, stars: 78 },
  last_updated: "2024-05-01T00:00:00Z",
  icon_url: "https://ore.spongepowered.org/api/v2/projects/myplugin/icon"
});

const TINY_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("OreResourceClient", () => {
  it("returns ResourceBannerData for a nominal resource", async () => {
    const mockFetch = makeMockFetch({
      [`${ORE_BASE}/authenticate`]: { status: 200, body: AUTH_JSON },
      [`${ORE_BASE}/projects/myplugin`]: { status: 200, body: NOMINAL_PROJECT_JSON },
      [`${ORE_BASE}/projects/myplugin/icon`]: { status: 200, body: TINY_PNG }
    });

    const client = new OreResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("myplugin");

    expect(result).not.toBeNull();
    expect(result?.resource.name).toBe("MyPlugin");
    expect(result?.resource.downloadCount).toBe(3200);
    // Java OreResourceService sets lastUpdated = null explicitly
    expect(result?.resource.lastUpdated).toBeNull();
    // Java: new RatingInformation(stars) → average is null
    expect(result?.resource.rating).toEqual({ count: 78, average: null });
    expect(result?.resource.price).toBeNull();
    expect(result?.resource.logoBase64).not.toBeNull();
    expect(result?.author.name).toBe("PluginDev");
    expect(result?.backend).toBe("ORE");
  });

  it("lowercases plugin id before requesting (Java parity)", async () => {
    const mockFetch = makeMockFetch({
      [`${ORE_BASE}/authenticate`]: { status: 200, body: AUTH_JSON },
      [`${ORE_BASE}/projects/myplugin`]: { status: 200, body: NOMINAL_PROJECT_JSON },
      [`${ORE_BASE}/projects/myplugin/icon`]: { status: 200, body: TINY_PNG }
    });

    const client = new OreResourceClient({}, mockFetch);
    // Passing uppercase ID — client should lowercase it
    const result = await client.getResourceBannerData("MYPLUGIN");
    expect(result).not.toBeNull();
  });

  it("reuses session token without re-authenticating", async () => {
    let authCallCount = 0;

    const mockFetch: FetchFn = (input) => {
      const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;

      if (url === `${ORE_BASE}/authenticate`) {
        authCallCount++;
        return Promise.resolve(new Response(AUTH_JSON, { status: 200 }));
      }
      if (url === `${ORE_BASE}/projects/myplugin`) {
        return Promise.resolve(new Response(NOMINAL_PROJECT_JSON, { status: 200 }));
      }
      if (url === `${ORE_BASE}/projects/myplugin/icon`) {
        return Promise.resolve(new Response(TINY_PNG, { status: 200 }));
      }
      throw new Error(`Unmocked URL: ${url}`);
    };

    const client = new OreResourceClient({}, mockFetch);
    await client.getResourceBannerData("myplugin");
    await client.getResourceBannerData("myplugin");

    expect(authCallCount).toBe(1);
  });

  it("returns null when authentication fails", async () => {
    const mockFetch = makeMockFetch({
      [`${ORE_BASE}/authenticate`]: { status: 401, body: "" }
    });

    const client = new OreResourceClient({}, mockFetch);
    expect(await client.getResourceBannerData("myplugin")).toBeNull();
  });

  it("returns null on auth endpoint malformed JSON", async () => {
    const mockFetch = makeMockFetch({
      [`${ORE_BASE}/authenticate`]: { status: 200, body: "{{bad" }
    });

    const client = new OreResourceClient({}, mockFetch);
    expect(await client.getResourceBannerData("myplugin")).toBeNull();
  });

  it("returns null when project is not found (404)", async () => {
    const mockFetch = makeMockFetch({
      [`${ORE_BASE}/authenticate`]: { status: 200, body: AUTH_JSON },
      [`${ORE_BASE}/projects/missing`]: { status: 404, body: "" }
    });

    const client = new OreResourceClient({}, mockFetch);
    expect(await client.getResourceBannerData("missing")).toBeNull();
  });

  it("returns null when project JSON is malformed", async () => {
    const mockFetch = makeMockFetch({
      [`${ORE_BASE}/authenticate`]: { status: 200, body: AUTH_JSON },
      [`${ORE_BASE}/projects/myplugin`]: { status: 200, body: "not-json" }
    });

    const client = new OreResourceClient({}, mockFetch);
    expect(await client.getResourceBannerData("myplugin")).toBeNull();
  });

  it("handles icon fetch failure gracefully (returns data with null logo)", async () => {
    const mockFetch = makeMockFetch({
      [`${ORE_BASE}/authenticate`]: { status: 200, body: AUTH_JSON },
      [`${ORE_BASE}/projects/myplugin`]: { status: 200, body: NOMINAL_PROJECT_JSON },
      [`${ORE_BASE}/projects/myplugin/icon`]: { status: 500, body: "" }
    });

    const client = new OreResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("myplugin");

    expect(result).not.toBeNull();
    expect(result?.resource.logoBase64).toBeNull();
  });

  it("returns null logoBase64 when icon_url is empty", async () => {
    const noIconProject = JSON.stringify({
      ...JSON.parse(NOMINAL_PROJECT_JSON),
      icon_url: ""
    });
    const mockFetch = makeMockFetch({
      [`${ORE_BASE}/authenticate`]: { status: 200, body: AUTH_JSON },
      [`${ORE_BASE}/projects/myplugin`]: { status: 200, body: noIconProject }
    });

    const client = new OreResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("myplugin");

    expect(result).not.toBeNull();
    expect(result?.resource.logoBase64).toBeNull();
  });

  it("two separate instances do not share session state", async () => {
    let authCalls = 0;

    const countingFetch: FetchFn = (input) => {
      const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;
      if (url === `${ORE_BASE}/authenticate`) {
        authCalls++;
        return Promise.resolve(new Response(AUTH_JSON, { status: 200 }));
      }
      if (url === `${ORE_BASE}/projects/myplugin`) {
        return Promise.resolve(new Response(NOMINAL_PROJECT_JSON, { status: 200 }));
      }
      if (url === `${ORE_BASE}/projects/myplugin/icon`) {
        return Promise.resolve(new Response(new Uint8Array([]), { status: 404 }));
      }
      throw new Error(`Unmocked URL: ${url}`);
    };

    const clientA = new OreResourceClient({}, countingFetch);
    const clientB = new OreResourceClient({}, countingFetch);

    await clientA.getResourceBannerData("myplugin");
    await clientB.getResourceBannerData("myplugin");

    // Each instance authenticates independently — 2 separate auth calls
    expect(authCalls).toBe(2);
  });

  it("session is reused within the same instance (no re-auth on second call)", async () => {
    let authCalls = 0;

    const countingFetch: FetchFn = (input) => {
      const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;
      if (url === `${ORE_BASE}/authenticate`) {
        authCalls++;
        return Promise.resolve(new Response(AUTH_JSON, { status: 200 }));
      }
      if (url === `${ORE_BASE}/projects/myplugin`) {
        return Promise.resolve(new Response(NOMINAL_PROJECT_JSON, { status: 200 }));
      }
      if (url === `${ORE_BASE}/projects/myplugin/icon`) {
        return Promise.resolve(new Response(new Uint8Array([]), { status: 404 }));
      }
      throw new Error(`Unmocked URL: ${url}`);
    };

    const client = new OreResourceClient({}, countingFetch);

    await client.getResourceBannerData("myplugin");
    await client.getResourceBannerData("myplugin");

    // Same instance, valid session → only one auth call
    expect(authCalls).toBe(1);
  });
});
