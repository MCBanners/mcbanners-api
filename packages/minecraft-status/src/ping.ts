/**
 * Minecraft Server List Ping (SLP) client for protocol 1.7+.
 *
 * Sends the two-packet handshake+status-request sequence over TCP and parses
 * the JSON status response. Returns a McApiResponse-shaped object so it feeds
 * directly into the existing normalizeMinecraftServerStatus pipeline.
 *
 * References:
 * - https://wiki.vg/Server_List_Ping
 * - Java mc-api ServerStatusService (5-second timeout, MotdUtils processing)
 */

import * as net from "node:net";
import type { McApiResponse } from "./mc-api-response";
import { componentToLegacy, stripColors, cleanMotd } from "./motd-utils";

// ---------------------------------------------------------------------------
// Safety limits
// ---------------------------------------------------------------------------

/** Maximum accumulated TCP bytes before aborting — prevents memory exhaustion. */
const MAX_PACKET_BYTES = 2 * 1024 * 1024; // 2 MB

/** Maximum favicon data URI length. Oversized favicons are silently dropped. */
const MAX_FAVICON_BYTES = 65_536; // 64 KB

/** Maximum raw MOTD string length before any normalization. Excess is truncated. */
const MAX_MOTD_LENGTH = 32_768; // 32 KB

export { MAX_PACKET_BYTES, MAX_FAVICON_BYTES, MAX_MOTD_LENGTH };

// ---------------------------------------------------------------------------
// VarInt codec
// ---------------------------------------------------------------------------

/** Encodes a non-negative integer as a Minecraft VarInt (1–5 bytes). */
export function encodeVarInt(value: number): Buffer {
  const bytes: number[] = [];
  let v = value >>> 0; // treat as unsigned 32-bit
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v !== 0) byte |= 0x80;
    bytes.push(byte);
  } while (v !== 0);
  return Buffer.from(bytes);
}

interface VarIntResult {
  value: number;
  bytesRead: number;
}

/**
 * Reads a VarInt starting at `offset` in `buf`.
 * Returns null when there are not enough bytes (partial packet).
 * Throws when the VarInt is malformed (> 5 bytes).
 */
export function tryReadVarInt(buf: Buffer, offset: number): VarIntResult | null {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;
  while (offset + bytesRead < buf.length) {
    // noUncheckedIndexedAccess: use ! since we've already bounds-checked above
    const byte = buf[offset + bytesRead]!;
    bytesRead++;
    value |= (byte & 0x7f) << shift;
    shift += 7;
    if ((byte & 0x80) === 0) return { value, bytesRead };
    if (shift >= 35) throw new Error("VarInt too long");
  }
  return null; // partial — need more bytes
}

/** Encodes a UTF-8 string as a length-prefixed Minecraft string. */
function encodeString(str: string): Buffer {
  const strBytes = Buffer.from(str, "utf8");
  return Buffer.concat([encodeVarInt(strBytes.length), strBytes]);
}

/** Encodes an unsigned 16-bit integer as 2 big-endian bytes. */
function encodeUShort(value: number): Buffer {
  const buf = Buffer.allocUnsafe(2);
  buf.writeUInt16BE(value, 0);
  return buf;
}

// ---------------------------------------------------------------------------
// SLP raw JSON types
// ---------------------------------------------------------------------------

interface SlpVersion {
  name?: string;
  protocol?: number;
}

interface SlpPlayers {
  online?: number;
  max?: number;
}

interface SlpJsonResponse {
  version?: SlpVersion;
  players?: SlpPlayers;
  /** String or chat component object. */
  description?: unknown;
  /** Data URI: `data:image/png;base64,...` */
  favicon?: string;
}

// ---------------------------------------------------------------------------
// SLP JSON → McApiResponse
// ---------------------------------------------------------------------------

/**
 * Converts a raw SLP JSON response to our McApiResponse shape.
 *
 * - Version name is cleaned with MotdUtils.clean (strips §-codes, non-ASCII).
 * - MOTD raw preserves §-codes; colorless strips them; formatted cleans fully.
 * - Favicon is kept as-is (already a data URI in the SLP protocol).
 */
export function slpToMcApiResponse(
  slp: SlpJsonResponse,
  host: string,
  port: number
): McApiResponse {
  const versionName = slp.version?.name ?? "Unknown";
  const version = cleanMotd(versionName);

  // Truncate raw MOTD before normalization to prevent processing pathologically
  // long strings sent by malicious or misconfigured servers.
  const rawFull = componentToLegacy(slp.description ?? "").trim();
  const raw = rawFull.length > MAX_MOTD_LENGTH ? rawFull.slice(0, MAX_MOTD_LENGTH) : rawFull;
  const colorless = stripColors(raw);
  const formatted = cleanMotd(raw);

  const online = slp.players?.online ?? 0;
  const max = slp.players?.max ?? 0;

  // Drop oversized favicons (e.g. servers sending unexpectedly large icons).
  // Use a conditional spread to satisfy exactOptionalPropertyTypes.
  const favicon = slp.favicon;
  const iconEntry =
    favicon && favicon.length > 0 && favicon.length <= MAX_FAVICON_BYTES ? { icon: favicon } : {};

  return {
    host,
    port,
    version,
    players: { online, max },
    motd: { raw, colorless, formatted },
    ...iconEntry
  };
}

// ---------------------------------------------------------------------------
// Packet parser
// ---------------------------------------------------------------------------

/**
 * Attempts to parse a complete SLP status response from accumulated bytes.
 * Returns null when more data is needed (partial packet).
 * Throws on protocol errors (unexpected packet ID, malformed VarInt).
 */
export function tryParseStatusResponse(
  data: Buffer,
  host: string,
  port: number
): McApiResponse | null {
  let offset = 0;

  const packetLen = tryReadVarInt(data, offset);
  if (packetLen === null) return null;
  offset += packetLen.bytesRead;

  // Wait for the full packet payload to arrive.
  if (data.length < offset + packetLen.value) return null;

  const packetId = tryReadVarInt(data, offset);
  if (packetId === null) return null;
  offset += packetId.bytesRead;

  if (packetId.value !== 0x00) {
    throw new Error(`Unexpected SLP packet ID: 0x${packetId.value.toString(16)}`);
  }

  const jsonLen = tryReadVarInt(data, offset);
  if (jsonLen === null) return null;
  offset += jsonLen.bytesRead;

  if (data.length < offset + jsonLen.value) return null;

  const jsonStr = data.subarray(offset, offset + jsonLen.value).toString("utf8");
  const slp = JSON.parse(jsonStr) as SlpJsonResponse;
  return slpToMcApiResponse(slp, host, port);
}

// ---------------------------------------------------------------------------
// Public ping API
// ---------------------------------------------------------------------------

/**
 * Pings a Minecraft server using the Server List Ping (SLP) protocol (1.7+).
 *
 * Sends a handshake + status request over TCP and parses the JSON response.
 * Returns a McApiResponse on success, or null on timeout/connection error.
 *
 * @param host       - Hostname or IP address
 * @param port       - Server port (default 25565)
 * @param timeoutMs  - Timeout in milliseconds (default 5000, matching legacy mc-api)
 */
export async function pingMinecraftServer(
  host: string,
  port = 25565,
  timeoutMs = 5000
): Promise<McApiResponse | null> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const chunks: Buffer[] = [];
    let resolved = false;

    const done = (result: McApiResponse | null): void => {
      if (resolved) return;
      resolved = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs, () => {
      done(null);
    });
    socket.on("error", () => {
      done(null);
    });
    socket.on("close", () => {
      done(null);
    });

    socket.on("connect", () => {
      // Handshake packet
      // protocol version 765 = 1.20.4; irrelevant for status-only pings.
      const handshakePayload = Buffer.concat([
        encodeVarInt(0x00), // packet ID
        encodeVarInt(765), // protocol version
        encodeString(host), // server address
        encodeUShort(port), // server port (unsigned short, BE)
        encodeVarInt(1) // next state: 1 = status
      ]);
      const handshake = Buffer.concat([encodeVarInt(handshakePayload.length), handshakePayload]);

      // Status request packet (ID 0x00, no payload)
      const statusRequest = Buffer.concat([encodeVarInt(1), encodeVarInt(0x00)]);

      socket.write(Buffer.concat([handshake, statusRequest]));
    });

    socket.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      const data = Buffer.concat(chunks);

      // Abort if the server sends an unreasonably large response to prevent
      // unbounded memory growth.
      if (data.length > MAX_PACKET_BYTES) {
        done(null);
        return;
      }

      try {
        const result = tryParseStatusResponse(data, host, port);
        if (result !== null) done(result);
      } catch {
        done(null);
      }
    });
  });
}
