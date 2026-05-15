import { describe, it, expect } from "bun:test";
import { ModrinthResourceClient } from "../src/modrinth-client";
import type { FetchFn } from "../src/http-client";

const makeMockFetch = (
  responses: Record<string, { status: number; body: string | Uint8Array }>
): FetchFn =>
  (input) => {
    const url =
      input instanceof URL
        ? input.href
        : input instanceof Request
          ? input.url
          : input;
    const resp = responses[url];
    if (resp === undefined) throw new Error(`Unmocked URL: ${url}`);
    return Promise.resolve(new Response(resp.body, { status: resp.status }));
  };

const MODRINTH_BASE = "https://api.modrinth.com/v2";

const PROJECT_JSON = JSON.stringify({
  id: "AANobbMI",
  slug: "sodium",
  team: "some-team-id",
  title: "Sodium",
  updated: "2024-07-01T00:00:00Z",
  downloads: 3500000,
  followers: 12000,
  icon_url: "https://cdn.modrinth.com/data/AANobbMI/icon.png"
});

const PROJECT_NO_ICON_JSON = JSON.stringify({
  id: "BBCC1234",
  slug: "nouplugin",
  team: "team-1",
  title: "NoIconPlugin",
  updated: "2024-06-01T00:00:00Z",
  downloads: 100,
  followers: 5
});

const MEMBERS_JSON = JSON.stringify([
  { role: "Owner", user: { id: "u1", username: "jellysquid3", name: "Jelly", avatar_url: null } }
]);

const TINY_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
]);

describe("ModrinthResourceClient", () => {
  it("returns ResourceBannerData for a nominal project with members", async () => {
    const mockFetch = makeMockFetch({
      [`${MODRINTH_BASE}/project/sodium`]: { status: 200, body: PROJECT_JSON },
      [`${MODRINTH_BASE}/project/sodium/members`]: { status: 200, body: MEMBERS_JSON },
      "https://cdn.modrinth.com/data/AANobbMI/icon.png": { status: 200, body: TINY_PNG }
    });

    const client = new ModrinthResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("sodium");

    expect(result).not.toBeNull();
    expect(result?.resource.name).toBe("Sodium");
    expect(result?.resource.downloadCount).toBe(3500000);
    expect(result?.resource.lastUpdated).toBe("2024-07-01T00:00:00Z");
    expect(result?.resource.rating).toEqual({ count: 0, average: null });
    expect(result?.resource.price).toBeNull();
    expect(result?.resource.logoBase64).not.toBeNull();
    expect(result?.author.name).toBe("jellysquid3");
    expect(result?.backend).toBe("MODRINTH");
  });

  it("returns null logoBase64 when icon_url is absent", async () => {
    const mockFetch = makeMockFetch({
      [`${MODRINTH_BASE}/project/nouplugin`]: { status: 200, body: PROJECT_NO_ICON_JSON },
      [`${MODRINTH_BASE}/project/nouplugin/members`]: { status: 200, body: MEMBERS_JSON }
    });

    const client = new ModrinthResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("nouplugin");

    expect(result).not.toBeNull();
    expect(result?.resource.logoBase64).toBeNull();
    expect(result?.resource.name).toBe("NoIconPlugin");
  });

  it("returns null when project is not found (404)", async () => {
    const mockFetch = makeMockFetch({
      [`${MODRINTH_BASE}/project/nonexistent`]: { status: 404, body: "" }
    });

    const client = new ModrinthResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null when members endpoint returns empty array", async () => {
    const mockFetch = makeMockFetch({
      [`${MODRINTH_BASE}/project/sodium`]: { status: 200, body: PROJECT_JSON },
      [`${MODRINTH_BASE}/project/sodium/members`]: { status: 200, body: "[]" }
    });

    const client = new ModrinthResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("sodium");
    expect(result).toBeNull();
  });

  it("returns null when members endpoint fails (404)", async () => {
    const mockFetch = makeMockFetch({
      [`${MODRINTH_BASE}/project/sodium`]: { status: 200, body: PROJECT_JSON },
      [`${MODRINTH_BASE}/project/sodium/members`]: { status: 404, body: "" }
    });

    const client = new ModrinthResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("sodium");
    expect(result).toBeNull();
  });

  it("handles icon fetch failure gracefully (returns data with null logo)", async () => {
    const mockFetch = makeMockFetch({
      [`${MODRINTH_BASE}/project/sodium`]: { status: 200, body: PROJECT_JSON },
      [`${MODRINTH_BASE}/project/sodium/members`]: { status: 200, body: MEMBERS_JSON },
      "https://cdn.modrinth.com/data/AANobbMI/icon.png": { status: 500, body: "" }
    });

    const client = new ModrinthResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("sodium");
    expect(result).not.toBeNull();
    expect(result?.resource.logoBase64).toBeNull();
  });
});
