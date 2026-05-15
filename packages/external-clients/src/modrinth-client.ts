import { z } from "zod";
import type { ResourceBannerData } from "@mcbanners/banner-renderer";
import type { ResourceClient } from "./resource-client";
import { fetchJson, fetchImageBase64, type FetchFn, type HttpClientOptions } from "./http-client";

const MODRINTH_BASE_URL = "https://api.modrinth.com/v2";

const ModrinthProjectSchema = z.object({
  id: z.string(),
  slug: z.string(),
  team: z.string(),
  title: z.string(),
  updated: z.string(),
  downloads: z.number(),
  followers: z.number().optional().default(0),
  icon_url: z.string().nullable().optional()
});

const ModrinthMemberSchema = z.object({
  role: z.string().optional(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    name: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional()
  })
});

const ModrinthMembersSchema = z.array(ModrinthMemberSchema);

export class ModrinthResourceClient implements ResourceClient {
  constructor(
    private readonly options: HttpClientOptions = {},
    private readonly fetchFn: FetchFn = fetch
  ) {}

  async getResourceBannerData(id: string): Promise<ResourceBannerData | null> {
    const project = await fetchJson(
      `${MODRINTH_BASE_URL}/project/${encodeURIComponent(id)}`,
      ModrinthProjectSchema,
      this.options,
      this.fetchFn
    );
    if (project === null) return null;

    const members = await fetchJson(
      `${MODRINTH_BASE_URL}/project/${encodeURIComponent(id)}/members`,
      ModrinthMembersSchema,
      this.options,
      this.fetchFn
    );
    if (members === null || members.length === 0) return null;

    const firstMember = members[0];
    if (firstMember === undefined) return null;
    const authorName = firstMember.user.username;

    const iconUrl = project.icon_url ?? null;
    const logoBase64 = iconUrl ? await fetchImageBase64(iconUrl, this.options, this.fetchFn) : null;

    return {
      resource: {
        name: project.title,
        logoBase64: logoBase64 ?? null,
        downloadCount: project.downloads,
        lastUpdated: project.updated,
        rating: { count: 0, average: null },
        price: null
      },
      author: { name: authorName },
      backend: "MODRINTH"
    };
  }
}
