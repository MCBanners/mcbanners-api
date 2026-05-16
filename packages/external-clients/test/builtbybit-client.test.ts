import { describe, it, expect } from "bun:test";
import { BuiltByBitResourceClient } from "../src/builtbybit-client";
import type { FetchFn } from "../src/http-client";

const BBB_BASE = "https://api.builtbybit.com/v1/";

interface MockResponse {
  status: number;
  body: string;
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

const NOMINAL_RESOURCE_JSON = JSON.stringify({
  data: {
    resource_id: 12345,
    author_id: 99,
    title: "MyPlugin",
    price: 0.0,
    currency: "USD",
    purchase_count: 0,
    download_count: 3200,
    review_count: 42,
    review_average: 4.7
  }
});

const PREMIUM_RESOURCE_JSON = JSON.stringify({
  data: {
    resource_id: 55555,
    author_id: 88,
    title: "PremiumPlugin",
    price: 9.99,
    currency: "usd",
    purchase_count: 500,
    download_count: 0,
    review_count: 120,
    review_average: 4.9
  }
});

const NOMINAL_MEMBER_JSON = JSON.stringify({
  data: {
    member_id: 99,
    username: "DevUser",
    resource_count: 5,
    join_date: 1_715_731_200,
    premium: true,
    supreme: false,
    ultimate: false,
    avatar_url: "https://builtbybit.com/avatars/99.jpg",
    post_count: 1250,
    feedback_positive: 40,
    feedback_negative: 5
  }
});

const TINY_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("BuiltByBitResourceClient", () => {
  // ---- nominal free resource ----

  it("returns ResourceBannerData for a free resource", async () => {
    const mockFetch = makeMockFetch({
      [`${BBB_BASE}resources/12345`]: { status: 200, body: NOMINAL_RESOURCE_JSON },
      [`${BBB_BASE}members/99`]: { status: 200, body: NOMINAL_MEMBER_JSON }
    });

    const client = new BuiltByBitResourceClient({ apiKey: "test-key" }, mockFetch);
    const result = await client.getResourceBannerData("12345");

    expect(result).not.toBeNull();
    expect(result?.resource.name).toBe("MyPlugin");
    expect(result?.resource.logoBase64).toBeNull();
    expect(result?.resource.downloadCount).toBe(3200);
    expect(result?.resource.lastUpdated).toBeNull();
    expect(result?.resource.rating).toEqual({ count: 42, average: 4.7 });
    expect(result?.resource.price).toBeNull();
    expect(result?.author.name).toBe("DevUser");
    expect(result?.backend).toBe("BUILTBYBIT");
  });

  // ---- premium resource ----

  it("uses purchase_count and price for premium resources", async () => {
    const premiumMember = JSON.stringify({
      data: { member_id: 88, username: "PremDev", resource_count: 3, avatar_url: "" }
    });
    const mockFetch = makeMockFetch({
      [`${BBB_BASE}resources/55555`]: { status: 200, body: PREMIUM_RESOURCE_JSON },
      [`${BBB_BASE}members/88`]: { status: 200, body: premiumMember }
    });

    const client = new BuiltByBitResourceClient({ apiKey: "test-key" }, mockFetch);
    const result = await client.getResourceBannerData("55555");

    expect(result).not.toBeNull();
    expect(result?.resource.downloadCount).toBe(500);
    expect(result?.resource.price).toEqual({ amount: 9.99, currency: "USD" });
  });

  it("uppercases currency for premium resources", async () => {
    const premiumMember = JSON.stringify({
      data: { member_id: 88, username: "PremDev", resource_count: 1, avatar_url: "" }
    });
    const mockFetch = makeMockFetch({
      [`${BBB_BASE}resources/55555`]: { status: 200, body: PREMIUM_RESOURCE_JSON },
      [`${BBB_BASE}members/88`]: { status: 200, body: premiumMember }
    });

    const client = new BuiltByBitResourceClient({ apiKey: "test-key" }, mockFetch);
    const result = await client.getResourceBannerData("55555");

    expect(result?.resource.price?.currency).toBe("USD");
  });

  // ---- logo is always null ----

  it("logoBase64 is always null (Java: no icon fetch for BBB resources)", async () => {
    const mockFetch = makeMockFetch({
      [`${BBB_BASE}resources/12345`]: { status: 200, body: NOMINAL_RESOURCE_JSON },
      [`${BBB_BASE}members/99`]: { status: 200, body: NOMINAL_MEMBER_JSON }
    });

    const client = new BuiltByBitResourceClient({ apiKey: "test-key" }, mockFetch);
    const result = await client.getResourceBannerData("12345");

    expect(result?.resource.logoBase64).toBeNull();
  });

  // ---- auth header injection ----

  it("injects Authorization: Private {key} header", async () => {
    const capturedHeaders: string[] = [];

    const capturingFetch: FetchFn = (input, init) => {
      const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;
      if (init?.headers instanceof Headers) {
        const auth = init.headers.get("Authorization");
        if (auth !== null) capturedHeaders.push(auth);
      }
      if (url.includes("/resources/")) {
        return Promise.resolve(new Response(NOMINAL_RESOURCE_JSON, { status: 200 }));
      }
      if (url.includes("/members/")) {
        return Promise.resolve(new Response(NOMINAL_MEMBER_JSON, { status: 200 }));
      }
      throw new Error(`Unmocked URL: ${url}`);
    };

    const client = new BuiltByBitResourceClient({ apiKey: "my-secret-key" }, capturingFetch);
    await client.getResourceBannerData("12345");

    expect(capturedHeaders.every((h) => h === "Private my-secret-key")).toBe(true);
    expect(capturedHeaders.length).toBe(2); // resource + member
  });

  // ---- null on not-found ----

  it("returns null when resource returns 404", async () => {
    const mockFetch = makeMockFetch({
      [`${BBB_BASE}resources/99999`]: { status: 404, body: "" }
    });

    const client = new BuiltByBitResourceClient({ apiKey: "test-key" }, mockFetch);
    const result = await client.getResourceBannerData("99999");

    expect(result).toBeNull();
  });

  it("returns null when resource returns 401 (bad/missing key)", async () => {
    const mockFetch = makeMockFetch({
      [`${BBB_BASE}resources/12345`]: {
        status: 401,
        body: JSON.stringify({ error: "Unauthorized" })
      }
    });

    const client = new BuiltByBitResourceClient({}, mockFetch);
    const result = await client.getResourceBannerData("12345");

    expect(result).toBeNull();
  });

  it("returns null when member (author) returns 404", async () => {
    const mockFetch = makeMockFetch({
      [`${BBB_BASE}resources/12345`]: { status: 200, body: NOMINAL_RESOURCE_JSON },
      [`${BBB_BASE}members/99`]: { status: 404, body: "" }
    });

    const client = new BuiltByBitResourceClient({ apiKey: "test-key" }, mockFetch);
    const result = await client.getResourceBannerData("12345");

    expect(result).toBeNull();
  });

  // ---- malformed JSON ----

  it("returns null for malformed resource JSON", async () => {
    const mockFetch = makeMockFetch({
      [`${BBB_BASE}resources/12345`]: { status: 200, body: "not json" }
    });

    const client = new BuiltByBitResourceClient({ apiKey: "test-key" }, mockFetch);
    const result = await client.getResourceBannerData("12345");

    expect(result).toBeNull();
  });

  it("returns null for malformed member JSON", async () => {
    const mockFetch = makeMockFetch({
      [`${BBB_BASE}resources/12345`]: { status: 200, body: NOMINAL_RESOURCE_JSON },
      [`${BBB_BASE}members/99`]: { status: 200, body: '{"wrong":"shape"}' }
    });

    const client = new BuiltByBitResourceClient({ apiKey: "test-key" }, mockFetch);
    const result = await client.getResourceBannerData("12345");

    expect(result).toBeNull();
  });

  it("returns MemberBannerData for a BuiltByBit member", async () => {
    const mockFetch = makeMockFetch({
      [`${BBB_BASE}members/99`]: { status: 200, body: NOMINAL_MEMBER_JSON },
      "https://builtbybit.com/avatars/99.jpg": {
        status: 200,
        body: String.fromCharCode(...TINY_PNG)
      }
    });

    const client = new BuiltByBitResourceClient({ apiKey: "test-key" }, mockFetch);
    const result = await client.getMemberBannerData("99");

    expect(result).not.toBeNull();
    expect(result?.member.name).toBe("DevUser");
    expect(result?.member.rank).toBe("Premium");
    expect(result?.member.joinDate).toBe("5/15/2024");
    expect(result?.member.posts).toBe(1250);
    expect(result?.member.positiveFeedback).toBe(40);
    expect(result?.member.negativeFeedback).toBe(5);
    expect(result?.member.logoBase64).not.toBeNull();
  });

  it("returns null for missing BuiltByBit members", async () => {
    const mockFetch = makeMockFetch({
      [`${BBB_BASE}members/404`]: { status: 404, body: "" }
    });

    const client = new BuiltByBitResourceClient({ apiKey: "test-key" }, mockFetch);
    expect(await client.getMemberBannerData("404")).toBeNull();
  });

  it("keeps BuiltByBit member avatar failures non-fatal", async () => {
    const mockFetch = makeMockFetch({
      [`${BBB_BASE}members/99`]: { status: 200, body: NOMINAL_MEMBER_JSON },
      "https://builtbybit.com/avatars/99.jpg": { status: 500, body: "" }
    });

    const client = new BuiltByBitResourceClient({ apiKey: "test-key" }, mockFetch);
    const result = await client.getMemberBannerData("99");

    expect(result).not.toBeNull();
    expect(result?.member.logoBase64).toBeNull();
  });
});
