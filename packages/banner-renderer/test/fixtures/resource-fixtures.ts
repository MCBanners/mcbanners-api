import type { ResourceBannerData } from "../../src/layouts/resource/resource-banner-data";

/** Minimal 1×1 pixel transparent PNG as base64 (no data URI prefix). */
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/** Spigot free resource with star rating. */
export const FIXTURE_SPIGOT_FREE: ResourceBannerData = {
  resource: {
    name: "EssentialsX",
    logoBase64: TINY_PNG_B64,
    downloadCount: 1_250_000,
    lastUpdated: "2024-06-15T12:00:00Z",
    rating: { count: 4320, average: 4.5 },
    price: null
  },
  author: { name: "md_5" },
  backend: "SPIGOT"
};

/** Spigot premium resource with price. */
export const FIXTURE_SPIGOT_PREMIUM: ResourceBannerData = {
  resource: {
    name: "LiteBans",
    logoBase64: TINY_PNG_B64,
    downloadCount: 85_000,
    lastUpdated: "2024-05-20T08:00:00Z",
    rating: { count: 730, average: 4.75 },
    price: { amount: 9.99, currency: "USD" }
  },
  author: { name: "Ruany" },
  backend: "SPIGOT"
};

/** Modrinth resource — shows Updated date, no stars. */
export const FIXTURE_MODRINTH: ResourceBannerData = {
  resource: {
    name: "Sodium",
    logoBase64: TINY_PNG_B64,
    downloadCount: 3_500_000,
    lastUpdated: "2024-07-01T00:00:00Z",
    rating: { count: 0, average: null },
    price: null
  },
  author: { name: "jellysquid3" },
  backend: "MODRINTH"
};

/** CurseForge resource — shows Updated date, no stars. */
export const FIXTURE_CURSEFORGE: ResourceBannerData = {
  resource: {
    name: "JourneyMap",
    logoBase64: TINY_PNG_B64,
    downloadCount: 250_000_000,
    lastUpdated: "2024-01-05T00:00:00Z",
    rating: { count: 1500, average: 4.8 },
    price: null
  },
  author: { name: "techbrew" },
  backend: "CURSEFORGE"
};

/** Hangar resource — shows "{n} stars" label, no star sprites. */
export const FIXTURE_HANGAR: ResourceBannerData = {
  resource: {
    name: "GriefPrevention",
    logoBase64: null,
    downloadCount: 42_000,
    lastUpdated: "2024-03-10T00:00:00Z",
    rating: { count: 188, average: 4.2 },
    price: null
  },
  author: { name: "BigScary" },
  backend: "HANGAR"
};

/** Resource with no logo — fallback sprite should render. */
export const FIXTURE_NO_LOGO: ResourceBannerData = {
  resource: {
    name: "SimpleVoiceChat",
    logoBase64: null,
    downloadCount: 9_500,
    lastUpdated: "2024-04-01T00:00:00Z",
    rating: { count: 55, average: 3.5 },
    price: null
  },
  author: { name: "henkelmax" },
  backend: "SPIGOT"
};

/** Resource with a very long name — tests truncation behavior. */
export const FIXTURE_LONG_NAME: ResourceBannerData = {
  resource: {
    name: "Ultra Advanced Multi-Dimensional World Management Plugin With Extra Features",
    logoBase64: null,
    downloadCount: 1_200,
    lastUpdated: "2024-02-14T00:00:00Z",
    rating: { count: 12, average: 3.0 },
    price: null
  },
  author: { name: "SomeDeveloper" },
  backend: "SPIGOT"
};

/** Resource with unicode characters in name and author. */
export const FIXTURE_UNICODE: ResourceBannerData = {
  resource: {
    name: "マインクラフトプラグイン",
    logoBase64: null,
    downloadCount: 500,
    lastUpdated: "2024-01-01T00:00:00Z",
    rating: { count: 8, average: 4.0 },
    price: null
  },
  author: { name: "作者名" },
  backend: "SPIGOT"
};

/** All fixtures as an array for parameterized tests. */
export const ALL_RESOURCE_FIXTURES: readonly { label: string; fixture: ResourceBannerData }[] = [
  { label: "spigot-free", fixture: FIXTURE_SPIGOT_FREE },
  { label: "spigot-premium", fixture: FIXTURE_SPIGOT_PREMIUM },
  { label: "modrinth", fixture: FIXTURE_MODRINTH },
  { label: "curseforge", fixture: FIXTURE_CURSEFORGE },
  { label: "hangar", fixture: FIXTURE_HANGAR },
  { label: "no-logo", fixture: FIXTURE_NO_LOGO },
  { label: "long-name", fixture: FIXTURE_LONG_NAME },
  { label: "unicode", fixture: FIXTURE_UNICODE }
];
