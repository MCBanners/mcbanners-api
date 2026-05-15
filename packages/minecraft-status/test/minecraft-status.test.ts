import { describe, it, expect } from "bun:test";
import {
  normalizeMinecraftServerStatus,
  FixtureMinecraftStatusAdapter,
  createFixtureAdapter,
  MC_STATUS_FIXTURES,
  MC_FIXTURE_HYPIXEL
} from "../src";
import type { McApiResponse } from "../src";

// ---------------------------------------------------------------------------
// normalizeMinecraftServerStatus
// ---------------------------------------------------------------------------

describe("normalizeMinecraftServerStatus", () => {
  it("maps all fields from a complete response", () => {
    const raw: McApiResponse = {
      host: "play.example.com",
      port: 25565,
      version: "1.20.4",
      players: { online: 10, max: 100 },
      motd: { raw: "§aHello", colorless: "Hello", formatted: "Hello" },
      icon: "data:image/png;base64,abc123"
    };

    const status = normalizeMinecraftServerStatus(raw);

    expect(status.host).toBe("play.example.com");
    expect(status.port).toBe(25565);
    expect(status.version).toBe("1.20.4");
    expect(status.players.online).toBe(10);
    expect(status.players.max).toBe(100);
    expect(status.motd.raw).toBe("§aHello");
    expect(status.motd.colorless).toBe("Hello");
    expect(status.motd.formatted).toBe("Hello");
    expect(status.iconDataUrl).toBe("data:image/png;base64,abc123");
  });

  it("sets iconDataUrl to null when icon is empty string", () => {
    const raw: McApiResponse = {
      host: "a.local",
      port: 25565,
      version: "1.20.4",
      players: { online: 0, max: 20 },
      motd: { raw: "", colorless: "", formatted: "" },
      icon: ""
    };
    const status = normalizeMinecraftServerStatus(raw);
    expect(status.iconDataUrl).toBeNull();
  });

  it("sets iconDataUrl to null when icon is absent", () => {
    const raw: McApiResponse = {
      host: "b.local",
      port: 25565,
      version: "1.20.4",
      players: { online: 0, max: 20 },
      motd: { raw: "", colorless: "", formatted: "" }
    };
    const status = normalizeMinecraftServerStatus(raw);
    expect(status.iconDataUrl).toBeNull();
  });

  it("preserves full data URI when icon has data:image/png prefix", () => {
    const dataUri = "data:image/png;base64,iVBORw0KGg==";
    const raw: McApiResponse = {
      host: "c.local",
      port: 25565,
      version: "1.20.0",
      players: { online: 1, max: 10 },
      motd: { raw: "test", colorless: "test", formatted: "test" },
      icon: dataUri
    };
    const status = normalizeMinecraftServerStatus(raw);
    expect(status.iconDataUrl).toBe(dataUri);
  });

  it("normalizes the Hypixel fixture correctly", () => {
    const status = normalizeMinecraftServerStatus(MC_FIXTURE_HYPIXEL);
    expect(status.host).toBe("mc.hypixel.net");
    expect(status.port).toBe(25565);
    expect(status.players.online).toBe(42_500);
    expect(status.players.max).toBe(200_000);
    expect(status.motd.colorless).toBe("Hypixel Network [1.8-1.20]");
    expect(status.iconDataUrl).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FixtureMinecraftStatusAdapter
// ---------------------------------------------------------------------------

describe("FixtureMinecraftStatusAdapter", () => {
  const adapter = createFixtureAdapter(MC_STATUS_FIXTURES);

  it("returns status for a known fixture", async () => {
    const status = await adapter.getStatus("mc.hypixel.net", 25565);
    expect(status).not.toBeNull();
    expect(status!.host).toBe("mc.hypixel.net");
    expect(status!.players.online).toBe(42_500);
  });

  it("returns null for an unknown host", async () => {
    const status = await adapter.getStatus("unknown.server.invalid", 25565);
    expect(status).toBeNull();
  });

  it("returns null when port does not match", async () => {
    const status = await adapter.getStatus("mc.hypixel.net", 19132);
    expect(status).toBeNull();
  });

  it("returns null for the no-icon fixture (by key)", async () => {
    const status = await adapter.getStatus("noicon.local", 25565);
    expect(status).not.toBeNull();
    expect(status!.iconDataUrl).toBeNull();
  });

  it("constructs directly from a Map", async () => {
    const map = new Map<string, McApiResponse>([
      [
        "custom.local:25565",
        {
          host: "custom.local",
          port: 25565,
          version: "1.20.4",
          players: { online: 2, max: 10 },
          motd: { raw: "Hello", colorless: "Hello", formatted: "Hello" }
        }
      ]
    ]);
    const a = new FixtureMinecraftStatusAdapter(map);
    const status = await a.getStatus("custom.local", 25565);
    expect(status).not.toBeNull();
    expect(status!.version).toBe("1.20.4");
  });
});

// ---------------------------------------------------------------------------
// MC_STATUS_FIXTURES lookup
// ---------------------------------------------------------------------------

describe("MC_STATUS_FIXTURES", () => {
  it("contains expected fixture keys", () => {
    expect(Object.keys(MC_STATUS_FIXTURES)).toContain("mc.hypixel.net:25565");
    expect(Object.keys(MC_STATUS_FIXTURES)).toContain("noicon.local:25565");
    expect(Object.keys(MC_STATUS_FIXTURES)).toContain("longmotd.local:25565");
    expect(Object.keys(MC_STATUS_FIXTURES)).toContain("unicode.local:25565");
  });
});
