/**
 * client-contract.test.ts
 *
 * Cross-client contract verification.  Ensures every ResourceClient implementation:
 *   1. Returns a consistently shaped ResourceBannerData on success.
 *   2. Returns null on upstream 404.
 *   3. Returns null on malformed upstream JSON.
 *   4. Sets the correct `backend` string.
 *   5. Does not leak raw upstream response fields into the normalized output.
 *
 * Tests are fixture-driven; no live network calls are made.
 */

import { describe, expect, it } from "bun:test";
import type { ResourceBannerData } from "@mcbanners/banner-renderer";
import { BuiltByBitResourceClient } from "../src/builtbybit-client";
import { CurseForgeResourceClient } from "../src/curseforge-client";
import { HangarResourceClient } from "../src/hangar-client";
import type { FetchFn } from "../src/http-client";
import { ModrinthResourceClient } from "../src/modrinth-client";
import { OreResourceClient } from "../src/ore-client";
import { PolymartResourceClient } from "../src/polymart-client";
import type { ResourceClient } from "../src/resource-client";
import { SpigotResourceClient } from "../src/spigot-client";

// ---------------------------------------------------------------------------
// Shared mock fetch factory
// ---------------------------------------------------------------------------

const makeMockFetch =
  (responses: Record<string, { status: number; body: string | Uint8Array }>): FetchFn =>
  (input) => {
    const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;
    const resp = responses[url];
    if (resp === undefined) throw new Error(`Unmocked URL: ${url}`);
    return Promise.resolve(
      new Response(resp.body, {
        status: resp.status,
        headers: { "Content-Type": "application/json" }
      })
    );
  };

/** Returns a FetchFn that returns 404 for every request. */
const alwaysNotFound: FetchFn = () => Promise.resolve(new Response("", { status: 404 }));

/** Returns a FetchFn that returns 200 with garbage JSON for every request. */
const alwaysMalformed: FetchFn = () =>
  Promise.resolve(new Response("{{not valid json}}", { status: 200 }));

// ---------------------------------------------------------------------------
// Nominal mock payloads
// ---------------------------------------------------------------------------

const SPIGOT_URL = "https://api.spigotmc.org/simple/0.2/index.php?action=getResource&id=1";
const SPIGOT_NOMINAL = JSON.stringify({
  id: "1",
  title: "TestSpigotPlugin",
  tag: "",
  current_version: "1.0",
  icon_link: "",
  premium: { price: "0.00", currency: "" },
  stats: { downloads: "999", updates: "5", rating: "4.2", reviews: { unique: "88", total: "90" } },
  author: { id: "42", username: "SpigotDev" }
});

const MODRINTH_PROJECT_URL = "https://api.modrinth.com/v2/project/test-mod";
const MODRINTH_MEMBERS_URL = "https://api.modrinth.com/v2/project/test-mod/members";
const MODRINTH_PROJECT = JSON.stringify({
  id: "AABBCC",
  slug: "test-mod",
  team: "team-1",
  title: "TestModrinthMod",
  updated: "2024-06-01T00:00:00Z",
  downloads: 55000
});
const MODRINTH_MEMBERS = JSON.stringify([
  { role: "Owner", user: { id: "u1", username: "ModrinthDev", name: null, avatar_url: null } }
]);

const CF_URL = "https://api.cfwidget.com/99";
const CF_NOMINAL = JSON.stringify({
  id: 99,
  title: "TestCfPlugin",
  thumbnail: "",
  downloads: { monthly: 10, total: 3000 },
  download: { uploaded_at: "2024-05-01T00:00:00Z" },
  members: [{ id: 1, title: "Owner", username: "CfDev" }]
});

const HANGAR_URL = "https://hangar.papermc.io/api/v1/projects/hangarorg/hangar-proj";
const HANGAR_NOMINAL = JSON.stringify({
  name: "TestHangarPlugin",
  namespace: { owner: "hangarorg", slug: "hangar-proj" },
  stats: { stars: 15, downloads: 400, views: 5000 },
  lastUpdated: "2024-04-01T00:00:00Z",
  avatarUrl: null
});

const ORE_AUTH_URL = "https://ore.spongepowered.org/api/v2/authenticate";
const ORE_PROJECT_URL = "https://ore.spongepowered.org/api/v2/projects/ore-plugin";
const ORE_SESSION = JSON.stringify({ session: "tok-abc", expires: "2099-01-01T00:00:00Z" });
const ORE_PROJECT = JSON.stringify({
  plugin_id: "ore-plugin",
  name: "TestOrePlugin",
  namespace: { owner: "oredev", slug: "ore-plugin" },
  stats: { views: 100, downloads: 220, stars: 7 },
  last_updated: "",
  icon_url: ""
});

const BBB_RESOURCE_URL = "https://api.builtbybit.com/v1/resources/55";
const BBB_MEMBER_URL = "https://api.builtbybit.com/v1/members/3";
const BBB_RESOURCE = JSON.stringify({
  data: {
    resource_id: 55,
    author_id: 3,
    title: "TestBbbPlugin",
    price: 0,
    currency: "USD",
    purchase_count: 0,
    download_count: 180,
    review_count: 12,
    review_average: 4.7
  }
});
const BBB_MEMBER = JSON.stringify({
  data: { member_id: 3, username: "BbbDev", resource_count: 2, avatar_url: "" }
});

const POLYMART_URL = "https://api.polymart.org/v1/getResourceInfo/?resource_id=77";
const POLYMART_NOMINAL = JSON.stringify({
  response: {
    resource: {
      id: 77,
      title: "TestPolymartPlugin",
      owner: { name: "PolyDev", id: 10, type: "user", url: "" },
      price: 0,
      currency: "USD",
      downloads: 600,
      thumbnailURL: null,
      reviews: { count: 45, stars: 4.0 }
    }
  }
});

// ---------------------------------------------------------------------------
// Contract shape validator
// ---------------------------------------------------------------------------

const assertNormalizedShape = (data: ResourceBannerData, expectedBackend: string): void => {
  // Top-level fields only
  const topLevelKeys = Object.keys(data).sort();
  expect(topLevelKeys).toEqual(["author", "backend", "resource"]);

  // resource sub-fields only
  const resourceKeys = Object.keys(data.resource).sort();
  expect(resourceKeys).toEqual([
    "downloadCount",
    "lastUpdated",
    "logoBase64",
    "name",
    "price",
    "rating"
  ]);

  // author sub-fields only
  const authorKeys = Object.keys(data.author).sort();
  expect(authorKeys).toEqual(["name"]);

  // backend value
  expect(data.backend).toBe(expectedBackend);

  // types
  expect(typeof data.resource.name).toBe("string");
  expect(typeof data.resource.downloadCount).toBe("number");
  expect(data.resource.logoBase64 === null || typeof data.resource.logoBase64 === "string").toBe(
    true
  );
  expect(data.resource.lastUpdated === null || typeof data.resource.lastUpdated === "string").toBe(
    true
  );
  expect(typeof data.resource.rating.count).toBe("number");
  expect(
    data.resource.rating.average === null || typeof data.resource.rating.average === "number"
  ).toBe(true);
  expect(typeof data.author.name).toBe("string");
};

// ---------------------------------------------------------------------------
// Spigot
// ---------------------------------------------------------------------------

describe("SpigotResourceClient contract", () => {
  const nominal = makeMockFetch({ [SPIGOT_URL]: { status: 200, body: SPIGOT_NOMINAL } });

  it("nominal response has correct shape and backend=SPIGOT", async () => {
    const client: ResourceClient = new SpigotResourceClient({}, nominal);
    const data = await client.getResourceBannerData("1");
    expect(data).not.toBeNull();
    assertNormalizedShape(data!, "SPIGOT");
    expect(data?.resource.name).toBe("TestSpigotPlugin");
    expect(data?.author.name).toBe("SpigotDev");
  });

  it("returns null on upstream 404", async () => {
    const client: ResourceClient = new SpigotResourceClient({}, alwaysNotFound);
    expect(await client.getResourceBannerData("1")).toBeNull();
  });

  it("returns null on malformed upstream JSON", async () => {
    const client: ResourceClient = new SpigotResourceClient({}, alwaysMalformed);
    expect(await client.getResourceBannerData("1")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Modrinth
// ---------------------------------------------------------------------------

describe("ModrinthResourceClient contract", () => {
  const nominal = makeMockFetch({
    [MODRINTH_PROJECT_URL]: { status: 200, body: MODRINTH_PROJECT },
    [MODRINTH_MEMBERS_URL]: { status: 200, body: MODRINTH_MEMBERS }
  });

  it("nominal response has correct shape and backend=MODRINTH", async () => {
    const client: ResourceClient = new ModrinthResourceClient({}, nominal);
    const data = await client.getResourceBannerData("test-mod");
    expect(data).not.toBeNull();
    assertNormalizedShape(data!, "MODRINTH");
    expect(data?.resource.name).toBe("TestModrinthMod");
    expect(data?.author.name).toBe("ModrinthDev");
  });

  it("returns null on upstream 404 for project", async () => {
    const client: ResourceClient = new ModrinthResourceClient({}, alwaysNotFound);
    expect(await client.getResourceBannerData("test-mod")).toBeNull();
  });

  it("returns null on malformed upstream JSON", async () => {
    const client: ResourceClient = new ModrinthResourceClient({}, alwaysMalformed);
    expect(await client.getResourceBannerData("test-mod")).toBeNull();
  });

  it("returns null when members endpoint returns empty array (no author)", async () => {
    const noMembers = makeMockFetch({
      [MODRINTH_PROJECT_URL]: { status: 200, body: MODRINTH_PROJECT },
      [MODRINTH_MEMBERS_URL]: { status: 200, body: "[]" }
    });
    const client: ResourceClient = new ModrinthResourceClient({}, noMembers);
    expect(await client.getResourceBannerData("test-mod")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CurseForge
// ---------------------------------------------------------------------------

describe("CurseForgeResourceClient contract", () => {
  const nominal = makeMockFetch({ [CF_URL]: { status: 200, body: CF_NOMINAL } });

  it("nominal response has correct shape and backend=CURSEFORGE", async () => {
    const client: ResourceClient = new CurseForgeResourceClient({}, nominal);
    const data = await client.getResourceBannerData("99");
    expect(data).not.toBeNull();
    assertNormalizedShape(data!, "CURSEFORGE");
    expect(data?.resource.name).toBe("TestCfPlugin");
    expect(data?.author.name).toBe("CfDev");
    // CurseForge: rating is always { count: 0, average: 0 }
    expect(data?.resource.rating).toEqual({ count: 0, average: 0 });
  });

  it("returns null on upstream 404", async () => {
    const client: ResourceClient = new CurseForgeResourceClient({}, alwaysNotFound);
    expect(await client.getResourceBannerData("99")).toBeNull();
  });

  it("returns null on malformed upstream JSON", async () => {
    const client: ResourceClient = new CurseForgeResourceClient({}, alwaysMalformed);
    expect(await client.getResourceBannerData("99")).toBeNull();
  });

  it("returns null when no Owner member exists in members array", async () => {
    const noOwner = makeMockFetch({
      [CF_URL]: {
        status: 200,
        body: JSON.stringify({
          id: 99,
          title: "Orphan",
          thumbnail: "",
          downloads: { monthly: 0, total: 0 },
          download: { uploaded_at: "" },
          members: [{ id: 9, title: "Contributor", username: "NotOwner" }]
        })
      }
    });
    const client: ResourceClient = new CurseForgeResourceClient({}, noOwner);
    expect(await client.getResourceBannerData("99")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Hangar
// ---------------------------------------------------------------------------

describe("HangarResourceClient contract", () => {
  const nominal = makeMockFetch({ [HANGAR_URL]: { status: 200, body: HANGAR_NOMINAL } });

  it("nominal response has correct shape and backend=HANGAR", async () => {
    const client: ResourceClient = new HangarResourceClient({}, nominal);
    const data = await client.getResourceBannerData("hangarorg/hangar-proj");
    expect(data).not.toBeNull();
    assertNormalizedShape(data!, "HANGAR");
    expect(data?.resource.name).toBe("TestHangarPlugin");
    expect(data?.author.name).toBe("hangarorg");
    // Hangar: rating.count = stars, rating.average = 0
    expect(data?.resource.rating).toEqual({ count: 15, average: 0 });
  });

  it("returns null on upstream 404", async () => {
    const client: ResourceClient = new HangarResourceClient({}, alwaysNotFound);
    expect(await client.getResourceBannerData("hangarorg/hangar-proj")).toBeNull();
  });

  it("returns null on malformed upstream JSON", async () => {
    const client: ResourceClient = new HangarResourceClient({}, alwaysMalformed);
    expect(await client.getResourceBannerData("hangarorg/hangar-proj")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Ore
// ---------------------------------------------------------------------------

describe("OreResourceClient contract", () => {
  const nominal = makeMockFetch({
    [ORE_AUTH_URL]: { status: 200, body: ORE_SESSION },
    [ORE_PROJECT_URL]: { status: 200, body: ORE_PROJECT }
  });

  it("nominal response has correct shape and backend=ORE", async () => {
    const client: ResourceClient = new OreResourceClient({}, nominal);
    const data = await client.getResourceBannerData("ore-plugin");
    expect(data).not.toBeNull();
    assertNormalizedShape(data!, "ORE");
    expect(data?.resource.name).toBe("TestOrePlugin");
    expect(data?.author.name).toBe("oredev");
    // Ore: rating.average = null (Java parity)
    expect(data?.resource.rating.average).toBeNull();
    // Ore: lastUpdated = null (Java parity — even though last_updated field exists)
    expect(data?.resource.lastUpdated).toBeNull();
  });

  it("returns null when session auth fails", async () => {
    const authFails = makeMockFetch({ [ORE_AUTH_URL]: { status: 401, body: "" } });
    const client: ResourceClient = new OreResourceClient({}, authFails);
    expect(await client.getResourceBannerData("ore-plugin")).toBeNull();
  });

  it("returns null on project 404", async () => {
    const projectMissing = makeMockFetch({
      [ORE_AUTH_URL]: { status: 200, body: ORE_SESSION },
      [ORE_PROJECT_URL]: { status: 404, body: "" }
    });
    const client: ResourceClient = new OreResourceClient({}, projectMissing);
    expect(await client.getResourceBannerData("ore-plugin")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// BuiltByBit
// ---------------------------------------------------------------------------

describe("BuiltByBitResourceClient contract", () => {
  const nominal = makeMockFetch({
    [BBB_RESOURCE_URL]: { status: 200, body: BBB_RESOURCE },
    [BBB_MEMBER_URL]: { status: 200, body: BBB_MEMBER }
  });

  it("nominal response has correct shape and backend=BUILTBYBIT", async () => {
    const client: ResourceClient = new BuiltByBitResourceClient({ apiKey: "test" }, nominal);
    const data = await client.getResourceBannerData("55");
    expect(data).not.toBeNull();
    assertNormalizedShape(data!, "BUILTBYBIT");
    expect(data?.resource.name).toBe("TestBbbPlugin");
    expect(data?.author.name).toBe("BbbDev");
    // BBB: logo is always null (Java parity)
    expect(data?.resource.logoBase64).toBeNull();
    // BBB: lastUpdated is always null (Java parity)
    expect(data?.resource.lastUpdated).toBeNull();
  });

  it("returns null on upstream 404 for resource", async () => {
    const client: ResourceClient = new BuiltByBitResourceClient({ apiKey: "test" }, alwaysNotFound);
    expect(await client.getResourceBannerData("55")).toBeNull();
  });

  it("returns null when member/author lookup fails (404)", async () => {
    const memberFails = makeMockFetch({
      [BBB_RESOURCE_URL]: { status: 200, body: BBB_RESOURCE },
      [BBB_MEMBER_URL]: { status: 404, body: "" }
    });
    const client: ResourceClient = new BuiltByBitResourceClient({ apiKey: "test" }, memberFails);
    expect(await client.getResourceBannerData("55")).toBeNull();
  });

  it("returns null on malformed upstream JSON", async () => {
    const client: ResourceClient = new BuiltByBitResourceClient(
      { apiKey: "test" },
      alwaysMalformed
    );
    expect(await client.getResourceBannerData("55")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Polymart
// ---------------------------------------------------------------------------

describe("PolymartResourceClient contract", () => {
  const nominal = makeMockFetch({ [POLYMART_URL]: { status: 200, body: POLYMART_NOMINAL } });

  it("nominal response has correct shape and backend=POLYMART", async () => {
    const client: ResourceClient = new PolymartResourceClient({}, nominal);
    const data = await client.getResourceBannerData("77");
    expect(data).not.toBeNull();
    assertNormalizedShape(data!, "POLYMART");
    expect(data?.resource.name).toBe("TestPolymartPlugin");
    expect(data?.author.name).toBe("PolyDev");
    // Polymart: lastUpdated = null (Java parity)
    expect(data?.resource.lastUpdated).toBeNull();
  });

  it("returns null on upstream 404", async () => {
    const client: ResourceClient = new PolymartResourceClient({}, alwaysNotFound);
    expect(await client.getResourceBannerData("77")).toBeNull();
  });

  it("returns null on malformed upstream JSON", async () => {
    const client: ResourceClient = new PolymartResourceClient({}, alwaysMalformed);
    expect(await client.getResourceBannerData("77")).toBeNull();
  });
});
