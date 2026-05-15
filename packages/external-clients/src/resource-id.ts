export const resourcePlatformValues = [
  "SPIGOT",
  "CURSEFORGE",
  "BUILTBYBIT",
  "POLYMART",
  "MODRINTH",
  "HANGAR",
  "ORE"
] as const;

export type ResourcePlatform = (typeof resourcePlatformValues)[number];

export const normalizeResourcePlatform = (platform: string): ResourcePlatform | null => {
  const normalized = platform.toUpperCase();
  return resourcePlatformValues.includes(normalized as ResourcePlatform)
    ? (normalized as ResourcePlatform)
    : null;
};

/**
 * Normalizes public resource route IDs before client lookup and cache-key use.
 *
 * Numeric-ID platforms intentionally preserve the caller's string. This avoids
 * silently changing values such as leading-zero IDs at the route/cache boundary.
 */
export const normalizeResourceId = (platform: string, id: string): string => {
  const normalizedPlatform = normalizeResourcePlatform(platform);

  switch (normalizedPlatform) {
    case "MODRINTH":
      return id.toLowerCase();
    case "HANGAR":
      return id
        .split("/")
        .map((segment) => segment.toLowerCase())
        .join("/");
    case "ORE":
      return id.toLowerCase();
    case "SPIGOT":
    case "CURSEFORGE":
    case "BUILTBYBIT":
    case "POLYMART":
    case null:
      return id;
  }
};
