import { describe, expect, it } from "bun:test";

import {
  FixtureHytaleStatusAdapter,
  HYTALE_FIXTURE_STANDARD,
  HYTALE_STATUS_FIXTURES,
  LiveOneQueryProvider,
  LiveHytaleStatusAdapter,
  createFixtureHytaleAdapter,
  type OneQueryFn,
  type OneQueryProvider,
  type MinecraftCompatiblePing
} from "../src";
import type { McApiResponse } from "@mcbanners/minecraft-status";

const mcPingResponse: McApiResponse = {
  host: "fallback.hytale.example",
  port: 5520,
  version: "Minecraft-compatible",
  players: { online: 7, max: 80 },
  motd: {
    raw: "Raw fallback MOTD",
    colorless: "Fallback MOTD",
    formatted: "Fallback MOTD"
  }
};

describe("FixtureHytaleStatusAdapter", () => {
  it("returns normalized Hytale status for a known fixture", async () => {
    const adapter = createFixtureHytaleAdapter(HYTALE_STATUS_FIXTURES);
    const status = await adapter.getStatus("play.hytale.example", 5520);

    expect(status).toEqual(HYTALE_FIXTURE_STANDARD);
    expect(status?.provider).toBe("onequery");
    expect(status?.players.max).toBeNull();
  });

  it("returns null for an unknown fixture", async () => {
    const adapter = new FixtureHytaleStatusAdapter(new Map());
    expect(await adapter.getStatus("missing.example", 5520)).toBeNull();
  });
});

describe("LiveOneQueryProvider", () => {
  it("maps a successful package response to HytaleServerStatus", async () => {
    const queryFn: OneQueryFn = () =>
      Promise.resolve({
        serverName: "Example Hytale",
        motd: "Welcome to OneQuery",
        currentPlayers: 12,
        maxPlayers: 80,
        hostPort: 5520,
        version: "Hytale 1.0",
        protocolVersion: 1,
        protocolHash: "abc",
        supportsV2: false,
        isNetworkMode: false,
        v2Version: 0
      });

    const provider = new LiveOneQueryProvider(queryFn);
    const status = await provider.query("play.hytale.example", 5520, 2500);

    expect(status).toMatchObject({
      host: "play.hytale.example",
      port: 5520,
      provider: "onequery",
      version: "Hytale 1.0",
      players: { online: 12, max: 80 },
      motd: { raw: "Welcome to OneQuery", clean: "Welcome to OneQuery" }
    });
    expect(status?.latencyMs).toBeNumber();
  });

  it("returns null when the package throws", async () => {
    const provider = new LiveOneQueryProvider(() => Promise.reject(new Error("udp failed")));
    expect(await provider.query("play.hytale.example", 5520, 2500)).toBeNull();
  });

  it("passes the configured timeout to @hytaleone/query", async () => {
    let optionsSeen: { timeout: number; full?: boolean } | null = null;
    const queryFn: OneQueryFn = (_host, _port, options) => {
      optionsSeen = options;
      return Promise.resolve({
        motd: "ok",
        currentPlayers: 1
      });
    };

    const provider = new LiveOneQueryProvider(queryFn);
    await provider.query("play.hytale.example", 5520, 1234);

    expect(optionsSeen).toEqual({ timeout: 1234, full: false });
  });

  it("returns null for an invalid package response", async () => {
    const provider = new LiveOneQueryProvider(() => Promise.resolve({ motd: "missing players" }));
    expect(await provider.query("play.hytale.example", 5520, 2500)).toBeNull();
  });
});

describe("LiveHytaleStatusAdapter fallback resolver", () => {
  it("uses OneQuery first and returns first successful provider", async () => {
    let oneQueryCalls = 0;
    let pingCalls = 0;
    const oneQueryProvider: OneQueryProvider = {
      query: () => {
        oneQueryCalls += 1;
        return Promise.resolve(HYTALE_FIXTURE_STANDARD);
      }
    };
    const minecraftPing: MinecraftCompatiblePing = () => {
      pingCalls += 1;
      return Promise.resolve(mcPingResponse);
    };

    const adapter = new LiveHytaleStatusAdapter({ oneQueryProvider, minecraftPing });
    const status = await adapter.getStatus("play.hytale.example", 5520);

    expect(status?.provider).toBe("onequery");
    expect(oneQueryCalls).toBe(1);
    expect(pingCalls).toBe(0);
  });

  it("tries PingProtocol only when OneQuery returns null", async () => {
    let pingArgs: readonly [string, number, number] | null = null;
    const oneQueryProvider: OneQueryProvider = {
      query: () => Promise.resolve(null)
    };
    const minecraftPing: MinecraftCompatiblePing = (host, port, timeoutMs) => {
      pingArgs = [host, port, timeoutMs];
      return Promise.resolve(mcPingResponse);
    };

    const adapter = new LiveHytaleStatusAdapter({ oneQueryProvider, minecraftPing });
    const status = await adapter.getStatus("fallback.hytale.example", 5520);

    expect(status).toMatchObject({
      host: "fallback.hytale.example",
      port: 5520,
      provider: "minecraft-compatible-ping",
      version: "Minecraft-compatible",
      players: { online: 7, max: 80 },
      motd: { raw: "Raw fallback MOTD", clean: "Fallback MOTD" }
    });
    expect(pingArgs).toEqual(["fallback.hytale.example", 5520, 2500]);
  });

  it("tries PingProtocol when OneQuery throws", async () => {
    let pingCalls = 0;
    const oneQueryProvider: OneQueryProvider = {
      query: () => Promise.reject(new Error("onequery failed"))
    };
    const minecraftPing: MinecraftCompatiblePing = () => {
      pingCalls += 1;
      return Promise.resolve(mcPingResponse);
    };

    const adapter = new LiveHytaleStatusAdapter({ oneQueryProvider, minecraftPing });
    const status = await adapter.getStatus("fallback.hytale.example", 5520);

    expect(status?.provider).toBe("minecraft-compatible-ping");
    expect(pingCalls).toBe(1);
  });

  it("uses direct ping dependency and does not require Minecraft SRV resolution", async () => {
    let directPingCalled = false;
    const adapter = new LiveHytaleStatusAdapter({
      oneQueryProvider: { query: () => Promise.resolve(null) },
      minecraftPing: (host, port) => {
        directPingCalled = true;
        expect(host).toBe("srv-bypass.example");
        expect(port).toBe(25565);
        return Promise.resolve(null);
      }
    });

    expect(await adapter.getStatus("srv-bypass.example", 25565)).toBeNull();
    expect(directPingCalled).toBe(true);
  });

  it("returns null for invalid host or port without provider calls", async () => {
    let calls = 0;
    const adapter = new LiveHytaleStatusAdapter({
      oneQueryProvider: {
        query: () => {
          calls += 1;
          return Promise.resolve(HYTALE_FIXTURE_STANDARD);
        }
      },
      minecraftPing: () => {
        calls += 1;
        return Promise.resolve(mcPingResponse);
      }
    });

    expect(await adapter.getStatus("", 5520)).toBeNull();
    expect(await adapter.getStatus("play.hytale.example", 0)).toBeNull();
    expect(calls).toBe(0);
  });

  it("returns null when both providers fail or time out", async () => {
    const adapter = new LiveHytaleStatusAdapter({
      oneQueryTimeoutMs: 1,
      pingTimeoutMs: 1,
      oneQueryProvider: {
        query: () => Promise.resolve(null)
      },
      minecraftPing: () => Promise.reject(new Error("ping failed"))
    });

    expect(await adapter.getStatus("timeout.hytale.example", 5520)).toBeNull();
  });
});
