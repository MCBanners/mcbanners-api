import { describe, it, expect } from "bun:test";
import { SpigotResourceClient } from "../src/spigot-client";
import type { FetchFn } from "../src/http-client";

/** Creates a mock fetch that returns predefined responses by URL. */
const makeMockFetch =
  (responses: Record<string, { status: number; body: string | Uint8Array }>): FetchFn =>
  (input) => {
    const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;
    const resp = responses[url];
    if (resp === undefined) throw new Error(`Unmocked URL: ${url}`);
    return Promise.resolve(new Response(resp.body, { status: resp.status }));
  };

const SPIGOT_BASE = "https://api.spigotmc.org/simple/0.2/index.php?action=getResource&id=";
const SPIGOT_ACTION_BASE = "https://api.spigotmc.org/simple/0.2/index.php?action=";

const FREE_RESOURCE_JSON = JSON.stringify({
  id: "12345",
  title: "EssentialsX",
  tag: "Essential commands",
  current_version: "2.21.0",
  icon_link: "https://static.spigotmc.org/img/essentials.png?v=1",
  premium: { price: "0.00", currency: "" },
  stats: {
    downloads: "500",
    updates: "20",
    rating: "4.5",
    reviews: { unique: "200", total: "210" }
  },
  author: { id: "1", username: "md_5" }
});

const PREMIUM_RESOURCE_JSON = JSON.stringify({
  id: "9999",
  title: "LiteBans",
  tag: "Ban plugin",
  current_version: "3.0",
  icon_link: "",
  premium: { price: "9.99", currency: "usd" },
  stats: {
    downloads: "85000",
    updates: "50",
    rating: "4.75",
    reviews: { unique: "730", total: "750" }
  },
  author: { id: "2", username: "Ruany" }
});

const AUTHOR_JSON = JSON.stringify({
  id: "1",
  username: "md_5",
  resource_count: "3",
  resourceCount: "3",
  avatar: "https://static.spigotmc.org/img/md_5.png?v=1"
});

const authorResource = (id: string, downloads: string, reviews: string) => ({
  id,
  title: `Plugin ${id}`,
  tag: "",
  current_version: "1.0",
  icon_link: "",
  premium: { price: "0.00", currency: "" },
  stats: {
    downloads,
    updates: "0",
    rating: "0",
    reviews: { unique: reviews, total: reviews }
  },
  author: { id: "1", username: "md_5" }
});

const TINY_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("SpigotResourceClient", () => {
  it("returns ResourceBannerData for a nominal free resource", async () => {
    const mockFetch = makeMockFetch({
      [`${SPIGOT_BASE}12345`]: { status: 200, body: FREE_RESOURCE_JSON },
      "https://static.spigotmc.org/img/essentials.png": { status: 200, body: TINY_PNG }
    });

    const client = new SpigotResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("12345");

    expect(result).not.toBeNull();
    expect(result?.resource.name).toBe("EssentialsX");
    expect(result?.resource.downloadCount).toBe(500);
    expect(result?.resource.rating.average).toBe(4.5);
    expect(result?.resource.rating.count).toBe(200);
    expect(result?.resource.price).toBeNull();
    expect(result?.resource.lastUpdated).toBeNull();
    expect(result?.resource.logoBase64).not.toBeNull();
    expect(result?.author.name).toBe("md_5");
    expect(result?.backend).toBe("SPIGOT");
  });

  it("strips query string from icon_link before fetching", async () => {
    const fetchedUrls: string[] = [];
    const mockFetch: FetchFn = (input) => {
      const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;
      fetchedUrls.push(url);
      if (url === `${SPIGOT_BASE}12345`)
        return Promise.resolve(new Response(FREE_RESOURCE_JSON, { status: 200 }));
      if (url === "https://static.spigotmc.org/img/essentials.png")
        return Promise.resolve(new Response(TINY_PNG, { status: 200 }));
      throw new Error(`Unexpected URL: ${url}`);
    };

    const client = new SpigotResourceClient({}, mockFetch);
    await client.getResourceBannerData("12345");

    expect(fetchedUrls).toContain("https://static.spigotmc.org/img/essentials.png");
    expect(fetchedUrls.some((u) => u.includes("?v=1"))).toBe(false);
  });

  it("returns correct data for a premium resource", async () => {
    const mockFetch = makeMockFetch({
      [`${SPIGOT_BASE}9999`]: { status: 200, body: PREMIUM_RESOURCE_JSON }
    });

    const client = new SpigotResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("9999");

    expect(result).not.toBeNull();
    expect(result?.resource.price).toEqual({ amount: 9.99, currency: "USD" });
    expect(result?.resource.logoBase64).toBeNull();
    expect(result?.resource.downloadCount).toBe(85000);
    expect(result?.resource.rating.average).toBe(4.75);
    expect(result?.resource.rating.count).toBe(730);
    expect(result?.author.name).toBe("Ruany");
  });

  it("returns null logoBase64 when icon_link is empty", async () => {
    const mockFetch = makeMockFetch({
      [`${SPIGOT_BASE}9999`]: { status: 200, body: PREMIUM_RESOURCE_JSON }
    });

    const client = new SpigotResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("9999");
    expect(result?.resource.logoBase64).toBeNull();
  });

  it("returns null on 404 response", async () => {
    const mockFetch = makeMockFetch({
      [`${SPIGOT_BASE}99999`]: { status: 404, body: "" }
    });

    const client = new SpigotResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("99999");
    expect(result).toBeNull();
  });

  it("returns null on malformed JSON", async () => {
    const mockFetch = makeMockFetch({
      [`${SPIGOT_BASE}bad`]: { status: 200, body: "not valid json{{" }
    });

    const client = new SpigotResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("bad");
    expect(result).toBeNull();
  });

  it("returns null when image fetch fails", async () => {
    const freeWithIcon = JSON.stringify({
      id: "1",
      title: "PluginX",
      tag: "",
      current_version: "1.0",
      icon_link: "https://static.spigotmc.org/img/pluginx.png",
      premium: { price: "0.00", currency: "" },
      stats: {
        downloads: "100",
        updates: "5",
        rating: "3.0",
        reviews: { unique: "10", total: "10" }
      },
      author: { id: "3", username: "Dev" }
    });

    const mockFetch = makeMockFetch({
      [`${SPIGOT_BASE}1`]: { status: 200, body: freeWithIcon },
      "https://static.spigotmc.org/img/pluginx.png": { status: 500, body: "" }
    });

    const client = new SpigotResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("1");
    expect(result).not.toBeNull();
    expect(result?.resource.logoBase64).toBeNull();
  });

  it("aggregates Spigot author resources across all pages until an empty page", async () => {
    const fetchedUrls: string[] = [];
    const mockFetch: FetchFn = (input) => {
      const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;
      fetchedUrls.push(url);

      if (url === `${SPIGOT_ACTION_BASE}getAuthor&id=1`) {
        return Promise.resolve(new Response(AUTHOR_JSON, { status: 200 }));
      }
      if (url === `${SPIGOT_ACTION_BASE}getResourcesByAuthor&id=1&page=1`) {
        return Promise.resolve(
          new Response(
            JSON.stringify([authorResource("a", "10", "2"), authorResource("b", "25", "4")]),
            { status: 200 }
          )
        );
      }
      if (url === `${SPIGOT_ACTION_BASE}getResourcesByAuthor&id=1&page=2`) {
        return Promise.resolve(
          new Response(JSON.stringify([authorResource("c", "15", "1")]), { status: 200 })
        );
      }
      if (url === `${SPIGOT_ACTION_BASE}getResourcesByAuthor&id=1&page=3`) {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      }
      if (url === "https://static.spigotmc.org/img/md_5.png") {
        return Promise.resolve(new Response(TINY_PNG, { status: 200 }));
      }

      throw new Error(`Unexpected URL: ${url}`);
    };

    const client = new SpigotResourceClient({}, mockFetch);
    const result = await client.getAuthorBannerData("1");

    expect(result).not.toBeNull();
    expect(result?.author.name).toBe("md_5");
    expect(result?.author.resourceCount).toBe(3);
    expect(result?.author.downloadCount).toBe(50);
    expect(result?.author.reviews).toBe(7);
    expect(result?.author.logoBase64).not.toBeNull();
    expect(result?.author.likes).toBeNull();
    expect(fetchedUrls).toContain(`${SPIGOT_ACTION_BASE}getResourcesByAuthor&id=1&page=3`);
  });

  it("returns a Spigot author with zero totals when the first resource page is empty", async () => {
    const mockFetch = makeMockFetch({
      [`${SPIGOT_ACTION_BASE}getAuthor&id=1`]: { status: 200, body: AUTHOR_JSON },
      [`${SPIGOT_ACTION_BASE}getResourcesByAuthor&id=1&page=1`]: {
        status: 200,
        body: JSON.stringify([])
      },
      "https://static.spigotmc.org/img/md_5.png": { status: 500, body: "" }
    });

    const client = new SpigotResourceClient({}, mockFetch);
    const result = await client.getAuthorBannerData("1");

    expect(result).not.toBeNull();
    expect(result?.author.resourceCount).toBe(3);
    expect(result?.author.downloadCount).toBe(0);
    expect(result?.author.reviews).toBe(0);
    expect(result?.author.logoBase64).toBeNull();
  });

  it("returns null when a Spigot author resource page is malformed", async () => {
    const mockFetch = makeMockFetch({
      [`${SPIGOT_ACTION_BASE}getAuthor&id=1`]: { status: 200, body: AUTHOR_JSON },
      [`${SPIGOT_ACTION_BASE}getResourcesByAuthor&id=1&page=1`]: {
        status: 200,
        body: JSON.stringify([authorResource("a", "10", "2")])
      },
      [`${SPIGOT_ACTION_BASE}getResourcesByAuthor&id=1&page=2`]: {
        status: 200,
        body: "not-json"
      }
    });

    const client = new SpigotResourceClient({}, mockFetch);
    const result = await client.getAuthorBannerData("1");

    expect(result).toBeNull();
  });
});
