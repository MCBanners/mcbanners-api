import { describe, expect, it } from "bun:test";
import type { FetchFn } from "../src/http-client";
import { PolymartResourceClient } from "../src/polymart-client";

const POLYMART_BASE = "https://api.polymart.org/v1/";

interface MockResponse {
  status: number;
  body: string | Uint8Array;
}

const makeMockFetch =
  (responses: Record<string, MockResponse>): FetchFn =>
  (input) => {
    const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;
    const resp = responses[url];
    if (resp === undefined) throw new Error(`Unmocked URL: ${url}`);
    return Promise.resolve(new Response(resp.body, { status: resp.status }));
  };

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const THUMBNAIL_URL = "https://polymart.org/r/123/thumbnail";
const TINY_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const makeResourceJson = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    response: {
      resource: {
        id: 123,
        title: "AwesomePlugin",
        owner: {
          name: "AuthorName",
          id: 456,
          type: "user",
          url: "https://polymart.org/user/456"
        },
        price: 0.0,
        currency: "USD",
        downloads: 5000,
        thumbnailURL: THUMBNAIL_URL,
        reviews: { count: 88, stars: 5 },
        ...overrides
      }
    }
  });

const NOMINAL_RESOURCE_JSON = makeResourceJson();
const PREMIUM_RESOURCE_JSON = makeResourceJson({ price: 4.99, currency: "eur" });
const NULL_THUMBNAIL_JSON = makeResourceJson({ thumbnailURL: null });
const EMPTY_THUMBNAIL_JSON = makeResourceJson({ thumbnailURL: "" });
const TEAM_OWNER_JSON = makeResourceJson({
  owner: {
    name: "PluginTeam",
    id: 789,
    type: "team",
    url: "https://polymart.org/team/789"
  }
});

const TEAM_JSON = JSON.stringify({
  response: {
    team: {
      id: 789,
      username: "PluginTeam",
      type: "team",
      profilePictureURL: THUMBNAIL_URL,
      statistics: {
        resourceCount: 12,
        resourceDownloads: 250000,
        resourceRatings: 3400,
        resourceAverageRating: 4
      }
    }
  }
});

describe("PolymartResourceClient", () => {
  // ---- nominal free resource ----

  it("returns ResourceBannerData for a free resource", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getResourceInfo/?resource_id=123`]: {
        status: 200,
        body: NOMINAL_RESOURCE_JSON
      },
      [THUMBNAIL_URL]: { status: 200, body: TINY_PNG }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("123");

    expect(result).not.toBeNull();
    expect(result?.resource.name).toBe("AwesomePlugin");
    expect(result?.resource.downloadCount).toBe(5000);
    expect(result?.resource.lastUpdated).toBeNull();
    expect(result?.resource.rating).toEqual({ count: 88, average: 5 });
    expect(result?.resource.price).toBeNull();
    expect(result?.author.name).toBe("AuthorName");
    expect(result?.backend).toBe("POLYMART");
  });

  // ---- logo fetching ----

  it("fetches thumbnailURL as base64 logo", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getResourceInfo/?resource_id=123`]: {
        status: 200,
        body: NOMINAL_RESOURCE_JSON
      },
      [THUMBNAIL_URL]: { status: 200, body: TINY_PNG }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("123");

    expect(result?.resource.logoBase64).not.toBeNull();
    expect(typeof result?.resource.logoBase64).toBe("string");
  });

  it("returns null logo when thumbnailURL is null", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getResourceInfo/?resource_id=123`]: {
        status: 200,
        body: NULL_THUMBNAIL_JSON
      }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("123");

    expect(result?.resource.logoBase64).toBeNull();
  });

  it("returns null logo when thumbnailURL is empty string", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getResourceInfo/?resource_id=123`]: {
        status: 200,
        body: EMPTY_THUMBNAIL_JSON
      }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("123");

    expect(result?.resource.logoBase64).toBeNull();
  });

  it("returns null logo when thumbnail fetch fails (404)", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getResourceInfo/?resource_id=123`]: {
        status: 200,
        body: NOMINAL_RESOURCE_JSON
      },
      [THUMBNAIL_URL]: { status: 404, body: "" }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("123");

    expect(result).not.toBeNull();
    expect(result?.resource.logoBase64).toBeNull();
  });

  // ---- premium resource ----

  it("includes price for premium resources", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getResourceInfo/?resource_id=123`]: {
        status: 200,
        body: PREMIUM_RESOURCE_JSON
      },
      [THUMBNAIL_URL]: { status: 200, body: TINY_PNG }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("123");

    expect(result?.resource.price).toEqual({ amount: 4.99, currency: "EUR" });
  });

  it("uppercases currency for premium resources", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getResourceInfo/?resource_id=123`]: {
        status: 200,
        body: PREMIUM_RESOURCE_JSON
      },
      [THUMBNAIL_URL]: { status: 200, body: TINY_PNG }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("123");

    expect(result?.resource.price?.currency).toBe("EUR");
  });

  // ---- team owner ----

  it("uses owner.name from resource for team-owned resources (no separate author call)", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getResourceInfo/?resource_id=123`]: {
        status: 200,
        body: TEAM_OWNER_JSON
      },
      [THUMBNAIL_URL]: { status: 200, body: TINY_PNG }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("123");

    // Author name comes from resource.owner.name regardless of type (user vs team)
    expect(result?.author.name).toBe("PluginTeam");
  });

  // ---- null on not-found / failures ----

  it("returns null when resource endpoint returns 404", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getResourceInfo/?resource_id=99999`]: { status: 404, body: "" }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("99999");

    expect(result).toBeNull();
  });

  it("returns null for malformed resource JSON", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getResourceInfo/?resource_id=123`]: {
        status: 200,
        body: "not json"
      }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("123");

    expect(result).toBeNull();
  });

  it("returns null for resource JSON with missing required fields", async () => {
    const badJson = JSON.stringify({
      response: { resource: { id: 1, title: "Missing fields" } }
    });
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getResourceInfo/?resource_id=123`]: { status: 200, body: badJson }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("123");

    expect(result).toBeNull();
  });

  it("returns TeamBannerData for a Polymart team", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getAccountInfo/?team_id=789`]: { status: 200, body: TEAM_JSON },
      [THUMBNAIL_URL]: { status: 200, body: TINY_PNG }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getTeamBannerData("789");

    expect(result).not.toBeNull();
    expect(result?.team.name).toBe("PluginTeam");
    expect(result?.team.resourceCount).toBe(12);
    expect(result?.team.resourceDownloads).toBe(250000);
    expect(result?.team.resourceRatings).toBe(3400);
    expect(result?.team.resourceAverageRating).toBe(4);
    expect(result?.team.logoBase64).not.toBeNull();
  });

  it("returns null for missing Polymart teams", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getAccountInfo/?team_id=404`]: { status: 404, body: "" }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    expect(await client.getTeamBannerData("404")).toBeNull();
  });

  it("keeps Polymart team logo failures non-fatal", async () => {
    const mockFetch = makeMockFetch({
      [`${POLYMART_BASE}getAccountInfo/?team_id=789`]: { status: 200, body: TEAM_JSON },
      [THUMBNAIL_URL]: { status: 500, body: "" }
    });

    const client = new PolymartResourceClient({}, mockFetch);
    const result = await client.getTeamBannerData("789");

    expect(result).not.toBeNull();
    expect(result?.team.logoBase64).toBeNull();
  });
});
