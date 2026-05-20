import { query as oneQuery } from "@hytaleone/query";

import type { HytaleServerStatus } from "./types";

export type OneQueryFn = (
  host: string,
  port: number,
  options: { timeout: number; full?: false }
) => Promise<unknown>;

export interface OneQueryProvider {
  query(host: string, port: number, timeoutMs: number): Promise<HytaleServerStatus | null>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

export const mapOneQueryResponseToStatus = (
  response: unknown,
  host: string,
  port: number,
  latencyMs: number | null
): HytaleServerStatus | null => {
  if (!isRecord(response)) return null;

  const online = numberOrNull(response["currentPlayers"]);
  if (online === null) return null;

  return {
    host,
    port,
    provider: "onequery",
    version: stringOrNull(response["version"]),
    players: {
      online,
      max: numberOrNull(response["maxPlayers"])
    },
    motd: {
      raw: stringOrNull(response["motd"]),
      clean: stringOrNull(response["motd"])
    },
    latencyMs
  };
};

export class LiveOneQueryProvider implements OneQueryProvider {
  private readonly queryFn: OneQueryFn;

  constructor(queryFn: OneQueryFn = oneQuery) {
    this.queryFn = queryFn;
  }

  async query(host: string, port: number, timeoutMs: number): Promise<HytaleServerStatus | null> {
    try {
      const startedAt = Date.now();
      const response = await this.queryFn(host, port, { timeout: timeoutMs, full: false });
      return mapOneQueryResponseToStatus(response, host, port, Date.now() - startedAt);
    } catch {
      return null;
    }
  }
}
