import {
  normalizeMinecraftServerStatus,
  pingMinecraftServer,
  type McApiResponse
} from "@mcbanners/minecraft-status";

import type { HytaleStatusAdapter } from "./adapter";
import { LiveOneQueryProvider, type OneQueryProvider } from "./onequery-provider";
import type { HytaleServerStatus } from "./types";
import { validateHost, validatePort } from "./validate";

export type MinecraftCompatiblePing = (
  host: string,
  port: number,
  timeoutMs: number
) => Promise<McApiResponse | null>;

export interface LiveHytaleStatusAdapterOptions {
  readonly oneQueryProvider?: OneQueryProvider;
  readonly minecraftPing?: MinecraftCompatiblePing;
  readonly oneQueryTimeoutMs?: number;
  readonly pingTimeoutMs?: number;
}

const DEFAULT_ATTEMPT_TIMEOUT_MS = 2500;

const mapMinecraftPingToHytaleStatus = (raw: McApiResponse): HytaleServerStatus => {
  const status = normalizeMinecraftServerStatus(raw);
  return {
    host: status.host,
    port: status.port,
    provider: "minecraft-compatible-ping",
    version: status.version,
    players: {
      online: status.players.online,
      max: status.players.max
    },
    motd: {
      raw: status.motd.raw,
      clean: status.motd.colorless
    },
    latencyMs: null
  };
};

export class LiveHytaleStatusAdapter implements HytaleStatusAdapter {
  private readonly oneQueryProvider: OneQueryProvider;
  private readonly minecraftPing: MinecraftCompatiblePing;
  private readonly oneQueryTimeoutMs: number;
  private readonly pingTimeoutMs: number;

  constructor(options: LiveHytaleStatusAdapterOptions = {}) {
    this.oneQueryProvider = options.oneQueryProvider ?? new LiveOneQueryProvider();
    this.minecraftPing = options.minecraftPing ?? pingMinecraftServer;
    this.oneQueryTimeoutMs = options.oneQueryTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
    this.pingTimeoutMs = options.pingTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
  }

  async getStatus(host: string, port: number): Promise<HytaleServerStatus | null> {
    if (validateHost(host) !== null) return null;
    if (validatePort(port) !== null) return null;

    try {
      const oneQueryStatus = await this.oneQueryProvider.query(host, port, this.oneQueryTimeoutMs);
      if (oneQueryStatus !== null) return oneQueryStatus;
    } catch {
      // Fall through to Minecraft-compatible ping.
    }

    try {
      const raw = await this.minecraftPing(host, port, this.pingTimeoutMs);
      return raw === null ? null : mapMinecraftPingToHytaleStatus(raw);
    } catch {
      return null;
    }
  }
}
