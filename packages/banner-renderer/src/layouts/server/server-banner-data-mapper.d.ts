import type { MinecraftServerStatus } from "@mcbanners/minecraft-status";
import type { ServerBannerData } from "./server-banner-data";
/**
 * Maps a normalized MinecraftServerStatus to ServerBannerData for layout use.
 *
 * - Uses `motd.colorless` as the MOTD text (plain text, no Minecraft codes).
 * - Strips the `data:image/png;base64,` prefix from icon data URIs.
 * - Returns null for iconBase64 when the server has no icon.
 */
export declare const mapStatusToServerBannerData: (
  status: MinecraftServerStatus
) => ServerBannerData;
//# sourceMappingURL=server-banner-data-mapper.d.ts.map
