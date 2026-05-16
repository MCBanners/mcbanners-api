export interface TeamBannerData {
  readonly team: {
    readonly name: string;
    readonly logoBase64: string | null;
    readonly resourceCount: number;
    readonly resourceDownloads: number;
    readonly resourceRatings: number;
    readonly resourceAverageRating: number;
  };
}
