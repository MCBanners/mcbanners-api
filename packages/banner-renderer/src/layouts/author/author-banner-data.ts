import type { ServiceBackend } from "@mcbanners/domain";

export interface AuthorBannerData {
  readonly author: {
    readonly name: string;
    readonly resourceCount: number;
    readonly logoBase64: string | null;
    readonly downloadCount: number;
    readonly likes: number | null;
    readonly reviews: number | null;
  };
  readonly backend: ServiceBackend;
}
