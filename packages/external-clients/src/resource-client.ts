import type { ResourceBannerData } from "@mcbanners/banner-renderer";

export interface ResourceClient {
  getResourceBannerData(id: string): Promise<ResourceBannerData | null>;
}
