import { z } from "zod";
import type { ResourceBannerData } from "@mcbanners/banner-renderer";
import type { ResourceClient } from "./resource-client";
import { fetchJson, fetchImageBase64, type FetchFn, type HttpClientOptions } from "./http-client";

const SPIGOT_BASE_URL = "https://api.spigotmc.org/simple/0.2/index.php?action=";

const SpigotResourceSchema = z.object({
  id: z.string(),
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
    downloads: z.string().default("0"),
    updates: z.string().default("0"),
    rating: z.string().default("0"),
    reviews: z
      .object({
        unique: z.string().default("0"),
        total: z.string().default("0")
      })
      .default({ unique: "0", total: "0" })
  }),
  author: z.object({
    id: z.string(),
    username: z.string()
  })
});

export class SpigotResourceClient implements ResourceClient {
  constructor(
    private readonly options: HttpClientOptions = {},
    private readonly fetchFn: FetchFn = fetch
  ) {}

  async getResourceBannerData(id: string): Promise<ResourceBannerData | null> {
    const resource = await fetchJson(
      `${SPIGOT_BASE_URL}getResource&id=${id}`,
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
}
