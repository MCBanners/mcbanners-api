import { z } from "zod";
import type { ResourceBannerData } from "@mcbanners/banner-renderer";
import type { ResourceClient } from "./resource-client";
import { fetchJson, type FetchFn, type HttpClientOptions } from "./http-client";

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
export class BuiltByBitResourceClient implements ResourceClient {
  private readonly apiKey: string;

  constructor(
    private readonly options: BuiltByBitClientOptions = {},
    private readonly fetchFn: FetchFn = fetch
  ) {
    this.apiKey = options.apiKey ?? "";
  }

  async getResourceBannerData(id: string): Promise<ResourceBannerData | null> {
    const authFetch = this.makeAuthFetchFn();

    const resource = await fetchJson(
      `${BBB_BASE_URL}resources/${encodeURIComponent(id)}`,
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
