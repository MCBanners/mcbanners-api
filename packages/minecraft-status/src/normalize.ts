import type { McApiResponse } from "./mc-api-response";
import type { MinecraftServerStatus } from "./types";

/**
 * Normalizes a raw mc-api response into a typed MinecraftServerStatus.
 *
 * - Icon is preserved as a full data URI (or null for absent/empty).
 * - Player counts default to 0 when absent.
 * - MOTD fields default to empty string when absent.
 */
export const normalizeMinecraftServerStatus = (response: McApiResponse): MinecraftServerStatus => {
  const icon = response.icon;
  const iconDataUrl = icon && icon.length > 0 ? icon : null;

  return {
    host: response.host,
    port: response.port,
    version: response.version,
    players: {
      online: response.players.online,
      max: response.players.max
    },
    motd: {
      raw: response.motd.raw,
      colorless: response.motd.colorless,
      formatted: response.motd.formatted
    },
    iconDataUrl
  };
};
