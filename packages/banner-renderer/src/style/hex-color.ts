// Accepts: fff, #fff, FFF, #FFF, ffffff, #ffffff, FFFFFF, #FFFFFF
// Accepts 3-char shorthand: 0f8 → #00ff88, #0F8 → #00ff88
// Returns canonical lowercase #rrggbb string, or null if invalid.
// Rejects: named colors, rgb(), rgba(), hsl(), #rrggbbaa, invalid chars
export const parseHexColor = (raw: string): string | null => {
  let hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (hex.length === 3) {
    hex = hex[0]! + hex[0]! + hex[1]! + hex[1]! + hex[2]! + hex[2]!;
  } else if (hex.length !== 6) {
    return null;
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }
  return `#${hex.toLowerCase()}`;
};
