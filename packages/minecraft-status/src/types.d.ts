/**
 * Normalized Minecraft server player count information.
 */
export interface MinecraftServerPlayers {
  readonly online: number;
  readonly max: number;
}
/**
 * Normalized Minecraft server MOTD (Message of the Day).
 */
export interface MinecraftServerMotd {
  /** Raw MOTD string including Minecraft color/format codes (§). */
  readonly raw: string;
  /** MOTD with color/format codes stripped. */
  readonly colorless: string;
  /** MOTD with HTML-like formatting (may still contain Minecraft codes). */
  readonly formatted: string;
}
/**
 * Normalized representation of a Minecraft server status response.
 * Maps directly from mc-api's GET /server response.
 */
export interface MinecraftServerStatus {
  readonly host: string;
  readonly port: number;
  readonly version: string;
  readonly players: MinecraftServerPlayers;
  readonly motd: MinecraftServerMotd;
  /**
   * Server favicon as a data URI (`data:image/png;base64,...`),
   * or null when the server has no icon.
   */
  readonly iconDataUrl: string | null;
}
//# sourceMappingURL=types.d.ts.map
