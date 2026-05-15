const DATA_URI_PREFIX = "data:image/png;base64,";
/**
 * Maps a normalized MinecraftServerStatus to ServerBannerData for layout use.
 *
 * - Uses `motd.colorless` as the MOTD text (plain text, no Minecraft codes).
 * - Strips the `data:image/png;base64,` prefix from icon data URIs.
 * - Returns null for iconBase64 when the server has no icon.
 */
export const mapStatusToServerBannerData = (status) => {
    let iconBase64 = null;
    if (status.iconDataUrl !== null) {
        iconBase64 = status.iconDataUrl.startsWith(DATA_URI_PREFIX)
            ? status.iconDataUrl.slice(DATA_URI_PREFIX.length)
            : status.iconDataUrl;
    }
    return {
        name: status.host,
        version: status.version,
        motd: status.motd.colorless,
        onlinePlayers: status.players.online,
        maxPlayers: status.players.max,
        iconBase64
    };
};
