import { describe, expect, it } from "bun:test";

import { registerRendererFonts } from "@mcbanners/banner-renderer";
import { LiveHytaleStatusAdapter, type HytaleServerStatus } from "@mcbanners/hytale-status";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";

import { createApp } from "../src/app";

const LIVE_ENABLED = process.env["LIVE_HYTALE_STATUS_TESTS"] === "1";
const LIVE_SUITE = LIVE_ENABLED ? describe : describe.skip;
const LIVE_STATUS_PROVIDERS = new Set<string>(["onequery", "minecraft-compatible-ping"]);
const LIVE_TEST_TIMEOUT_MS = 30_000;

interface LiveServerTarget {
  readonly host: string;
  readonly port: number;
}

const parseLiveServers = (): readonly LiveServerTarget[] => {
  const raw = process.env["HYTALE_LIVE_SERVERS"] ?? "";
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const separator = entry.lastIndexOf(":");
      if (separator <= 0 || separator === entry.length - 1) {
        throw new Error(`Invalid HYTALE_LIVE_SERVERS entry: ${entry}. Expected host:port.`);
      }

      const host = entry.slice(0, separator).trim().toLowerCase();
      const port = Number.parseInt(entry.slice(separator + 1), 10);
      if (host.length === 0 || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid HYTALE_LIVE_SERVERS entry: ${entry}. Expected host:port.`);
      }
      return { host, port };
    });
};

const isUsableStatus = (status: HytaleServerStatus | null): status is HytaleServerStatus =>
  status !== null &&
  typeof status.players.online === "number" &&
  LIVE_STATUS_PROVIDERS.has(status.provider);

const findFirstLiveServer = async (
  adapter: LiveHytaleStatusAdapter,
  servers: readonly LiveServerTarget[]
): Promise<LiveServerTarget | null> => {
  for (const server of servers) {
    const status = await adapter.getStatus(server.host, server.port);
    console.info(
      [
        `API live Hytale preflight ${server.host}:${String(server.port)}`,
        `provider=${status?.provider ?? "none"}`,
        `online=${status?.players.online === undefined ? "n/a" : String(status.players.online)}`,
        `max=${status?.players.max === null || status?.players.max === undefined ? "n/a" : String(status.players.max)}`,
        `version=${status?.version ?? "n/a"}`,
        `motd=${status?.motd.clean ?? status?.motd.raw ?? "n/a"}`,
        `latency=${status?.latencyMs === null || status?.latencyMs === undefined ? "n/a" : `${String(status.latencyMs)}ms`}`
      ].join(" ")
    );
    if (isUsableStatus(status)) return server;
  }
  return null;
};

LIVE_SUITE("live Hytale API smoke", () => {
  it("renders isValid and PNG for the first reachable configured live server", async () => {
    const servers = parseLiveServers();
    if (servers.length === 0) {
      throw new Error(
        "LIVE_HYTALE_STATUS_TESTS=1 requires HYTALE_LIVE_SERVERS, for example host:5520,other:5520."
      );
    }

    registerRendererFonts();

    const hytaleAdapter = new LiveHytaleStatusAdapter({
      oneQueryTimeoutMs: 2500,
      pingTimeoutMs: 2500
    });
    const liveServer = await findFirstLiveServer(hytaleAdapter, servers);
    if (liveServer === null) {
      throw new Error(
        `No configured live Hytale servers returned usable status for API smoke: ${servers
          .map((server) => `${server.host}:${String(server.port)}`)
          .join(", ")}`
      );
    }

    const app = createApp(
      createFixtureAdapter(MC_STATUS_FIXTURES),
      {},
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { hytaleAdapter }
    );

    const isValid = await app.request(
      `/banner/server/hytale/${liveServer.host}/${String(liveServer.port)}/isValid`
    );
    expect(isValid.status).toBe(200);
    expect(await isValid.json()).toEqual({ valid: true });

    const banner = await app.request(
      `/banner/server/hytale/${liveServer.host}/${String(liveServer.port)}/banner.png`
    );
    expect(banner.status).toBe(200);
    expect(banner.headers.get("Content-Type")).toBe("image/png");
    expect((await banner.arrayBuffer()).byteLength).toBeGreaterThan(0);
  }, LIVE_TEST_TIMEOUT_MS);
});
