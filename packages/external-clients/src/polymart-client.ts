import { z } from "zod";
import type { ResourceBannerData } from "@mcbanners/banner-renderer";
import type { ResourceClient } from "./resource-client";
import { fetchJson, fetchImageBase64, type FetchFn, type HttpClientOptions } from "./http-client";
import { normalizeResourceId } from "./resource-id";

const POLYMART_BASE_URL = "https://api.polymart.org/v1/";

/**
 * Polymart API v1 resource response.
 * Response is wrapped under `response.resource`.
 *
 * Java: PolymartResourceDeserializer — reads `response.resource.*` and
 * `response.resource.owner.*` and `response.resource.reviews.*`.
 *
 * `thumbnailURL` may be null or absent; defaults to null.
 */
const PolymartResourceSchema = z.object({
  response: z.object({
    resource: z.object({
      id: z.number(),
      title: z.string(),
      owner: z.object({
        name: z.string(),
        id: z.number(),
        type: z.string(),
        url: z.string()
      }),
      price: z.number(),
      currency: z.string(),
      downloads: z.number(),
      thumbnailURL: z.string().nullable().default(null),
      reviews: z.object({
        count: z.number(),
        stars: z.number()
      })
    })
  })
});

/**
 * Resource banner client for Polymart (polymart.org).
 *
 * No authentication required.
 *
 * Java parity:
 * - Author name comes directly from `resource.owner.name` in the resource
 *   response — no separate author API call is made for resource banners.
 *   (The PolymartAuthorService.handle(authorId, resourceId) workaround is
 *   only used for *author* banners, not resource banners.)
 * - Logo: `thumbnailURL` fetched as base64; empty/null URL → null.
 * - `lastUpdated` is always null — Java passes null in that slot.
 * - Premium check: `price !== 0.0`.
 * - If premium: price info shown with `currency.toUpperCase()`.
 * - Rating: `{ count: reviews.count, average: reviews.stars }`.
 *   Java: `new RatingInformation(reviewCount, (double) resource.stars())`.
 */
export class PolymartResourceClient implements ResourceClient {
  constructor(
    private readonly options: HttpClientOptions = {},
    private readonly fetchFn: FetchFn = fetch
  ) {}

  async getResourceBannerData(id: string): Promise<ResourceBannerData | null> {
    const resourceId = normalizeResourceId("POLYMART", id);
    const data = await fetchJson(
      `${POLYMART_BASE_URL}getResourceInfo/?resource_id=${encodeURIComponent(resourceId)}`,
      PolymartResourceSchema,
      this.options,
      this.fetchFn
    );
    if (data === null) return null;

    const r = data.response.resource;
    const isPremium = r.price !== 0;

    const logoBase64 = r.thumbnailURL
      ? await fetchImageBase64(r.thumbnailURL, this.options, this.fetchFn)
      : null;

    return {
      resource: {
        name: r.title,
        logoBase64: logoBase64 ?? null,
        downloadCount: r.downloads,
        // Java: null — no lastUpdated in PolymartResourceService
        lastUpdated: null,
        // Java: new RatingInformation(reviewCount, (double) resource.stars())
        rating: { count: r.reviews.count, average: r.reviews.stars },
        price: isPremium ? { amount: r.price, currency: r.currency.toUpperCase() } : null
      },
      author: { name: r.owner.name },
      backend: "POLYMART"
    };
  }
}
