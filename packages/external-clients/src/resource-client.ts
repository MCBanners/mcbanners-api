import type { AuthorBannerData, ResourceBannerData } from "@mcbanners/banner-renderer";

export interface ResourceClient {
  getResourceBannerData(id: string): Promise<ResourceBannerData | null>;
}

export interface AuthorClient {
  getAuthorBannerData(id: string): Promise<AuthorBannerData | null>;
}
