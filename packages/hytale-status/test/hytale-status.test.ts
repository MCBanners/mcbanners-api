import { describe, expect, it } from "bun:test";

import {
  FixtureHytaleStatusAdapter,
  HYTALE_FIXTURE_STANDARD,
  HYTALE_STATUS_FIXTURES,
  LiveHytaleStatusAdapter,
  createFixtureHytaleAdapter,
  type HyQueryProvider,
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
    expect(status?.provider).toBe("hyquery");
    expect(status?.players.max).toBeNull();
  });

  it("returns null for an unknown fixture", async () => {
    const adapter = new FixtureHytaleStatusAdapter(new Map());
    expect(await adapter.getStatus("missing.example", 5520)).toBeNull();
  });
});

describe("LiveHytaleStatusAdapter fallback resolver", () => {
  it("uses HyQuery first and returns first successful provider", async () => {
    let hyQueryCalls = 0;
    let pingCalls = 0;
    const hyQueryProvider: HyQueryProvider = {
      query: () => {
        hyQueryCalls += 1;
        return Promise.resolve(HYTALE_FIXTURE_STANDARD);
      }
    };
    const minecraftPing: MinecraftCompatiblePing = () => {
      pingCalls += 1;
      return Promise.resolve(mcPingResponse);
    };

    const adapter = new LiveHytaleStatusAdapter({ hyQueryProvider, minecraftPing });
    const status = await adapter.getStatus("play.hytale.example", 5520);

    expect(status?.provider).toBe("hyquery");
    expect(hyQueryCalls).toBe(1);
    expect(pingCalls).toBe(0);
  });

  it("tries PingProtocol only when HyQuery returns null", async () => {
    let pingArgs: readonly [string, number, number] | null = null;
    const hyQueryProvider: HyQueryProvider = {
      query: () => Promise.resolve(null)
    };
    const minecraftPing: MinecraftCompatiblePing = (host, port, timeoutMs) => {
      pingArgs = [host, port, timeoutMs];
      return Promise.resolve(mcPingResponse);
    };

    const adapter = new LiveHytaleStatusAdapter({ hyQueryProvider, minecraftPing });
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

  it("tries PingProtocol when HyQuery throws", async () => {
    let pingCalls = 0;
    const hyQueryProvider: HyQueryProvider = {
      query: () => Promise.reject(new Error("hyquery failed"))
    };
    const minecraftPing: MinecraftCompatiblePing = () => {
      pingCalls += 1;
      return Promise.resolve(mcPingResponse);
    };

    const adapter = new LiveHytaleStatusAdapter({ hyQueryProvider, minecraftPing });
    const status = await adapter.getStatus("fallback.hytale.example", 5520);

    expect(status?.provider).toBe("minecraft-compatible-ping");
    expect(pingCalls).toBe(1);
  });

  it("uses direct ping dependency and does not require Minecraft SRV resolution", async () => {
    let directPingCalled = false;
    const adapter = new LiveHytaleStatusAdapter({
      hyQueryProvider: { query: () => Promise.resolve(null) },
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
      hyQueryProvider: {
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
      hyQueryTimeoutMs: 1,
      pingTimeoutMs: 1,
      hyQueryProvider: {
        query: async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          return HYTALE_FIXTURE_STANDARD;
        }
      },
      minecraftPing: () => Promise.reject(new Error("ping failed"))
    });

    expect(await adapter.getStatus("timeout.hytale.example", 5520)).toBeNull();
  });
});
