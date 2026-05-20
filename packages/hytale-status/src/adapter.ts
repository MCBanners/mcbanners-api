import type { HytaleServerStatus } from "./types";

export interface HytaleStatusAdapter {
  getStatus(host: string, port: number): Promise<HytaleServerStatus | null>;
}
