import type { HytaleServerStatus } from "./types";

export interface HyQueryProvider {
  query(host: string, port: number, timeoutMs: number): Promise<HytaleServerStatus | null>;
}

export class LiveHyQueryProvider implements HyQueryProvider {
  query(): Promise<HytaleServerStatus | null> {
    // TODO: Implement HyQuery wire protocol once the packet contract is available
    // locally or from stable upstream documentation. Keep protocol details here,
    // not in API routes, so the public banner layer stays provider-agnostic.
    return Promise.resolve(null);
  }
}
