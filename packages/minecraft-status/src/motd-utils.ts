/**
 * Minecraft MOTD text processing utilities.
 *
 * Ports Java MotdUtils from mc-api and adds a chat component serializer
 * to convert SLP JSON description objects to legacy §-coded strings,
 * mirroring Kyori Adventure's LegacyComponentSerializer.legacySection().
 */

/** Maps chat component color names to Minecraft § color codes. */
const COLOR_CODES: Record<string, string> = {
  black: "§0",
  dark_blue: "§1",
  dark_green: "§2",
  dark_aqua: "§3",
  dark_red: "§4",
  dark_purple: "§5",
  gold: "§6",
  gray: "§7",
  dark_gray: "§8",
  blue: "§9",
  green: "§a",
  aqua: "§b",
  red: "§c",
  light_purple: "§d",
  yellow: "§e",
  white: "§f"
};

/** Typed view of a chat component object from the SLP JSON response. */
interface ChatComponent {
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underlined?: boolean;
  strikethrough?: boolean;
  obfuscated?: boolean;
  text?: string;
  translate?: string;
  extra?: unknown[];
}

/**
 * Converts a Minecraft chat component (from an SLP JSON description field) to
 * a legacy §-coded string.
 *
 * Handles:
 * - Plain strings (already §-coded or plain text)
 * - Text components: `{ text, color, bold, italic, ... }`
 * - Components with `extra` arrays
 * - Translate components (rendered as the translate key, no args substitution)
 *
 * RGB hex colors (1.16+, e.g. `"#aabbcc"`) have no § equivalent and are omitted.
 */
export function componentToLegacy(component: unknown): string {
  if (typeof component === "string") return component;
  if (component === null || typeof component !== "object") return "";

  const comp = component as ChatComponent;
  let out = "";

  if (typeof comp.color === "string") {
    const code = COLOR_CODES[comp.color];
    if (code) out += code;
    // RGB hex colors (e.g. "#aabbcc") are skipped — no § equivalent.
  }
  if (comp.bold === true) out += "§l";
  if (comp.italic === true) out += "§o";
  if (comp.underlined === true) out += "§n";
  if (comp.strikethrough === true) out += "§m";
  if (comp.obfuscated === true) out += "§k";

  if (typeof comp.text === "string") {
    out += comp.text;
  } else if (typeof comp.translate === "string") {
    out += comp.translate;
  }

  if (Array.isArray(comp.extra)) {
    for (const child of comp.extra) {
      out += componentToLegacy(child);
    }
  }

  return out;
}

/**
 * Strips Minecraft color/format codes (§x) from a string.
 * Port of Java MotdUtils.stripColors.
 */
export function stripColors(input: string): string {
  return input.replace(/§[0-9a-fk-or]/gi, "").trim();
}

/**
 * Cleans an MOTD or version string: strips color codes, strips non-ASCII
 * characters, collapses newlines and multiple spaces, and trims.
 *
 * Port of Java MotdUtils.clean.
 */
export function cleanMotd(input: string): string {
  return input
    .replace(/§[0-9a-fk-or]/gi, "") // strip Minecraft color/format codes
    .replace(/[\x80-\uFFFF]/g, "") // strip non-ASCII characters
    .replace(/[\r\n]+/g, " ") // collapse newlines to a single space
    .replace(/\s{2,}/g, " ") // collapse consecutive whitespace
    .trim();
}
