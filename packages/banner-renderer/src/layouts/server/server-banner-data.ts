/**
 * Data provided by a Minecraft server ping response (mc-api or fixture).
 * No live network requests — callers supply this structure.
 */
export interface ServerBannerData {
  /** Server hostname used as the display name when no override is set. */
  readonly name: string;
  /** Minecraft server version string, e.g. "1.20.4". */
  readonly version: string;
  /**
   * MOTD text with Minecraft color/format codes stripped (plain text only).
   * Corresponds to the `formatted` or `colorless` field from mc-api.
   */
  readonly motd: string;
  /** Number of players currently online. */
  readonly onlinePlayers: number;
  /** Maximum player capacity, or null when the provider does not expose it. */
  readonly maxPlayers: number | null;
  /**
   * Base64-encoded server icon PNG (64×64 pixels), without the
   * `data:image/png;base64,` prefix. Null when the server has no icon.
   */
  readonly iconBase64: string | null;
}
