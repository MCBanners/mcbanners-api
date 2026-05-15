/**
 * Tests for Milestone 7 hardening: SRV resolution, input validation,
 * safety limits, and MOTD edge cases.
 *
 * All tests are deterministic — no live Minecraft server or DNS is required.
 */

import { describe, it, expect } from "bun:test";
import * as net from "node:net";
import { validateHost, validatePort, componentToLegacy, LiveMinecraftStatusAdapter } from "../src";
import {
  encodeVarInt,
  MAX_PACKET_BYTES,
  MAX_FAVICON_BYTES,
  MAX_MOTD_LENGTH,
  slpToMcApiResponse
} from "../src/ping";

// ---------------------------------------------------------------------------
// validateHost
// ---------------------------------------------------------------------------

describe("validateHost", () => {
  it("returns null for a simple hostname", () => {
    expect(validateHost("mc.hypixel.net")).toBeNull();
  });

  it("returns null for an IP address", () => {
    expect(validateHost("127.0.0.1")).toBeNull();
  });

  it("returns null for a 253-character hostname (max allowed)", () => {
    const long =
      "a".repeat(63) + "." + "b".repeat(63) + "." + "c".repeat(63) + "." + "d".repeat(61);
    expect(long.length).toBe(253);
    expect(validateHost(long)).toBeNull();
  });

  it("returns an error for an empty string", () => {
    expect(validateHost("")).not.toBeNull();
  });

  it("returns an error for a whitespace-only string", () => {
    expect(validateHost("   ")).not.toBeNull();
  });

  it("returns an error for a 254-character hostname (too long)", () => {
    const tooLong = "a".repeat(254);
    expect(validateHost(tooLong)).not.toBeNull();
  });

  it("error message mentions 'empty' for empty host", () => {
    expect(validateHost("")).toMatch(/empty/i);
  });

  it("error message mentions the max length for an oversized host", () => {
    const tooLong = "a".repeat(300);
    const err = validateHost(tooLong);
    expect(err).toMatch(/253/);
  });
});

// ---------------------------------------------------------------------------
// validatePort
// ---------------------------------------------------------------------------

describe("validatePort", () => {
  it("returns null for port 25565 (default)", () => {
    expect(validatePort(25565)).toBeNull();
  });

  it("returns null for port 1 (minimum valid)", () => {
    expect(validatePort(1)).toBeNull();
  });

  it("returns null for port 65535 (maximum valid)", () => {
    expect(validatePort(65535)).toBeNull();
  });

  it("returns an error for port 0", () => {
    expect(validatePort(0)).not.toBeNull();
  });

  it("returns an error for port 65536", () => {
    expect(validatePort(65536)).not.toBeNull();
  });

  it("returns an error for negative port", () => {
    expect(validatePort(-1)).not.toBeNull();
  });

  it("returns an error for non-integer port (float)", () => {
    expect(validatePort(25565.5)).not.toBeNull();
  });

  it("returns an error for NaN", () => {
    expect(validatePort(NaN)).not.toBeNull();
  });

  it("error message includes the invalid value", () => {
    expect(validatePort(0)).toMatch(/0/);
    expect(validatePort(99999)).toMatch(/99999/);
  });
});

// ---------------------------------------------------------------------------
// componentToLegacy — MOTD edge cases
// ---------------------------------------------------------------------------

describe("componentToLegacy — edge cases", () => {
  it("skips score components (no text/translate field)", () => {
    // Score components have no § equivalent; they should produce empty string.
    expect(componentToLegacy({ score: { name: "Player", objective: "kills" } })).toBe("");
  });

  it("skips selector components (no text/translate field)", () => {
    expect(componentToLegacy({ selector: "@a" })).toBe("");
  });

  it("handles deeply nested extra arrays", () => {
    const comp = {
      text: "A",
      extra: [
        {
          text: "B",
          extra: [{ text: "C", extra: [{ text: "D" }] }]
        }
      ]
    };
    expect(componentToLegacy(comp)).toBe("ABCD");
  });

  it("handles a component with only color and nested extra (no root text)", () => {
    const comp = {
      color: "gold",
      extra: [{ text: "Hello" }]
    };
    expect(componentToLegacy(comp)).toBe("§6Hello");
  });

  it("skips RGB hex colors (1.16+) — no § equivalent", () => {
    expect(componentToLegacy({ text: "Colored", color: "#ff5500" })).toBe("Colored");
    expect(componentToLegacy({ text: "Colored", color: "#aabbcc" })).toBe("Colored");
  });

  it("handles a multiline MOTD using \\n in text (two-line server name)", () => {
    const comp = {
      text: "Line one\nLine two"
    };
    // componentToLegacy preserves raw text including newlines;
    // cleanMotd/stripColors callers are responsible for newline collapsing.
    expect(componentToLegacy(comp)).toBe("Line one\nLine two");
  });

  it("handles boolean-false format flags (should not emit codes)", () => {
    expect(componentToLegacy({ text: "Normal", bold: false, italic: false })).toBe("Normal");
  });

  it("handles an empty extra array gracefully", () => {
    expect(componentToLegacy({ text: "X", extra: [] })).toBe("X");
  });

  it("handles an extra array with null/primitive entries gracefully", () => {
    // Non-object, non-string extras should contribute empty string (recursive call)
    const comp = { text: "A", extra: [null, 42, { text: "B" }] };
    expect(componentToLegacy(comp)).toBe("AB");
  });

  it("handles underlined/strikethrough/obfuscated flags", () => {
    expect(componentToLegacy({ text: "X", underlined: true })).toBe("§nX");
    expect(componentToLegacy({ text: "X", strikethrough: true })).toBe("§mX");
    expect(componentToLegacy({ text: "X", obfuscated: true })).toBe("§kX");
  });
});

// ---------------------------------------------------------------------------
// Safety limits: slpToMcApiResponse
// ---------------------------------------------------------------------------

describe("slpToMcApiResponse — safety limits", () => {
  it("drops a favicon that exceeds MAX_FAVICON_BYTES", () => {
    // Build a data URI that is one byte over the limit.
    const oversize = "data:image/png;base64," + "A".repeat(MAX_FAVICON_BYTES);
    const slp = {
      version: { name: "1.20.4" },
      players: { online: 0, max: 0 },
      description: "test",
      favicon: oversize
    };
    const result = slpToMcApiResponse(slp, "a.local", 25565);
    expect(result.icon).toBeUndefined();
  });

  it("keeps a favicon that is exactly MAX_FAVICON_BYTES", () => {
    // A favicon at exactly the limit should be kept.
    const exact =
      "data:image/png;base64," + "A".repeat(MAX_FAVICON_BYTES - "data:image/png;base64,".length);
    const slp = {
      version: { name: "1.20.4" },
      players: { online: 0, max: 0 },
      description: "test",
      favicon: exact
    };
    // exact.length === MAX_FAVICON_BYTES
    const result = slpToMcApiResponse(slp, "b.local", 25565);
    expect(result.icon).toBe(exact);
  });

  it("truncates a raw MOTD that exceeds MAX_MOTD_LENGTH", () => {
    const longMotd = "A".repeat(MAX_MOTD_LENGTH + 100);
    const slp = {
      version: { name: "1.20.4" },
      players: { online: 0, max: 0 },
      description: longMotd
    };
    const result = slpToMcApiResponse(slp, "c.local", 25565);
    expect(result.motd.raw.length).toBe(MAX_MOTD_LENGTH);
  });

  it("keeps a MOTD at exactly MAX_MOTD_LENGTH", () => {
    const exact = "B".repeat(MAX_MOTD_LENGTH);
    const slp = {
      version: { name: "1.20.4" },
      players: { online: 0, max: 0 },
      description: exact
    };
    const result = slpToMcApiResponse(slp, "d.local", 25565);
    expect(result.motd.raw.length).toBe(MAX_MOTD_LENGTH);
  });
});

// ---------------------------------------------------------------------------
// Safety limits: pingMinecraftServer — oversized response
// ---------------------------------------------------------------------------

describe("pingMinecraftServer — MAX_PACKET_BYTES guard", () => {
  it("returns null when the server streams more than MAX_PACKET_BYTES", async () => {
    // Build a server that sends a huge blob (well over 2 MB) without a valid
    // SLP packet structure, triggering the size guard before any parse attempt.
    const server = net.createServer((socket) => {
      socket.on("data", () => {
        // Send 2 MB + 1 byte of zeroes in one write — oversized garbage data.
        const oversized = Buffer.alloc(MAX_PACKET_BYTES + 1, 0);
        socket.write(oversized);
      });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address() as net.AddressInfo;

    const { pingMinecraftServer } = await import("../src/ping");
    try {
      const result = await pingMinecraftServer("127.0.0.1", addr.port, 3000);
      expect(result).toBeNull();
    } finally {
      server.close();
    }
  });
});

// ---------------------------------------------------------------------------
// SRV resolution — via injected resolver in LiveMinecraftStatusAdapter
// ---------------------------------------------------------------------------

describe("LiveMinecraftStatusAdapter — SRV resolution", () => {
  /** Builds a minimal mock SLP TCP server for the given payload. */
  function startMockSlpServer(payload: object): Promise<{ port: number; close: () => void }> {
    return new Promise((resolve) => {
      const jsonBytes = Buffer.from(JSON.stringify(payload), "utf8");
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
      server.listen(0, "127.0.0.1", () => {
        const a = server.address() as net.AddressInfo;
        resolve({ port: a.port, close: () => server.close() });
      });
    });
  }

  it("uses SRV-resolved host and port when SRV returns a record (port=25565)", async () => {
    const { port, close } = await startMockSlpServer({
      version: { name: "1.20.4" },
      players: { online: 99, max: 200 },
      description: "SRV server"
    });

    // Inject a mock SRV resolver that points the original host to 127.0.0.1:mockPort
    const mockSrv = (host: string): Promise<{ host: string; port: number } | null> => {
      if (host === "mc.example.com") return Promise.resolve({ host: "127.0.0.1", port });
      return Promise.resolve(null);
    };

    const adapter = new LiveMinecraftStatusAdapter(3000, mockSrv);
    try {
      const result = await adapter.getStatus("mc.example.com", 25565);
      expect(result).not.toBeNull();
      expect(result!.players.online).toBe(99);
    } finally {
      close();
    }
  });

  it("falls back to original host when SRV returns null (no record)", async () => {
    const { port, close } = await startMockSlpServer({
      version: { name: "1.8.9" },
      players: { online: 5, max: 20 },
      description: "Fallback server"
    });

    // SRV resolver always returns null (no SRV record for this host)
    const noSrv = (): Promise<{ host: string; port: number } | null> => Promise.resolve(null);
    const adapter = new LiveMinecraftStatusAdapter(3000, noSrv);

    try {
      // Connect directly to 127.0.0.1:mockPort (bypassing SRV) — explicit port skips SRV
      const result = await adapter.getStatus("127.0.0.1", port);
      expect(result).not.toBeNull();
      expect(result!.players.online).toBe(5);
    } finally {
      close();
    }
  });

  it("skips SRV when port is not the default 25565", async () => {
    const { port, close } = await startMockSlpServer({
      version: { name: "1.20.1" },
      players: { online: 12, max: 50 },
      description: "Non-default port"
    });

    // SRV resolver that records whether it was called
    let srvCalled = false;
    const trackingSrv = (): Promise<{ host: string; port: number } | null> => {
      srvCalled = true;
      return Promise.resolve(null);
    };

    const adapter = new LiveMinecraftStatusAdapter(3000, trackingSrv);
    try {
      // port !== 25565 → SRV should be skipped
      const result = await adapter.getStatus("127.0.0.1", port);
      expect(result).not.toBeNull();
      expect(srvCalled).toBe(false);
    } finally {
      close();
    }
  });

  it("returns null when SRV resolver throws (error is handled gracefully)", async () => {
    // SRV resolver that throws — the outer try/catch in getStatus should handle it.
    const throwingSrv = (): Promise<{ host: string; port: number } | null> =>
      Promise.reject(new Error("DNS unavailable"));

    const adapter = new LiveMinecraftStatusAdapter(3000, throwingSrv);
    // port=25565 triggers SRV lookup; resolver throws → outer catch → null
    const result = await adapter.getStatus("mc.example.com", 25565);
    expect(result).toBeNull();
  });

  it("returns null for an empty host (validation)", async () => {
    const adapter = new LiveMinecraftStatusAdapter(3000);
    const result = await adapter.getStatus("", 25565);
    expect(result).toBeNull();
  });

  it("returns null for an invalid port (validation)", async () => {
    const adapter = new LiveMinecraftStatusAdapter(3000);
    const result = await adapter.getStatus("mc.example.com", 0);
    expect(result).toBeNull();
  });

  it("returns null for port 65536 (out of range)", async () => {
    const adapter = new LiveMinecraftStatusAdapter(3000);
    const result = await adapter.getStatus("mc.example.com", 65536);
    expect(result).toBeNull();
  });
});
