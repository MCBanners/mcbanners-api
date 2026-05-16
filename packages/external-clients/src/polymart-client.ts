import { z } from "zod";
import type {
  AuthorBannerData,
  ResourceBannerData,
  TeamBannerData
} from "@mcbanners/banner-renderer";
import type { AuthorClient, ResourceClient, TeamClient } from "./resource-client";
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

const PolymartAuthorSchema = z.object({
  response: z.object({
    user: z
      .object({
        id: z.number(),
        username: z.string(),
        type: z.string().default("user"),
        profilePictureURL: z.string().nullable().default(null),
        statistics: z.object({
          resourceCount: z.number().default(0),
          resourceDownloads: z.number().default(0),
          resourceRatings: z.number().default(0),
          resourceAverageRating: z.number().default(0)
        })
      })
      .optional(),
    team: z
      .object({
        id: z.number(),
        username: z.string(),
        type: z.string().default("team"),
        profilePictureURL: z.string().nullable().default(null),
        statistics: z.object({
          resourceCount: z.number().default(0),
          resourceDownloads: z.number().default(0),
          resourceRatings: z.number().default(0),
          resourceAverageRating: z.number().default(0)
        })
      })
      .optional()
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
export class PolymartResourceClient implements ResourceClient, AuthorClient, TeamClient {
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

  async getAuthorBannerData(id: string): Promise<AuthorBannerData | null> {
    const authorId = normalizeResourceId("POLYMART", id);
    const data = await fetchJson(
      `${POLYMART_BASE_URL}getAccountInfo/?user_id=${encodeURIComponent(authorId)}`,
      PolymartAuthorSchema,
      this.options,
      this.fetchFn
    );
    if (data === null) return null;

    const author = data.response.user ?? data.response.team;
    if (author === undefined) return null;

    const logoBase64 = author.profilePictureURL
      ? await fetchImageBase64(author.profilePictureURL, this.options, this.fetchFn)
      : null;

    return {
      author: {
        name: author.username,
        resourceCount: author.statistics.resourceCount,
        logoBase64,
        downloadCount: author.statistics.resourceDownloads,
        likes: null,
        reviews: author.statistics.resourceRatings
      },
      backend: "POLYMART"
    };
  }

  async getTeamBannerData(id: string): Promise<TeamBannerData | null> {
    const teamId = normalizeResourceId("POLYMART", id);
    const data = await fetchJson(
      `${POLYMART_BASE_URL}getAccountInfo/?team_id=${encodeURIComponent(teamId)}`,
      PolymartAuthorSchema,
      this.options,
      this.fetchFn
    );
    if (data === null) return null;

    const team = data.response.team ?? data.response.user;
    if (team === undefined) return null;

    const logoBase64 = team.profilePictureURL
      ? await fetchImageBase64(team.profilePictureURL, this.options, this.fetchFn)
      : null;

    return {
      team: {
        name: team.username,
        logoBase64,
        resourceCount: team.statistics.resourceCount,
        resourceDownloads: team.statistics.resourceDownloads,
        resourceRatings: team.statistics.resourceRatings,
        resourceAverageRating: team.statistics.resourceAverageRating
      }
    };
  }
}

export class PolymartTeamClient extends PolymartResourceClient {}
