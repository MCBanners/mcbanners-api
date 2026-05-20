import {
  normalizeMinecraftServerStatus,
  pingMinecraftServer,
  type McApiResponse
} from "@mcbanners/minecraft-status";

import type { HytaleStatusAdapter } from "./adapter";
import { LiveHyQueryProvider, type HyQueryProvider } from "./hyquery-provider";
import type { HytaleServerStatus } from "./types";
import { validateHost, validatePort } from "./validate";

export type MinecraftCompatiblePing = (
  host: string,
  port: number,
  timeoutMs: number
) => Promise<McApiResponse | null>;

export interface LiveHytaleStatusAdapterOptions {
  readonly hyQueryProvider?: HyQueryProvider;
  readonly minecraftPing?: MinecraftCompatiblePing;
  readonly hyQueryTimeoutMs?: number;
  readonly pingTimeoutMs?: number;
}

const DEFAULT_ATTEMPT_TIMEOUT_MS = 2500;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          resolve(null);
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};

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
  private readonly hyQueryProvider: HyQueryProvider;
  private readonly minecraftPing: MinecraftCompatiblePing;
  private readonly hyQueryTimeoutMs: number;
  private readonly pingTimeoutMs: number;

  constructor(options: LiveHytaleStatusAdapterOptions = {}) {
    this.hyQueryProvider = options.hyQueryProvider ?? new LiveHyQueryProvider();
    this.minecraftPing = options.minecraftPing ?? pingMinecraftServer;
    this.hyQueryTimeoutMs = options.hyQueryTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
    this.pingTimeoutMs = options.pingTimeoutMs ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
  }

  async getStatus(host: string, port: number): Promise<HytaleServerStatus | null> {
    if (validateHost(host) !== null) return null;
    if (validatePort(port) !== null) return null;

    try {
      const hyQueryStatus = await withTimeout(
        this.hyQueryProvider.query(host, port, this.hyQueryTimeoutMs),
        this.hyQueryTimeoutMs
      );
      if (hyQueryStatus !== null) return hyQueryStatus;
    } catch {
      // Fall through to Minecraft-compatible ping.
    }

    try {
      const raw = await withTimeout(
        this.minecraftPing(host, port, this.pingTimeoutMs),
        this.pingTimeoutMs
      );
      return raw === null ? null : mapMinecraftPingToHytaleStatus(raw);
    } catch {
      return null;
    }
  }
}
