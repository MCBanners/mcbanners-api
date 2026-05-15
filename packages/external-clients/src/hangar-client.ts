import { z } from "zod";
import type { ResourceBannerData } from "@mcbanners/banner-renderer";
import type { ResourceClient } from "./resource-client";
import { fetchJson, fetchImageBase64, type FetchFn, type HttpClientOptions } from "./http-client";

const HANGAR_BASE_URL = "https://hangar.papermc.io/api/v1";

const HangarProjectSchema = z.object({
  name: z.string(),
  namespace: z.object({
    owner: z.string(),
    slug: z.string()
  }),
  stats: z.object({
    stars: z.number().default(0),
    downloads: z.number().default(0),
    views: z.number().default(0)
  }),
  lastUpdated: z.string().default(""),
  avatarUrl: z.string().nullable().optional()
});

/**
 * Hangar resource client.
 *
 * Resource IDs use the "author/slug" format (e.g. "papermc/eternal-light").
 * The Hangar API endpoint is: GET /api/v1/projects/{author}/{slug}.
 *
 * Java parity notes:
 * - rating.count = project.stats.stars  (Java: new RatingInformation(stars, 0.0))
 * - rating.average = 0  (Java: 0.0, not null — layout excludes HANGAR from star icons anyway)
 * - lastUpdated = project.lastUpdated (ISO 8601)
 * - author name = namespace.owner
 */
export class HangarResourceClient implements ResourceClient {
  constructor(
    private readonly options: HttpClientOptions = {},
    private readonly fetchFn: FetchFn = fetch
  ) {}

  async getResourceBannerData(id: string): Promise<ResourceBannerData | null> {
    // id is expected in "author/slug" format; the slash is meaningful in the path.
    const project = await fetchJson(
      `${HANGAR_BASE_URL}/projects/${id}`,
      HangarProjectSchema,
      this.options,
      this.fetchFn
    );
    if (project === null) return null;

    const avatarUrl = project.avatarUrl ?? null;
    const logoBase64 = avatarUrl
      ? await fetchImageBase64(avatarUrl, this.options, this.fetchFn)
      : null;

    // Java: avatar fallback to "" (empty string) instead of null; we use null.
    const lastUpdated = project.lastUpdated || null;

    return {
      resource: {
        name: project.name,
        logoBase64: logoBase64 ?? null,
        downloadCount: project.stats.downloads,
        lastUpdated,
        rating: { count: project.stats.stars, average: 0 },
        price: null
      },
      author: { name: project.namespace.owner },
      backend: "HANGAR"
    };
  }
}
