import { describe, expect, it } from "bun:test";
import { HangarResourceClient } from "../src/hangar-client";
import type { FetchFn } from "../src/http-client";

const makeMockFetch =
  (responses: Record<string, { status: number; body: string | Uint8Array }>): FetchFn =>
  (input) => {
    const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;
    const resp = responses[url];
    if (resp === undefined) throw new Error(`Unmocked URL: ${url}`);
    return Promise.resolve(new Response(resp.body, { status: resp.status }));
  };

const HANGAR_BASE = "https://hangar.papermc.io/api/v1";

const NOMINAL_PROJECT_JSON = JSON.stringify({
  name: "EternalLight",
  namespace: { owner: "papermc", slug: "eternal-light" },
  stats: { stars: 42, downloads: 8500, views: 120000 },
  lastUpdated: "2024-07-15T10:00:00Z",
  avatarUrl: "https://hangar.papermc.io/avatars/eternal-light.png"
});

const NO_AVATAR_PROJECT_JSON = JSON.stringify({
  name: "SilentPlugin",
  namespace: { owner: "devorg", slug: "silent" },
  stats: { stars: 5, downloads: 100, views: 500 },
  lastUpdated: "2024-01-01T00:00:00Z",
  avatarUrl: null
});

const TINY_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const HANGAR_USER_JSON = JSON.stringify({
  createdAt: "2022-12-22T14:20:08.320636Z",
  id: 4,
  name: "ViaVersion",
  tagline:
    "Easing the gap between Minecraft updates by allowing players to connect with different versions.",
  roles: [100],
  projectCount: 2,
  locked: false,
  nameHistory: [],
  avatarUrl: "https://hangarcdn.papermc.io/avatars/user/viaversion.webp?v=5",
  socials: {},
  isOrganization: true
});

const authorProject = (name: string, downloads: number, stars: number, views: number) => ({
  name,
  namespace: { owner: "ViaVersion", slug: name },
  stats: { stars, downloads, views },
  lastUpdated: "2026-05-15T16:55:37.99701Z",
  avatarUrl: null
});

describe("HangarResourceClient", () => {
  it("returns ResourceBannerData for a nominal project", async () => {
    const mockFetch = makeMockFetch({
      [`${HANGAR_BASE}/projects/papermc/eternal-light`]: {
        status: 200,
        body: NOMINAL_PROJECT_JSON
      },
      "https://hangar.papermc.io/avatars/eternal-light.png": {
        status: 200,
        body: TINY_PNG
      }
    });

    const client = new HangarResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("papermc/eternal-light");

    expect(result).not.toBeNull();
    expect(result?.resource.name).toBe("EternalLight");
    expect(result?.resource.downloadCount).toBe(8500);
    expect(result?.resource.lastUpdated).toBe("2024-07-15T10:00:00Z");
    // Java: new RatingInformation(stars, 0.0)
    expect(result?.resource.rating).toEqual({ count: 42, average: 0 });
    expect(result?.resource.price).toBeNull();
    expect(result?.resource.logoBase64).not.toBeNull();
    expect(result?.author.name).toBe("papermc");
    expect(result?.backend).toBe("HANGAR");
  });

  it("returns null logoBase64 when avatarUrl is null", async () => {
    const mockFetch = makeMockFetch({
      [`${HANGAR_BASE}/projects/devorg/silent`]: {
        status: 200,
        body: NO_AVATAR_PROJECT_JSON
      }
    });

    const client = new HangarResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("devorg/silent");

    expect(result).not.toBeNull();
    expect(result?.resource.logoBase64).toBeNull();
    expect(result?.resource.rating).toEqual({ count: 5, average: 0 });
  });

  it("returns null on 404", async () => {
    const mockFetch = makeMockFetch({
      [`${HANGAR_BASE}/projects/unknown/plugin`]: { status: 404, body: "" }
    });

    const client = new HangarResourceClient({}, mockFetch);
    expect(await client.getResourceBannerData("unknown/plugin")).toBeNull();
  });

  it("returns null on malformed JSON", async () => {
    const mockFetch = makeMockFetch({
      [`${HANGAR_BASE}/projects/bad/data`]: { status: 200, body: "!!notjson" }
    });

    const client = new HangarResourceClient({}, mockFetch);
    expect(await client.getResourceBannerData("bad/data")).toBeNull();
  });

  it("handles icon fetch failure gracefully (returns data with null logo)", async () => {
    const mockFetch = makeMockFetch({
      [`${HANGAR_BASE}/projects/papermc/eternal-light`]: {
        status: 200,
        body: NOMINAL_PROJECT_JSON
      },
      "https://hangar.papermc.io/avatars/eternal-light.png": { status: 500, body: "" }
    });

    const client = new HangarResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("papermc/eternal-light");

    expect(result).not.toBeNull();
    expect(result?.resource.logoBase64).toBeNull();
  });

  it("lastUpdated is null when lastUpdated field is empty string", async () => {
    const emptyDate = JSON.stringify({
      name: "EmptyDate",
      namespace: { owner: "org", slug: "emptydate" },
      stats: { stars: 0, downloads: 0, views: 0 },
      lastUpdated: "",
      avatarUrl: null
    });
    const mockFetch = makeMockFetch({
      [`${HANGAR_BASE}/projects/org/emptydate`]: { status: 200, body: emptyDate }
    });

    const client = new HangarResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("org/emptydate");
    expect(result?.resource.lastUpdated).toBeNull();
  });

  it("returns AuthorBannerData using the documented owner project search endpoint", async () => {
    const mockFetch = makeMockFetch({
      [`${HANGAR_BASE}/users/viaversion`]: {
        status: 200,
        body: HANGAR_USER_JSON
      },
      [`${HANGAR_BASE}/projects?owner=ViaVersion&limit=25&offset=0`]: {
        status: 200,
        body: JSON.stringify({
          pagination: { count: 2, limit: 25, offset: 0 },
          result: [
            authorProject("ViaVersion", 397827, 439, 938727),
            authorProject("ViaBackwards", 120000, 123, 456000)
          ]
        })
      },
      "https://hangarcdn.papermc.io/avatars/user/viaversion.webp?v=5": {
        status: 200,
        body: TINY_PNG
      }
    });

    const client = new HangarResourceClient({}, mockFetch);
    const result = await client.getAuthorBannerData("ViaVersion");

    expect(result).not.toBeNull();
    expect(result?.backend).toBe("HANGAR");
    expect(result?.author.name).toBe("ViaVersion");
    expect(result?.author.resourceCount).toBe(2);
    expect(result?.author.downloadCount).toBe(517827);
    expect(result?.author.likes).toBe(562);
    expect(result?.author.reviews).toBe(1394727);
    expect(result?.author.logoBase64).not.toBeNull();
  });

  it("aggregates Hangar author projects across pages", async () => {
    const mockFetch = makeMockFetch({
      [`${HANGAR_BASE}/users/viaversion`]: {
        status: 200,
        body: HANGAR_USER_JSON
      },
      [`${HANGAR_BASE}/projects?owner=ViaVersion&limit=25&offset=0`]: {
        status: 200,
        body: JSON.stringify({
          pagination: { count: 26, limit: 25, offset: 0 },
          result: Array.from({ length: 25 }, (_, i) =>
            authorProject(`Project${String(i)}`, 1, 2, 3)
          )
        })
      },
      [`${HANGAR_BASE}/projects?owner=ViaVersion&limit=25&offset=25`]: {
        status: 200,
        body: JSON.stringify({
          pagination: { count: 26, limit: 25, offset: 25 },
          result: [authorProject("Project25", 10, 20, 30)]
        })
      },
      "https://hangarcdn.papermc.io/avatars/user/viaversion.webp?v=5": {
        status: 200,
        body: TINY_PNG
      }
    });

    const client = new HangarResourceClient({}, mockFetch);
    const result = await client.getAuthorBannerData("ViaVersion");

    expect(result?.author.resourceCount).toBe(26);
    expect(result?.author.downloadCount).toBe(35);
    expect(result?.author.likes).toBe(70);
    expect(result?.author.reviews).toBe(105);
  });
});
