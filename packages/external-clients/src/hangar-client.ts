import { z } from "zod";
import type { AuthorBannerData, ResourceBannerData } from "@mcbanners/banner-renderer";
import type { AuthorClient, ResourceClient } from "./resource-client";
import { fetchJson, fetchImageBase64, type FetchFn, type HttpClientOptions } from "./http-client";
import { normalizeResourceId } from "./resource-id";

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

const HangarUserSchema = z.object({
  name: z.string(),
  projectCount: z.number().default(0),
  avatarUrl: z.string().nullable().optional()
});

const HangarProjectsSchema = z.object({
  pagination: z
    .object({
      count: z.number().default(0),
      limit: z.number().default(0),
      offset: z.number().default(0)
    })
    .optional(),
  result: z.array(HangarProjectSchema).default([])
});

const HANGAR_PROJECT_PAGE_LIMIT = 25;

const buildHangarAuthorProjectsUrl = (owner: string, offset: number): string => {
  const params = new URLSearchParams({
    owner,
    limit: String(HANGAR_PROJECT_PAGE_LIMIT),
    offset: String(offset)
  });
  return `${HANGAR_BASE_URL}/projects?${params.toString()}`;
};

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
export class HangarResourceClient implements ResourceClient, AuthorClient {
  constructor(
    private readonly options: HttpClientOptions = {},
    private readonly fetchFn: FetchFn = fetch
  ) {}

  async getResourceBannerData(id: string): Promise<ResourceBannerData | null> {
    // id is expected in "author/slug" format; the slash is meaningful in the path.
    const resourceId = normalizeResourceId("HANGAR", id);
    const project = await fetchJson(
      `${HANGAR_BASE_URL}/projects/${resourceId}`,
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

  async getAuthorBannerData(id: string): Promise<AuthorBannerData | null> {
    const username = normalizeResourceId("HANGAR", id);
    const user = await fetchJson(
      `${HANGAR_BASE_URL}/users/${encodeURIComponent(username)}`,
      HangarUserSchema,
      this.options,
      this.fetchFn
    );
    if (user === null) return null;

    const projects: z.infer<typeof HangarProjectSchema>[] = [];
    let offset = 0;
    let expectedCount = 0;

    for (;;) {
      const page = await fetchJson(
        buildHangarAuthorProjectsUrl(user.name, offset),
        HangarProjectsSchema,
        this.options,
        this.fetchFn
      );
      if (page === null) return null;
      if (offset === 0) {
        expectedCount = page.pagination?.count ?? page.result.length;
      }
      if (page.result.length === 0) break;

      projects.push(...page.result);
      offset += page.result.length;
      if (projects.length >= expectedCount) break;
    }

    if (projects.length === 0) return null;

    const logoBase64 = user.avatarUrl
      ? await fetchImageBase64(user.avatarUrl, this.options, this.fetchFn)
      : null;
    const totals = projects.reduce(
      (acc, project) => ({
        downloads: acc.downloads + project.stats.downloads,
        stars: acc.stars + project.stats.stars,
        views: acc.views + project.stats.views
      }),
      { downloads: 0, stars: 0, views: 0 }
    );

    return {
      author: {
        name: user.name,
        resourceCount: expectedCount,
        logoBase64,
        downloadCount: totals.downloads,
        likes: totals.stars,
        reviews: totals.views
      },
      backend: "HANGAR"
    };
  }
}
