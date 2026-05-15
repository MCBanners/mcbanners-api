import type { McApiResponse } from "./mc-api-response";

/** Minimal 1×1 transparent PNG as a data URI. */
const TINY_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/** Standard server with icon and typical values. */
export const MC_FIXTURE_HYPIXEL: McApiResponse = {
  host: "mc.hypixel.net",
  port: 25565,
  version: "1.20.4",
  players: { online: 42_500, max: 200_000 },
  motd: {
    raw: "§aHypixel Network §7[1.8-1.20]",
    colorless: "Hypixel Network [1.8-1.20]",
    formatted: "Hypixel Network [1.8-1.20]"
  },
  icon: TINY_PNG_DATA_URL
};

/** Server with no icon — triggers sprite fallback. */
export const MC_FIXTURE_NO_ICON: McApiResponse = {
  host: "noicon.local",
  port: 25565,
  version: "1.21.0",
  players: { online: 3, max: 20 },
  motd: {
    raw: "A server without an icon",
    colorless: "A server without an icon",
    formatted: "A server without an icon"
  },
  icon: ""
};

/** Server with a long MOTD that will wrap. */
export const MC_FIXTURE_LONG_MOTD: McApiResponse = {
  host: "longmotd.local",
  port: 25565,
  version: "1.20.1",
  players: { online: 100, max: 500 },
  motd: {
    raw: "Welcome to our amazing Minecraft server! We have lots of games and activities for you to enjoy. Come join us today!",
    colorless:
      "Welcome to our amazing Minecraft server! We have lots of games and activities for you to enjoy. Come join us today!",
    formatted:
      "Welcome to our amazing Minecraft server! We have lots of games and activities for you to enjoy. Come join us today!"
  }
};

/** Server with unicode characters in name and MOTD. */
export const MC_FIXTURE_UNICODE: McApiResponse = {
  host: "unicode.local",
  port: 25565,
  version: "1.19.4",
  players: { online: 7, max: 50 },
  motd: {
    raw: "日本語のMOTDです。ようこそ！ 🎮",
    colorless: "日本語のMOTDです。ようこそ！ 🎮",
    formatted: "日本語のMOTDです。ようこそ！ 🎮"
  }
};

/** All default development fixtures as a lookup map. */
export const MC_STATUS_FIXTURES: Record<string, McApiResponse> = {
  "mc.hypixel.net:25565": MC_FIXTURE_HYPIXEL,
  "noicon.local:25565": MC_FIXTURE_NO_ICON,
  "longmotd.local:25565": MC_FIXTURE_LONG_MOTD,
  "unicode.local:25565": MC_FIXTURE_UNICODE
};
