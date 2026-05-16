export interface MemberBannerData {
  readonly member: {
    readonly name: string;
    readonly rank: string;
    readonly joinDate: string;
    readonly logoBase64: string | null;
    readonly posts: number;
    readonly positiveFeedback: number;
    readonly negativeFeedback: number;
  };
}
