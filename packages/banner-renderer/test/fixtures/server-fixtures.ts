import type { ServerBannerData } from "../../src/layouts/server/server-banner-data";

/** Minimal 1×1 pixel transparent PNG as base64 (no data URI prefix). */
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/** Standard server with icon, short MOTD, typical values. */
export const FIXTURE_STANDARD_SERVER: ServerBannerData = {
  name: "Hypixel",
  version: "1.20.4",
  motd: "The Minecraft Server Network",
  onlinePlayers: 42_500,
  maxPlayers: 200_000,
  iconBase64: TINY_PNG_B64
};

/** Server with no icon — falls back to DEFAULT_SERVER_LOGO sprite. */
export const FIXTURE_NO_ICON_SERVER: ServerBannerData = {
  name: "LocalDev Server",
  version: "1.21.0",
  motd: "A server without an icon",
  onlinePlayers: 3,
  maxPlayers: 20,
  iconBase64: null
};

/** Server with a MOTD that exceeds the default 191px wrap width. */
export const FIXTURE_LONG_MOTD_SERVER: ServerBannerData = {
  name: "Long MOTD Server",
  version: "1.20.1",
  motd: "Welcome to our amazing Minecraft server! We have lots of games and activities for you to enjoy. Come join us today!",
  onlinePlayers: 100,
  maxPlayers: 500,
  iconBase64: null
};

/** Server with unicode characters in name and MOTD. */
export const FIXTURE_UNICODE_SERVER: ServerBannerData = {
  name: "サーバー名",
  version: "1.19.4",
  motd: "日本語のMOTDです。ようこそ！ 🎮",
  onlinePlayers: 7,
  maxPlayers: 50,
  iconBase64: null
};

/** Server with empty/minimal values — tests fallback rendering. */
export const FIXTURE_EMPTY_VALUES_SERVER: ServerBannerData = {
  name: "",
  version: "",
  motd: "",
  onlinePlayers: 0,
  maxPlayers: 0,
  iconBase64: null
};

/** All fixtures as an array for parameterized tests. */
export const ALL_FIXTURES: readonly { label: string; fixture: ServerBannerData }[] = [
  { label: "standard-with-icon", fixture: FIXTURE_STANDARD_SERVER },
  { label: "no-icon", fixture: FIXTURE_NO_ICON_SERVER },
  { label: "long-motd", fixture: FIXTURE_LONG_MOTD_SERVER },
  { label: "unicode", fixture: FIXTURE_UNICODE_SERVER },
  { label: "empty-values", fixture: FIXTURE_EMPTY_VALUES_SERVER }
];
