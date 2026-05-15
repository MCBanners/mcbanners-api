/**
 * Tests for Milestone 7: real Minecraft status ping primitives.
 *
 * All tests are deterministic — no live Minecraft server is required.
 * Mock TCP servers are used for end-to-end protocol tests.
 */

import { describe, it, expect } from "bun:test";
import * as net from "node:net";
import {
  componentToLegacy,
  stripColors,
  cleanMotd,
  pingMinecraftServer,
  LiveMinecraftStatusAdapter
} from "../src";
import {
  encodeVarInt,
  tryReadVarInt,
  tryParseStatusResponse,
  slpToMcApiResponse
} from "../src/ping";

// ---------------------------------------------------------------------------
// motd-utils: componentToLegacy
// ---------------------------------------------------------------------------

describe("componentToLegacy", () => {
  it("returns a plain string unchanged", () => {
    expect(componentToLegacy("Hello World")).toBe("Hello World");
  });

  it("returns a §-coded string unchanged", () => {
    expect(componentToLegacy("§aHypixel Network §7[1.8-1.20]")).toBe(
      "§aHypixel Network §7[1.8-1.20]"
    );
  });

  it("converts a simple text component", () => {
    expect(componentToLegacy({ text: "Hello" })).toBe("Hello");
  });

  it("converts a colored text component", () => {
    expect(componentToLegacy({ text: "Hello", color: "green" })).toBe("§aHello");
  });

  it("converts a bold text component", () => {
    expect(componentToLegacy({ text: "Bold", bold: true })).toBe("§lBold");
  });

  it("converts multiple format flags", () => {
    expect(componentToLegacy({ text: "X", bold: true, italic: true })).toBe("§l§oX");
  });

  it("converts a component with extra array", () => {
    const comp = {
      text: "§aServer ",
      extra: [{ text: "Online", color: "white" }, { text: "!" }]
    };
    expect(componentToLegacy(comp)).toBe("§aServer §fOnline!");
  });

  it("converts a translate component to its key", () => {
    expect(componentToLegacy({ translate: "multiplayer.title" })).toBe("multiplayer.title");
  });

  it("returns empty string for null", () => {
    expect(componentToLegacy(null)).toBe("");
  });

  it("returns empty string for non-string primitive", () => {
    expect(componentToLegacy(42)).toBe("");
  });

  it("skips RGB hex colors (no § equivalent)", () => {
    expect(componentToLegacy({ text: "Hi", color: "#aabbcc" })).toBe("Hi");
  });

  it("handles all named color codes", () => {
    const cases: [string, string][] = [
      ["black", "§0"],
      ["dark_blue", "§1"],
      ["dark_green", "§2"],
      ["dark_aqua", "§3"],
      ["dark_red", "§4"],
      ["dark_purple", "§5"],
      ["gold", "§6"],
      ["gray", "§7"],
      ["dark_gray", "§8"],
      ["blue", "§9"],
      ["green", "§a"],
      ["aqua", "§b"],
      ["red", "§c"],
      ["light_purple", "§d"],
      ["yellow", "§e"],
      ["white", "§f"]
    ];
    for (const [color, code] of cases) {
      expect(componentToLegacy({ text: "x", color })).toBe(`${code}x`);
    }
  });
});

// ---------------------------------------------------------------------------
// motd-utils: stripColors
// ---------------------------------------------------------------------------

describe("stripColors", () => {
  it("removes §-coded color sequences", () => {
    expect(stripColors("§aHypixel Network §7[1.8-1.20]")).toBe("Hypixel Network [1.8-1.20]");
  });

  it("removes format codes (bold, italic, etc.)", () => {
    expect(stripColors("§lBold §oItalic")).toBe("Bold Italic");
  });

  it("is case-insensitive for the code character", () => {
    expect(stripColors("§AHello §Rworld")).toBe("Hello world");
  });

  it("returns empty string for empty input", () => {
    expect(stripColors("")).toBe("");
  });

  it("leaves plain text unchanged", () => {
    expect(stripColors("Hello World")).toBe("Hello World");
  });

  it("trims leading and trailing whitespace", () => {
    expect(stripColors("  §aHi  ")).toBe("Hi");
  });
});

// ---------------------------------------------------------------------------
// motd-utils: cleanMotd
// ---------------------------------------------------------------------------

describe("cleanMotd", () => {
  it("strips color codes", () => {
    expect(cleanMotd("§aHello §7World")).toBe("Hello World");
  });

  it("strips non-ASCII characters and collapses resulting spaces", () => {
    // "Hello 日本語 World" → strip non-ASCII → "Hello  World" → collapse spaces → "Hello World"
    expect(cleanMotd("Hello 日本語 World")).toBe("Hello World");
  });

  it("collapses multiple spaces left after non-ASCII removal", () => {
    expect(cleanMotd("Hello  World")).toBe("Hello World");
  });

  it("collapses newlines to spaces", () => {
    expect(cleanMotd("Line1\nLine2")).toBe("Line1 Line2");
  });

  it("collapses CRLF to a single space", () => {
    expect(cleanMotd("A\r\nB")).toBe("A B");
  });

  it("trims result", () => {
    expect(cleanMotd("  §aHi  ")).toBe("Hi");
  });

  it("matches Java MotdUtils.clean for a typical Hypixel MOTD", () => {
    const raw = "§aHypixel Network §7[1.8-1.20]";
    expect(cleanMotd(raw)).toBe("Hypixel Network [1.8-1.20]");
  });

  it("handles version strings with color codes", () => {
    expect(cleanMotd("§61.20.4")).toBe("1.20.4");
  });
});

// ---------------------------------------------------------------------------
// VarInt codec
// ---------------------------------------------------------------------------

describe("encodeVarInt / tryReadVarInt", () => {
  const roundtrip = (value: number): number => {
    const buf = encodeVarInt(value);
    const result = tryReadVarInt(buf, 0);
    if (result === null) throw new Error("tryReadVarInt returned null");
    return result.value;
  };

  it("encodes and decodes 0", () => {
    expect(roundtrip(0)).toBe(0);
  });
  it("encodes and decodes 1", () => {
    expect(roundtrip(1)).toBe(1);
  });
  it("encodes and decodes 127 (max 1-byte)", () => {
    expect(roundtrip(127)).toBe(127);
  });
  it("encodes and decodes 128 (first 2-byte)", () => {
    expect(roundtrip(128)).toBe(128);
  });
  it("encodes and decodes 255", () => {
    expect(roundtrip(255)).toBe(255);
  });
  it("encodes and decodes 300", () => {
    expect(roundtrip(300)).toBe(300);
  });
  it("encodes and decodes 25565 (default MC port)", () => {
    expect(roundtrip(25565)).toBe(25565);
  });
  it("encodes and decodes 765 (protocol version)", () => {
    expect(roundtrip(765)).toBe(765);
  });
  it("encodes and decodes 2097151 (max 3-byte)", () => {
    expect(roundtrip(2097151)).toBe(2097151);
  });

  it("encodes 0 as a single byte [0x00]", () => {
    expect(Array.from(encodeVarInt(0))).toEqual([0x00]);
  });

  it("encodes 128 as two bytes [0x80, 0x01]", () => {
    expect(Array.from(encodeVarInt(128))).toEqual([0x80, 0x01]);
  });

  it("returns null when buffer has no bytes", () => {
    expect(tryReadVarInt(Buffer.alloc(0), 0)).toBeNull();
  });

  it("returns null for partial VarInt (high bit set, no continuation byte)", () => {
    expect(tryReadVarInt(Buffer.from([0x80]), 0)).toBeNull();
  });

  it("reads bytesRead correctly for a 2-byte VarInt", () => {
    const buf = Buffer.from([0x80, 0x01]);
    const result = tryReadVarInt(buf, 0);
    expect(result?.bytesRead).toBe(2);
    expect(result?.value).toBe(128);
  });
});

// ---------------------------------------------------------------------------
// slpToMcApiResponse
// ---------------------------------------------------------------------------

describe("slpToMcApiResponse", () => {
  it("converts a full SLP response with all fields", () => {
    const slp = {
      version: { name: "1.20.4", protocol: 765 },
      players: { online: 42, max: 100 },
      description: "§aHello §7World",
      favicon: "data:image/png;base64,abc=="
    };
    const result = slpToMcApiResponse(slp, "play.example.com", 25565);

    expect(result.host).toBe("play.example.com");
    expect(result.port).toBe(25565);
    expect(result.version).toBe("1.20.4");
    expect(result.players.online).toBe(42);
    expect(result.players.max).toBe(100);
    expect(result.motd.raw).toBe("§aHello §7World");
    expect(result.motd.colorless).toBe("Hello World");
    expect(result.motd.formatted).toBe("Hello World");
    expect(result.icon).toBe("data:image/png;base64,abc==");
  });

  it("converts a description chat component object", () => {
    const slp = {
      version: { name: "1.20.4" },
      players: { online: 5, max: 20 },
      description: { text: "Welcome", color: "green" }
    };
    const result = slpToMcApiResponse(slp, "a.local", 25565);
    expect(result.motd.raw).toBe("§aWelcome");
    expect(result.motd.colorless).toBe("Welcome");
  });

  it("sets icon to undefined when favicon is absent", () => {
    const slp = {
      version: { name: "1.20.0" },
      players: { online: 0, max: 0 },
      description: "No icon server"
    };
    const result = slpToMcApiResponse(slp, "b.local", 25565);
    expect(result.icon).toBeUndefined();
  });

  it("sets icon to undefined when favicon is empty string", () => {
    const slp = {
      version: { name: "1.20.0" },
      players: { online: 0, max: 0 },
      description: "No icon",
      favicon: ""
    };
    const result = slpToMcApiResponse(slp, "c.local", 25565);
    expect(result.icon).toBeUndefined();
  });

  it("cleans version strings with color codes", () => {
    const slp = {
      version: { name: "§61.20.4" },
      players: { online: 0, max: 0 },
      description: "test"
    };
    const result = slpToMcApiResponse(slp, "d.local", 25565);
    expect(result.version).toBe("1.20.4");
  });

  it("defaults version to Unknown when absent", () => {
    const slp = { players: { online: 0, max: 0 }, description: "test" };
    const result = slpToMcApiResponse(slp, "e.local", 25565);
    expect(result.version).toBe("Unknown");
  });

  it("defaults player counts to 0 when absent", () => {
    const slp = { description: "test" };
    const result = slpToMcApiResponse(slp, "f.local", 25565);
    expect(result.players.online).toBe(0);
    expect(result.players.max).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// tryParseStatusResponse
// ---------------------------------------------------------------------------

describe("tryParseStatusResponse", () => {
  /** Builds a valid SLP status response packet from a JSON payload. */
  function buildSlpPacket(payload: object): Buffer {
    const jsonBytes = Buffer.from(JSON.stringify(payload), "utf8");
    const jsonLen = encodeVarInt(jsonBytes.length);
    const packetId = encodeVarInt(0x00);
    const packetPayload = Buffer.concat([packetId, jsonLen, jsonBytes]);
    const packetLen = encodeVarInt(packetPayload.length);
    return Buffer.concat([packetLen, packetPayload]);
  }

  it("parses a complete packet", () => {
    const payload = {
      version: { name: "1.20.4", protocol: 765 },
      players: { online: 10, max: 100 },
      description: "§aHello"
    };
    const packet = buildSlpPacket(payload);
    const result = tryParseStatusResponse(packet, "mc.example.com", 25565);
    expect(result).not.toBeNull();
    expect(result!.host).toBe("mc.example.com");
    expect(result!.port).toBe(25565);
    expect(result!.version).toBe("1.20.4");
    expect(result!.players.online).toBe(10);
    expect(result!.motd.colorless).toBe("Hello");
  });

  it("returns null for an empty buffer (partial)", () => {
    expect(tryParseStatusResponse(Buffer.alloc(0), "x.local", 25565)).toBeNull();
  });

  it("returns null when only the packet length VarInt is present (partial)", () => {
    const payload = { description: "test" };
    const full = buildSlpPacket(payload);
    // Give only the first byte (partial packet-length VarInt if multi-byte, or just the length with no payload)
    expect(tryParseStatusResponse(full.subarray(0, 1), "x.local", 25565)).toBeNull();
  });

  it("returns null when payload is truncated", () => {
    const payload = { description: "test" };
    const full = buildSlpPacket(payload);
    expect(tryParseStatusResponse(full.subarray(0, full.length - 5), "x.local", 25565)).toBeNull();
  });

  it("includes favicon when present in the JSON", () => {
    const payload = {
      version: { name: "1.8.9" },
      players: { online: 1, max: 1 },
      description: "test",
      favicon: "data:image/png;base64,AAAA=="
    };
    const packet = buildSlpPacket(payload);
    const result = tryParseStatusResponse(packet, "h.local", 25565);
    expect(result!.icon).toBe("data:image/png;base64,AAAA==");
  });
});

// ---------------------------------------------------------------------------
// pingMinecraftServer — mock TCP server
// ---------------------------------------------------------------------------

describe("pingMinecraftServer (mock TCP server)", () => {
  /** Builds and serves a single SLP status response then closes. */
  function startMockSlpServer(
    payload: object,
    opts: { delay?: number; sendPartial?: boolean } = {}
  ): Promise<{ port: number; close: () => void }> {
    return new Promise((resolve) => {
      const jsonBytes = Buffer.from(JSON.stringify(payload), "utf8");
      const packetId = encodeVarInt(0x00);
      const jsonLen = encodeVarInt(jsonBytes.length);
      const packetPayload = Buffer.concat([packetId, jsonLen, jsonBytes]);
      const packetLen = encodeVarInt(packetPayload.length);
      const packet = Buffer.concat([packetLen, packetPayload]);

      const server = net.createServer((socket) => {
        socket.on("data", () => {
          const send = (): void => {
            if (opts.sendPartial) {
              // Send the response in two halves to test fragmentation handling
              socket.write(packet.subarray(0, Math.floor(packet.length / 2)));
              setTimeout(() => {
                socket.write(packet.subarray(Math.floor(packet.length / 2)));
                socket.end();
              }, 10);
            } else {
              socket.write(packet);
              socket.end();
            }
          };
          if (opts.delay) setTimeout(send, opts.delay);
          else send();
        });
      });

      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as net.AddressInfo;
        resolve({ port: addr.port, close: () => server.close() });
      });
    });
  }

  it("returns parsed status from a mock SLP server", async () => {
    const { port, close } = await startMockSlpServer({
      version: { name: "1.20.4", protocol: 765 },
      players: { online: 42, max: 100 },
      description: "§aHello §7World",
      favicon: "data:image/png;base64,abc=="
    });

    try {
      const result = await pingMinecraftServer("127.0.0.1", port, 3000);
      expect(result).not.toBeNull();
      expect(result!.version).toBe("1.20.4");
      expect(result!.players.online).toBe(42);
      expect(result!.players.max).toBe(100);
      expect(result!.motd.raw).toBe("§aHello §7World");
      expect(result!.motd.colorless).toBe("Hello World");
      expect(result!.icon).toBe("data:image/png;base64,abc==");
    } finally {
      close();
    }
  });

  it("handles fragmented TCP responses (split packet)", async () => {
    const { port, close } = await startMockSlpServer(
      {
        version: { name: "1.8.9" },
        players: { online: 3, max: 20 },
        description: "Fragment test"
      },
      { sendPartial: true }
    );

    try {
      const result = await pingMinecraftServer("127.0.0.1", port, 3000);
      expect(result).not.toBeNull();
      expect(result!.version).toBe("1.8.9");
      expect(result!.motd.colorless).toBe("Fragment test");
    } finally {
      close();
    }
  });

  it("returns null when connection is refused", async () => {
    // Port 1 is typically unreachable / connection refused quickly.
    // Use a port that was already closed.
    const { port, close } = await startMockSlpServer({ description: "temp" });
    close(); // close immediately so the port is now refused
    await new Promise((r) => setTimeout(r, 50)); // let the server actually close

    const result = await pingMinecraftServer("127.0.0.1", port, 3000);
    expect(result).toBeNull();
  });

  it("returns null on timeout (server does not respond)", async () => {
    const server = net.createServer(() => {
      // Accept connection but never send data → triggers timeout
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address() as net.AddressInfo;

    try {
      const result = await pingMinecraftServer("127.0.0.1", addr.port, 200);
      expect(result).toBeNull();
    } finally {
      server.close();
    }
  });
});

// ---------------------------------------------------------------------------
// LiveMinecraftStatusAdapter
// ---------------------------------------------------------------------------

describe("LiveMinecraftStatusAdapter", () => {
  it("constructs with default 5000ms timeout", () => {
    const adapter = new LiveMinecraftStatusAdapter();
    expect(adapter).toBeDefined();
  });

  it("constructs with custom timeout", () => {
    const adapter = new LiveMinecraftStatusAdapter(3000);
    expect(adapter).toBeDefined();
  });

  it("returns null when the server is unreachable", async () => {
    const { port, close } = await new Promise<{ port: number; close: () => void }>((resolve) => {
      const s = net.createServer();
      s.listen(0, "127.0.0.1", () => {
        const addr = s.address() as net.AddressInfo;
        resolve({ port: addr.port, close: () => s.close() });
      });
    });
    close();
    await new Promise((r) => setTimeout(r, 50));

    const adapter = new LiveMinecraftStatusAdapter(1000);
    const result = await adapter.getStatus("127.0.0.1", port);
    expect(result).toBeNull();
  });

  it("returns normalized MinecraftServerStatus from a mock server", async () => {
    // Build a minimal mock SLP server
    const jsonPayload = JSON.stringify({
      version: { name: "1.20.4", protocol: 765 },
      players: { online: 7, max: 50 },
      description: { text: "Test Server", color: "gold" },
      favicon: "data:image/png;base64,AAAA=="
    });
    const jsonBytes = Buffer.from(jsonPayload, "utf8");
    const packetId = encodeVarInt(0x00);
    const jsonLen = encodeVarInt(jsonBytes.length);
    const packetPayload = Buffer.concat([packetId, jsonLen, jsonBytes]);
    const packetLen = encodeVarInt(packetPayload.length);
    const packet = Buffer.concat([packetLen, packetPayload]);

    const server = net.createServer((socket) => {
      socket.on("data", () => {
        socket.write(packet);
        socket.end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address() as net.AddressInfo;

    try {
      const adapter = new LiveMinecraftStatusAdapter(3000);
      const result = await adapter.getStatus("127.0.0.1", addr.port);
      expect(result).not.toBeNull();
      expect(result!.host).toBe("127.0.0.1");
      expect(result!.port).toBe(addr.port);
      expect(result!.version).toBe("1.20.4");
      expect(result!.players.online).toBe(7);
      expect(result!.players.max).toBe(50);
      // description: { text: "Test Server", color: "gold" } → "§6Test Server"
      expect(result!.motd.raw).toBe("§6Test Server");
      expect(result!.motd.colorless).toBe("Test Server");
      expect(result!.iconDataUrl).toBe("data:image/png;base64,AAAA==");
    } finally {
      server.close();
    }
  });
});

// Suppress unhandled afterAll cleanup noise
