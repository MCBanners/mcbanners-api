import { z } from "zod";
import type { AuthorBannerData, ResourceBannerData } from "@mcbanners/banner-renderer";
import type { AuthorClient, ResourceClient } from "./resource-client";
import { fetchImageBase64, fetchJson, type FetchFn, type HttpClientOptions } from "./http-client";
import { normalizeResourceId } from "./resource-id";

const BBB_BASE_URL = "https://api.builtbybit.com/v1/";

/**
 * BuiltByBit API v1 resource response.
 * The real resource data is nested under a `data` key.
 *
 * Java: BuiltByBitResourceDeserializer — reads `data.resource_id`, etc.
 */
const BbbResourceSchema = z.object({
  data: z.object({
    resource_id: z.number(),
    author_id: z.number(),
    title: z.string(),
    price: z.number(),
    currency: z.string(),
    purchase_count: z.number(),
    download_count: z.number(),
    review_count: z.number(),
    review_average: z.number()
  })
});

/**
 * BuiltByBit API v1 member (author) response.
 * Java: BuiltByBitAuthorDeserializer — reads `data.member_id`, `data.username`, etc.
 */
const BbbMemberSchema = z.object({
  data: z.object({
    member_id: z.number(),
    username: z.string(),
    resource_count: z.number(),
    avatar_url: z.string()
  })
});

const BbbAuthorResourcesSchema = z.object({
  data: z.object({
    resources: z.array(BbbResourceSchema.shape.data).default([])
  })
});

export interface BuiltByBitClientOptions extends HttpClientOptions {
  /** BuiltByBit API key. Java: `@Value("${builtbybit.key}")`. */
  apiKey?: string;
}

/**
 * Resource banner client for BuiltByBit (builtbybit.com).
 *
 * Requires a BuiltByBit API key. Without a key the API returns 401 and the
 * client returns null for all resources.
 *
 * Java parity:
 * - Logo is always null — Java's BuiltByBitResourceService passes `""` as the
 *   icon argument to the Resource constructor; no image fetch is performed.
 * - `lastUpdated` is always null — Java passes null in that slot.
 * - Premium check: `price !== 0`.
 * - If premium: `downloadCount = purchase_count`, price info shown.
 * - If free: `downloadCount = download_count`, price = null.
 * - Author name comes from the member endpoint (`members/{author_id}`).
 */
export class BuiltByBitResourceClient implements ResourceClient, AuthorClient {
  private readonly apiKey: string;

  constructor(
    private readonly options: BuiltByBitClientOptions = {},
    private readonly fetchFn: FetchFn = fetch
  ) {
    this.apiKey = options.apiKey ?? "";
  }

  async getResourceBannerData(id: string): Promise<ResourceBannerData | null> {
    const authFetch = this.makeAuthFetchFn();
    const resourceId = normalizeResourceId("BUILTBYBIT", id);

    const resource = await fetchJson(
      `${BBB_BASE_URL}resources/${encodeURIComponent(resourceId)}`,
      BbbResourceSchema,
      this.options,
      authFetch
    );
    if (resource === null) return null;

    const r = resource.data;

    const member = await fetchJson(
      `${BBB_BASE_URL}members/${String(r.author_id)}`,
      BbbMemberSchema,
      this.options,
      authFetch
    );
    if (member === null) return null;

    const a = member.data;
    const isPremium = r.price !== 0;
    const downloadCount = isPremium ? r.purchase_count : r.download_count;

    return {
      resource: {
        name: r.title,
        // Java: new Resource("", ...) — no resource icon/logo is fetched
        logoBase64: null,
        downloadCount,
        // Java: null — no lastUpdated field in BBB resource response
        lastUpdated: null,
        rating: { count: r.review_count, average: r.review_average },
        price: isPremium ? { amount: r.price, currency: r.currency.toUpperCase() } : null
      },
      author: { name: a.username },
      backend: "BUILTBYBIT"
    };
  }

  async getAuthorBannerData(id: string): Promise<AuthorBannerData | null> {
    const authFetch = this.makeAuthFetchFn();
    const authorId = normalizeResourceId("BUILTBYBIT", id);
    const member = await fetchJson(
      `${BBB_BASE_URL}members/${encodeURIComponent(authorId)}`,
      BbbMemberSchema,
      this.options,
      authFetch
    );
    if (member === null) return null;

    const resources = await fetchJson(
      `${BBB_BASE_URL}resources/authors/${encodeURIComponent(authorId)}`,
      BbbAuthorResourcesSchema,
      this.options,
      authFetch
    );
    if (resources === null || resources.data.resources.length === 0) return null;

    const logoBase64 = member.data.avatar_url
      ? await fetchImageBase64(member.data.avatar_url, this.options, this.fetchFn)
      : null;
    const totals = resources.data.resources.reduce(
      (acc, resource) => ({
        downloads: acc.downloads + resource.download_count,
        reviews: acc.reviews + resource.review_count
      }),
      { downloads: 0, reviews: 0 }
    );

    return {
      author: {
        name: member.data.username,
        resourceCount: member.data.resource_count,
        logoBase64,
        downloadCount: totals.downloads,
        likes: null,
        reviews: totals.reviews
      },
      backend: "BUILTBYBIT"
    };
  }

  /** Returns a fetch wrapper that injects `Authorization: Private {key}`. */
  private makeAuthFetchFn(): FetchFn {
    const key = this.apiKey;
    const baseFetch = this.fetchFn;
    return (input, init?) => {
      const headers = new Headers();
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((v, k) => {
            headers.set(k, v);
          });
        } else {
          for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
            headers.set(k, v);
          }
        }
      }
      headers.set("Authorization", `Private ${key}`);
      return baseFetch(input, { ...init, headers });
    };
  }
}
