import type {
  AuthorBannerData,
  MemberBannerData,
  ResourceBannerData,
  TeamBannerData
} from "@mcbanners/banner-renderer";

export interface ResourceClient {
  getResourceBannerData(id: string): Promise<ResourceBannerData | null>;
}

export interface AuthorClient {
  getAuthorBannerData(id: string): Promise<AuthorBannerData | null>;
}

export interface MemberClient {
  getMemberBannerData(id: string): Promise<MemberBannerData | null>;
}

export interface TeamClient {
  getTeamBannerData(id: string): Promise<TeamBannerData | null>;
}
