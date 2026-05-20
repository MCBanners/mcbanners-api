export type HytaleStatusProvider = "hyquery" | "minecraft-compatible-ping";

export interface HytaleServerStatus {
  readonly host: string;
  readonly port: number;
  readonly provider: HytaleStatusProvider;
  readonly version: string | null;
  readonly players: {
    readonly online: number;
    readonly max: number | null;
  };
  readonly motd: {
    readonly raw: string | null;
    readonly clean: string | null;
  };
  readonly latencyMs: number | null;
}
