import { z } from "zod";
import type { ResourceBannerData } from "@mcbanners/banner-renderer";
import type { ResourceClient } from "./resource-client";
import { fetchJson, fetchImageBase64, type FetchFn, type HttpClientOptions } from "./http-client";
import { normalizeResourceId } from "./resource-id";

const CFWIDGET_BASE_URL = "https://api.cfwidget.com/";

const CfWidgetMemberSchema = z.object({
  id: z.number(),
  title: z.string(),
  username: z.string()
});

/**
 * cfwidget.com proxy response for a CurseForge project.
 *
 * Note: cfwidget returns HTTP 202 while indexing a new project.
 * That response body will not match this schema, so fetchJson returns null — no
 * special 202 handling is required.
 */
const CfWidgetResourceSchema = z.object({
  id: z.number(),
  title: z.string(),
  thumbnail: z.string().default(""),
  downloads: z.object({
    monthly: z.number().default(0),
    total: z.number().default(0)
  }),
  download: z
    .object({
      uploaded_at: z.string().default("")
    })
    .default({ uploaded_at: "" }),
  members: z.array(CfWidgetMemberSchema).default([])
});

export class CurseForgeResourceClient implements ResourceClient {
  constructor(
    private readonly options: HttpClientOptions = {},
    private readonly fetchFn: FetchFn = fetch
  ) {}

  async getResourceBannerData(id: string): Promise<ResourceBannerData | null> {
    const resourceId = normalizeResourceId("CURSEFORGE", id);
    const resource = await fetchJson(
      `${CFWIDGET_BASE_URL}${encodeURIComponent(resourceId)}`,
      CfWidgetResourceSchema,
      this.options,
      this.fetchFn
    );
    if (resource === null) return null;

    // Java: members.stream().filter(m -> m.title().equalsIgnoreCase("Owner")).findFirst().orElse(null)
    const ownerMember = resource.members.find((m) => m.title.toLowerCase() === "owner");
    if (ownerMember === undefined) return null;

    const logoBase64 = resource.thumbnail
      ? await fetchImageBase64(resource.thumbnail, this.options, this.fetchFn)
      : null;

    // Java: new RatingInformation(0, 0.0) — CurseForge has no rating system.
    // Java: uploadedAt from download.uploaded_at
    const uploadedAt = resource.download.uploaded_at || null;

    return {
      resource: {
        name: resource.title,
        logoBase64: logoBase64 ?? null,
        downloadCount: resource.downloads.total,
        lastUpdated: uploadedAt,
        rating: { count: 0, average: 0 },
        price: null
      },
      author: { name: ownerMember.username },
      backend: "CURSEFORGE"
    };
  }
}
