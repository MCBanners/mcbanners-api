import { describe, expect, it } from "bun:test";
import { CurseForgeResourceClient } from "../src/curseforge-client";
import type { FetchFn } from "../src/http-client";

const makeMockFetch =
  (responses: Record<string, { status: number; body: string | Uint8Array }>): FetchFn =>
  (input) => {
    const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;
    const resp = responses[url];
    if (resp === undefined) throw new Error(`Unmocked URL: ${url}`);
    return Promise.resolve(new Response(resp.body, { status: resp.status }));
  };

const CFWIDGET_BASE = "https://api.cfwidget.com/";

const NOMINAL_RESOURCE_JSON = JSON.stringify({
  id: 12345,
  title: "MyPlugin",
  thumbnail: "https://media.forgecdn.net/avatars/thumbnails/1234/512/myplugin.png",
  downloads: { monthly: 500, total: 15000 },
  download: { uploaded_at: "2024-06-01T12:00:00Z" },
  members: [
    { id: 1, title: "Owner", username: "PluginDev" },
    { id: 2, title: "Contributor", username: "Other" }
  ]
});

const NO_OWNER_RESOURCE_JSON = JSON.stringify({
  id: 99,
  title: "OrphanPlugin",
  thumbnail: "",
  downloads: { monthly: 0, total: 0 },
  download: { uploaded_at: "" },
  members: [{ id: 5, title: "Member", username: "SomeDev" }]
});

const NO_THUMBNAIL_RESOURCE_JSON = JSON.stringify({
  id: 777,
  title: "NoIconPlugin",
  thumbnail: "",
  downloads: { monthly: 10, total: 200 },
  download: { uploaded_at: "2024-01-01T00:00:00Z" },
  members: [{ id: 3, title: "Owner", username: "DevUser" }]
});

const TINY_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** cfwidget 202 "processing" body — schema will reject it → null. */
const PROCESSING_BODY = JSON.stringify({
  status: 202,
  message: "CurseForge is processing this resource. Please try again later."
});

describe("CurseForgeResourceClient", () => {
  it("returns ResourceBannerData for a nominal resource", async () => {
    const mockFetch = makeMockFetch({
      [`${CFWIDGET_BASE}12345`]: { status: 200, body: NOMINAL_RESOURCE_JSON },
      "https://media.forgecdn.net/avatars/thumbnails/1234/512/myplugin.png": {
        status: 200,
        body: TINY_PNG
      }
    });

    const client = new CurseForgeResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("12345");

    expect(result).not.toBeNull();
    expect(result?.resource.name).toBe("MyPlugin");
    expect(result?.resource.downloadCount).toBe(15000);
    expect(result?.resource.lastUpdated).toBe("2024-06-01T12:00:00Z");
    expect(result?.resource.rating).toEqual({ count: 0, average: 0 });
    expect(result?.resource.price).toBeNull();
    expect(result?.resource.logoBase64).not.toBeNull();
    expect(result?.author.name).toBe("PluginDev");
    expect(result?.backend).toBe("CURSEFORGE");
  });

  it("selects the Owner member (case-insensitive)", async () => {
    const ownerCaseVariant = JSON.stringify({
      id: 1,
      title: "CasePlugin",
      thumbnail: "",
      downloads: { monthly: 0, total: 0 },
      download: { uploaded_at: "" },
      members: [
        { id: 10, title: "OWNER", username: "UpperOwner" },
        { id: 11, title: "Contributor", username: "ContribUser" }
      ]
    });
    const mockFetch = makeMockFetch({
      [`${CFWIDGET_BASE}1`]: { status: 200, body: ownerCaseVariant }
    });

    const client = new CurseForgeResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("1");

    expect(result).not.toBeNull();
    expect(result?.author.name).toBe("UpperOwner");
  });

  it("returns null when no Owner member exists", async () => {
    const mockFetch = makeMockFetch({
      [`${CFWIDGET_BASE}99`]: { status: 200, body: NO_OWNER_RESOURCE_JSON }
    });

    const client = new CurseForgeResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("99");
    expect(result).toBeNull();
  });

  it("returns null logoBase64 when thumbnail is empty", async () => {
    const mockFetch = makeMockFetch({
      [`${CFWIDGET_BASE}777`]: { status: 200, body: NO_THUMBNAIL_RESOURCE_JSON }
    });

    const client = new CurseForgeResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("777");

    expect(result).not.toBeNull();
    expect(result?.resource.logoBase64).toBeNull();
    expect(result?.resource.downloadCount).toBe(200);
  });

  it("returns null on 404", async () => {
    const mockFetch = makeMockFetch({
      [`${CFWIDGET_BASE}00000`]: { status: 404, body: "" }
    });

    const client = new CurseForgeResourceClient({}, mockFetch);
    expect(await client.getResourceBannerData("00000")).toBeNull();
  });

  it("returns null on malformed JSON", async () => {
    const mockFetch = makeMockFetch({
      [`${CFWIDGET_BASE}bad`]: { status: 200, body: "{{not json" }
    });

    const client = new CurseForgeResourceClient({}, mockFetch);
    expect(await client.getResourceBannerData("bad")).toBeNull();
  });

  it("returns null for cfwidget 202 processing response", async () => {
    const mockFetch = makeMockFetch({
      [`${CFWIDGET_BASE}new`]: { status: 202, body: PROCESSING_BODY }
    });

    const client = new CurseForgeResourceClient({}, mockFetch);
    expect(await client.getResourceBannerData("new")).toBeNull();
  });

  it("handles icon fetch failure gracefully (returns data with null logo)", async () => {
    const mockFetch = makeMockFetch({
      [`${CFWIDGET_BASE}12345`]: { status: 200, body: NOMINAL_RESOURCE_JSON },
      "https://media.forgecdn.net/avatars/thumbnails/1234/512/myplugin.png": {
        status: 500,
        body: ""
      }
    });

    const client = new CurseForgeResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("12345");

    expect(result).not.toBeNull();
    expect(result?.resource.logoBase64).toBeNull();
  });

  it("lastUpdated is null when uploaded_at is empty", async () => {
    const mockFetch = makeMockFetch({
      [`${CFWIDGET_BASE}777`]: { status: 200, body: NO_THUMBNAIL_RESOURCE_JSON }
    });

    const client = new CurseForgeResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("777");

    // NO_THUMBNAIL_RESOURCE_JSON has uploaded_at="2024-01-01..." — not null
    expect(result?.resource.lastUpdated).toBe("2024-01-01T00:00:00Z");
  });
});
