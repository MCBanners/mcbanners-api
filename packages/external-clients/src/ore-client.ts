import { z } from "zod";
import type { ResourceBannerData } from "@mcbanners/banner-renderer";
import type { ResourceClient } from "./resource-client";
import { fetchJson, fetchImageBase64, type FetchFn, type HttpClientOptions } from "./http-client";

const ORE_BASE_URL = "https://ore.spongepowered.org/api/v2";

const DEFAULT_TIMEOUT_MS = 5000;

const OreAuthSchema = z.object({
  session: z.string(),
  expires: z.string()
});

const OreProjectSchema = z.object({
  plugin_id: z.string(),
  name: z.string(),
  namespace: z.object({
    owner: z.string(),
    slug: z.string()
  }),
  stats: z.object({
    views: z.number().default(0),
    downloads: z.number().default(0),
    stars: z.number().default(0)
  }),
  last_updated: z.string().default(""),
  icon_url: z.string().default("")
});

/**
 * Ore (SpongePowered) resource client.
 *
 * The Ore v2 API requires a session token obtained via POST /authenticate.
 * Sessions are cached in the client instance and refreshed when expired.
 *
 * Java parity notes:
 * - Plugin IDs are lowercased before the API request (Java comment: "resource name lowercase = ore's plugin id").
 * - rating.count = project.stats.stars  (Java: new RatingInformation(stars) → (count, null))
 * - rating.average = null  (Java: uses the single-arg constructor → averageRating = null)
 * - lastUpdated = null  (Java OreResourceService explicitly passes null even though the field is available)
 * - logo = project.icon_url  (Java: getBase64Image(oreResource.iconUrl()))
 */
export class OreResourceClient implements ResourceClient {
  private session: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly options: HttpClientOptions = {},
    private readonly fetchFn: FetchFn = fetch
  ) {}

  async getResourceBannerData(id: string): Promise<ResourceBannerData | null> {
    const token = await this.ensureSession();
    if (token === null) return null;

    // Java: pluginId.toLowerCase(Locale.ROOT)
    const pluginId = id.toLowerCase();

    const project = await fetchJson(
      `${ORE_BASE_URL}/projects/${encodeURIComponent(pluginId)}`,
      OreProjectSchema,
      this.options,
      this.makeAuthFetchFn(token)
    );
    if (project === null) return null;

    const logoBase64 = project.icon_url
      ? await fetchImageBase64(project.icon_url, this.options, this.fetchFn)
      : null;

    return {
      resource: {
        name: project.name,
        logoBase64: logoBase64 ?? null,
        downloadCount: project.stats.downloads,
        lastUpdated: null, // Java OreResourceService sets null even though last_updated exists
        rating: { count: project.stats.stars, average: null },
        price: null
      },
      author: { name: project.namespace.owner },
      backend: "ORE"
    };
  }

  /** Returns a valid session token, authenticating if the cached session is expired or absent. */
  private async ensureSession(): Promise<string | null> {
    if (this.session !== null && Date.now() < this.session.expiresAt) {
      return this.session.token;
    }

    const timeoutMs = this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const resp = await this.fetchFn(`${ORE_BASE_URL}/authenticate`, {
        method: "POST",
        signal: controller.signal,
        headers: { "User-Agent": "MCBanners" }
      });

      if (!resp.ok) return null;

      const json: unknown = await resp.json();
      const parsed = OreAuthSchema.safeParse(json);
      if (!parsed.success) return null;

      const expiresAt = Date.parse(parsed.data.expires);
      this.session = { token: parsed.data.session, expiresAt };
      return this.session.token;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Returns a wrapped fetchFn that injects the Ore session Authorization header. */
  private makeAuthFetchFn(token: string): FetchFn {
    return (input, init?) => {
      const headers = new Headers();
      if (init?.headers instanceof Headers) {
        init.headers.forEach((v, k) => {
          headers.set(k, v);
        });
      }
      headers.set("Authorization", `OreApi session=${token}`);
      return this.fetchFn(input, { ...init, headers });
    };
  }
}
