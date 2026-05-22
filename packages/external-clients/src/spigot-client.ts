import type { AuthorBannerData, ResourceBannerData } from "@mcbanners/banner-renderer";
import { z } from "zod";
import { type FetchFn, fetchImageBase64, fetchJson, type HttpClientOptions } from "./http-client";
import type { AuthorClient, ResourceClient } from "./resource-client";
import { normalizeResourceId } from "./resource-id";

const SPIGOT_BASE_URL = "https://api.spigotmc.org/simple/0.2/index.php?action=";

const SpigotStringishSchema = z.union([z.string(), z.number()]).transform((value) => String(value));
const SpigotOptionalStringishSchema = SpigotStringishSchema.optional().default("");

const SpigotResourceSchema = z.object({
  id: SpigotStringishSchema,
  title: z.string(),
  tag: z.string().default(""),
  current_version: z.string().default(""),
  icon_link: z.string().default(""),
  premium: z
    .object({
      price: z.string().default("0.00"),
      currency: z.string().default("")
    })
    .default({ price: "0.00", currency: "" }),
  stats: z.object({
    downloads: SpigotOptionalStringishSchema,
    updates: SpigotOptionalStringishSchema,
    rating: SpigotOptionalStringishSchema,
    reviews: z
      .object({
        unique: SpigotOptionalStringishSchema,
        total: SpigotOptionalStringishSchema
      })
      .default({ unique: "0", total: "0" })
  }),
  author: z.object({
    id: SpigotStringishSchema,
    username: z.string()
  })
});

const SpigotAuthorSchema = z.object({
  id: SpigotStringishSchema,
  username: z.string(),
  resource_count: SpigotOptionalStringishSchema,
  resourceCount: SpigotOptionalStringishSchema,
  avatar: z.string().default("")
});

const SpigotResourceArraySchema = z.array(SpigotResourceSchema);

export class SpigotResourceClient implements ResourceClient, AuthorClient {
  constructor(
    private readonly options: HttpClientOptions = {},
    private readonly fetchFn: FetchFn = fetch
  ) {}

  async getResourceBannerData(id: string): Promise<ResourceBannerData | null> {
    const resourceId = normalizeResourceId("SPIGOT", id);
    const resource = await fetchJson(
      `${SPIGOT_BASE_URL}getResource&id=${encodeURIComponent(resourceId)}`,
      SpigotResourceSchema,
      this.options,
      this.fetchFn
    );
    if (resource === null) return null;

    const iconUrl = resource.icon_link.split("?")[0] ?? "";
    const logoBase64 = iconUrl ? await fetchImageBase64(iconUrl, this.options, this.fetchFn) : null;

    const isPremium = resource.premium.price !== "0.00";
    const downloadCount = parseInt(resource.stats.downloads, 10) || 0;
    const ratingCount = parseInt(resource.stats.reviews.unique, 10) || 0;
    const ratingAverage = parseFloat(resource.stats.rating) || 0;
    const price = isPremium
      ? {
          amount: parseFloat(resource.premium.price),
          currency: resource.premium.currency.toUpperCase()
        }
      : null;

    return {
      resource: {
        name: resource.title,
        logoBase64: logoBase64 ?? null,
        downloadCount,
        lastUpdated: null,
        rating: { count: ratingCount, average: ratingAverage },
        price
      },
      author: { name: resource.author.username },
      backend: "SPIGOT"
    };
  }

  async getAuthorBannerData(id: string): Promise<AuthorBannerData | null> {
    const authorId = normalizeResourceId("SPIGOT", id);
    const author = await fetchJson(
      `${SPIGOT_BASE_URL}getAuthor&id=${encodeURIComponent(authorId)}`,
      SpigotAuthorSchema,
      this.options,
      this.fetchFn
    );
    if (author === null) return null;

    const resources = await this.getAllResourcesByAuthor(authorId);
    if (resources === null) return null;

    const logoUrl = author.avatar.split("?")[0] ?? "";
    const logoBase64 = logoUrl ? await fetchImageBase64(logoUrl, this.options, this.fetchFn) : null;
    const totals = resources.reduce(
      (acc, resource) => ({
        downloads: acc.downloads + (parseInt(resource.stats.downloads, 10) || 0),
        reviews: acc.reviews + (parseInt(resource.stats.reviews.total, 10) || 0)
      }),
      { downloads: 0, reviews: 0 }
    );

    return {
      author: {
        name: author.username,
        resourceCount:
          parseInt(author.resource_count || author.resourceCount, 10) || resources.length,
        logoBase64,
        downloadCount: totals.downloads,
        likes: null,
        reviews: totals.reviews
      },
      backend: "SPIGOT"
    };
  }

  private async getAllResourcesByAuthor(
    authorId: string
  ): Promise<z.infer<typeof SpigotResourceArraySchema> | null> {
    const resources: z.infer<typeof SpigotResourceArraySchema> = [];
    let page = 1;

    while (page <= Number.MAX_SAFE_INTEGER) {
      const pageResources = await fetchJson(
        `${SPIGOT_BASE_URL}getResourcesByAuthor&id=${encodeURIComponent(authorId)}&page=${String(page)}`,
        SpigotResourceArraySchema,
        this.options,
        this.fetchFn
      );

      if (pageResources === null) {
        return null;
      }

      if (pageResources.length === 0) {
        return resources;
      }

      resources.push(...pageResources);
      page += 1;
    }

    return null;
  }
}
