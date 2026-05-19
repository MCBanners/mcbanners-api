import { describe, expect, test } from "bun:test";

import {
  parseHexColor,
  parseBannerStyleSettings,
  validateBannerStyleSettings,
  canonicalizeBannerStyleSettings,
  SHADOW_PRESETS,
  buildResourceBannerNodes,
  DEFAULT_RESOURCE_BANNER_SETTINGS
} from "../src";
import type { RenderNode } from "../src/nodes/render-node";
import type { FillRectNode } from "../src/nodes/fill-rect-node";
import type { TextNode } from "../src/nodes/text-node";
import { FIXTURE_SPIGOT_FREE } from "./fixtures/resource-fixtures";

// ─── parseHexColor ─────────────────────────────────────────────────────────

describe("parseHexColor — valid inputs", () => {
  test.each([
    ["fff", "#ffffff"],
    ["#fff", "#ffffff"],
    ["FFF", "#ffffff"],
    ["#FFF", "#ffffff"],
    ["ffffff", "#ffffff"],
    ["#ffffff", "#ffffff"],
    ["FFFFFF", "#ffffff"],
    ["#FFFFFF", "#ffffff"],
    ["0f8", "#00ff88"],
    ["#0F8", "#00ff88"],
    ["1a2b3c", "#1a2b3c"],
    ["#1A2B3C", "#1a2b3c"]
  ])("parseHexColor(%s) → %s", (input, expected) => {
    expect(parseHexColor(input)).toBe(expected);
  });
});

describe("parseHexColor — invalid inputs", () => {
  test.each([
    ["white"],
    ["rgb(255,255,255)"],
    ["rgba(0,0,0,1)"],
    ["hsl(0,0%,100%)"],
    ["transparent"],
    ["#ffff"],
    ["#rrgggg"],
    ["#rrggbbaa"],
    ["gg0000"],
    [""]
  ])("parseHexColor(%s) → null", (input) => {
    expect(parseHexColor(input)).toBeNull();
  });
});

// ─── parseBannerStyleSettings ──────────────────────────────────────────────

describe("parseBannerStyleSettings", () => {
  test("returns null for empty query (legacy path)", () => {
    expect(parseBannerStyleSettings({})).toBeNull();
  });

  test("returns null for query with no style fields", () => {
    expect(parseBannerStyleSettings({ template: "MOONLIGHT_PURPLE" })).toBeNull();
  });

  test("parses style__version=1 with solid background", () => {
    const result = parseBannerStyleSettings({
      style__version: "1",
      background__mode: "solid",
      background__color: "#ff0000"
    });
    expect(result).not.toBeNull();
    expect(result!.version).toBe(1);
    expect(result!.background.mode).toBe("solid");
    expect(result!.background.color).toBe("#ff0000");
  });

  test("infers v1 from explicit style field without style__version", () => {
    const result = parseBannerStyleSettings({
      background__mode: "solid",
      background__color: "ffffff"
    });
    expect(result).not.toBeNull();
    expect(result!.background.mode).toBe("solid");
  });

  test("parses text color fields", () => {
    const result = parseBannerStyleSettings({
      style__version: "1",
      text__primary_color: "ff0000",
      text__secondary_color: "#00ff00",
      text__accent_color: "0000FF"
    });
    expect(result!.text.primaryColor).toBe("#ff0000");
    expect(result!.text.secondaryColor).toBe("#00ff00");
    expect(result!.text.accentColor).toBe("#0000ff");
  });

  test("parses shadow preset", () => {
    const result = parseBannerStyleSettings({ shadow__preset: "soft" });
    expect(result!.shadowPreset).toBe("soft");
  });

  test("parses logo__y offset", () => {
    const result = parseBannerStyleSettings({ logo__y: "10" });
    expect(result!.logoYOffset).toBe(10);
  });

  test("clamps logo__y to [-50, 50]", () => {
    expect(parseBannerStyleSettings({ logo__y: "999" })!.logoYOffset).toBe(50);
    expect(parseBannerStyleSettings({ logo__y: "-999" })!.logoYOffset).toBe(-50);
  });

  test("logo__y defaults to 0 when missing", () => {
    const result = parseBannerStyleSettings({ style__version: "1" });
    expect(result!.logoYOffset).toBe(0);
  });
});

// ─── validateBannerStyleSettings ──────────────────────────────────────────

describe("validateBannerStyleSettings", () => {
  test("returns empty array for legacy query", () => {
    expect(validateBannerStyleSettings({})).toHaveLength(0);
  });

  test("rejects unsupported style version", () => {
    const errors = validateBannerStyleSettings({ style__version: "99" });
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe("UNSUPPORTED_STYLE_VERSION");
    expect(errors[0]!.field).toBe("style__version");
  });

  test("rejects invalid background mode", () => {
    const errors = validateBannerStyleSettings({ background__mode: "gradient" });
    expect(errors.some((e) => e.code === "INVALID_BACKGROUND_MODE")).toBe(true);
  });

  test("rejects solid mode without background__color", () => {
    const errors = validateBannerStyleSettings({ background__mode: "solid" });
    expect(errors.some((e) => e.code === "MISSING_BACKGROUND_COLOR")).toBe(true);
  });

  test("rejects invalid hex color for background__color", () => {
    const errors = validateBannerStyleSettings({
      background__mode: "solid",
      background__color: "not-a-color"
    });
    expect(
      errors.some((e) => e.code === "INVALID_HEX_COLOR" && e.field === "background__color")
    ).toBe(true);
  });

  test("rejects invalid hex for text colors", () => {
    const errorsP = validateBannerStyleSettings({ text__primary_color: "white" });
    expect(
      errorsP.some((e) => e.code === "INVALID_HEX_COLOR" && e.field === "text__primary_color")
    ).toBe(true);

    const errorsS = validateBannerStyleSettings({ text__secondary_color: "rgb(0,0,0)" });
    expect(
      errorsS.some((e) => e.code === "INVALID_HEX_COLOR" && e.field === "text__secondary_color")
    ).toBe(true);

    const errorsA = validateBannerStyleSettings({ text__accent_color: "#rrggbb" });
    expect(
      errorsA.some((e) => e.code === "INVALID_HEX_COLOR" && e.field === "text__accent_color")
    ).toBe(true);
  });

  test("rejects invalid shadow preset", () => {
    const errors = validateBannerStyleSettings({ shadow__preset: "ultra" });
    expect(errors.some((e) => e.code === "INVALID_SHADOW_PRESET")).toBe(true);
  });

  test("accepts valid shadow presets", () => {
    expect(validateBannerStyleSettings({ shadow__preset: "none" })).toHaveLength(0);
    expect(validateBannerStyleSettings({ shadow__preset: "soft" })).toHaveLength(0);
    expect(validateBannerStyleSettings({ shadow__preset: "strong" })).toHaveLength(0);
  });

  test("rejects logo__y out of range", () => {
    const errors = validateBannerStyleSettings({ logo__y: "51" });
    expect(errors.some((e) => e.code === "INVALID_LOGO_Y")).toBe(true);
  });

  test("rejects non-integer logo__y", () => {
    const errors = validateBannerStyleSettings({ logo__y: "3.5" });
    expect(errors.some((e) => e.code === "INVALID_LOGO_Y")).toBe(true);
  });

  test("accepts valid logo__y values", () => {
    expect(validateBannerStyleSettings({ logo__y: "0" })).toHaveLength(0);
    expect(validateBannerStyleSettings({ logo__y: "-50" })).toHaveLength(0);
    expect(validateBannerStyleSettings({ logo__y: "50" })).toHaveLength(0);
  });
});

// ─── canonicalizeBannerStyleSettings ──────────────────────────────────────

describe("canonicalizeBannerStyleSettings", () => {
  test("returns empty object for legacy query", () => {
    expect(canonicalizeBannerStyleSettings({})).toEqual({});
  });

  test("adds style__version=1 when non-default fields are present", () => {
    const result = canonicalizeBannerStyleSettings({
      background__mode: "solid",
      background__color: "ff0000"
    });
    expect(result["style__version"]).toBe("1");
    expect(result["background__mode"]).toBe("solid");
    expect(result["background__color"]).toBe("#ff0000");
  });

  test("does not store default background__mode=template", () => {
    const result = canonicalizeBannerStyleSettings({ background__mode: "template" });
    expect("background__mode" in result).toBe(false);
    expect("style__version" in result).toBe(false);
  });

  test("does not store logo__y when it is 0", () => {
    const result = canonicalizeBannerStyleSettings({ logo__y: "0" });
    expect("logo__y" in result).toBe(false);
    expect("style__version" in result).toBe(false);
  });

  test("canonicalizes hex colors to lowercase #rrggbb", () => {
    const result = canonicalizeBannerStyleSettings({
      background__mode: "solid",
      background__color: "FFF"
    });
    expect(result["background__color"]).toBe("#ffffff");
  });
});

// ─── SHADOW_PRESETS constants ─────────────────────────────────────────────

describe("SHADOW_PRESETS", () => {
  test("none maps to null", () => {
    expect(SHADOW_PRESETS.none).toBeNull();
  });

  test("soft is a deterministic TextShadow object", () => {
    const s = SHADOW_PRESETS.soft;
    expect(s).not.toBeNull();
    expect(s!.offsetX).toBe(1);
    expect(s!.offsetY).toBe(1);
    expect(s!.blur).toBe(2);
    expect(typeof s!.color).toBe("string");
  });

  test("strong is a deterministic TextShadow object stronger than soft", () => {
    const s = SHADOW_PRESETS.strong;
    expect(s).not.toBeNull();
    expect(s!.offsetX).toBeGreaterThan(SHADOW_PRESETS.soft!.offsetX);
    expect(s!.offsetY).toBeGreaterThan(SHADOW_PRESETS.soft!.offsetY);
    expect(s!.blur).toBeGreaterThan(SHADOW_PRESETS.soft!.blur);
  });
});

// ─── buildResourceBannerNodes — style integration ─────────────────────────

const getFirstNode = (nodes: readonly RenderNode[]): RenderNode => nodes[0]!;
const getTextNodes = (nodes: readonly RenderNode[]): TextNode[] =>
  nodes.filter((n): n is TextNode => n.type === "text");

describe("buildResourceBannerNodes — legacy (no style)", () => {
  test("first node is an image node (template background)", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    expect(getFirstNode(nodes).type).toBe("image");
  });

  test("text nodes have no shadow property by default", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const texts = getTextNodes(nodes);
    expect(texts.length).toBeGreaterThan(0);
    texts.forEach((n) => {
      expect(n.shadow).toBeUndefined();
    });
  });
});

describe("buildResourceBannerNodes — solid background", () => {
  const style = parseBannerStyleSettings({
    background__mode: "solid",
    background__color: "#1a2b3c"
  })!;

  test("first node is a fill-rect node", () => {
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS,
      style
    );
    const first = getFirstNode(nodes);
    expect(first.type).toBe("fill-rect");
  });

  test("fill-rect covers full banner canvas", () => {
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS,
      style
    );
    const rect = getFirstNode(nodes) as FillRectNode;
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
    expect(rect.width).toBe(300);
    expect(rect.height).toBe(100);
  });

  test("fill-rect color matches the provided hex", () => {
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS,
      style
    );
    const rect = getFirstNode(nodes) as FillRectNode;
    expect(rect.color.r).toBe(0x1a);
    expect(rect.color.g).toBe(0x2b);
    expect(rect.color.b).toBe(0x3c);
  });
});

describe("buildResourceBannerNodes — text colors", () => {
  test("primary color applies to text nodes", () => {
    const style = parseBannerStyleSettings({ text__primary_color: "ff0000" })!;
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS,
      style
    );
    const texts = getTextNodes(nodes);
    const primaryNode = texts[0]!;
    expect(primaryNode.color.r).toBe(255);
    expect(primaryNode.color.g).toBe(0);
    expect(primaryNode.color.b).toBe(0);
  });

  test("missing text color fields fall back to default color behavior", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const noStyleNodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS,
      null
    );
    expect(JSON.stringify(nodes)).toBe(JSON.stringify(noStyleNodes));
  });
});

describe("buildResourceBannerNodes — shadow presets", () => {
  test("shadow__preset=none → no shadow on text nodes", () => {
    const style = parseBannerStyleSettings({ shadow__preset: "none" })!;
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS,
      style
    );
    const texts = getTextNodes(nodes);
    texts.forEach((n) => {
      expect(n.shadow).toBeUndefined();
    });
  });

  test("shadow__preset=soft → TextShadow on text nodes", () => {
    const style = parseBannerStyleSettings({ shadow__preset: "soft" })!;
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS,
      style
    );
    const texts = getTextNodes(nodes);
    expect(texts.length).toBeGreaterThan(0);
    texts.forEach((n) => {
      expect(n.shadow).toBeDefined();
      expect(n.shadow!.offsetX).toBe(1);
      expect(n.shadow!.offsetY).toBe(1);
    });
  });

  test("shadow__preset=strong → TextShadow with larger offsets", () => {
    const style = parseBannerStyleSettings({ shadow__preset: "strong" })!;
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS,
      style
    );
    const texts = getTextNodes(nodes);
    texts.forEach((n) => {
      expect(n.shadow).toBeDefined();
      expect(n.shadow!.offsetX).toBe(2);
      expect(n.shadow!.offsetY).toBe(2);
    });
  });
});

describe("buildResourceBannerNodes — logo Y offset", () => {
  const logoSize = DEFAULT_RESOURCE_BANNER_SETTINGS.logo.size;
  const baseY = Math.floor((100 - logoSize) / 2);

  // Use solid background so node[0] is fill-rect and node[1] is the logo,
  // making it unambiguous which node is the logo vs. background.
  const bgStyle = (logoY: string) =>
    parseBannerStyleSettings({
      background__mode: "solid",
      background__color: "#000000",
      logo__y: logoY
    })!;

  test("logo__y=0 preserves auto-centered position", () => {
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS,
      bgStyle("0")
    );
    // node[0] is fill-rect; node[1] is the logo (image or sprite)
    const logo = nodes.find((n) => n.type === "image" || n.type === "sprite")!;
    expect(logo.y).toBe(baseY);
  });

  test("positive logo__y shifts logo down", () => {
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS,
      bgStyle("10")
    );
    const logo = nodes.find((n) => n.type === "image" || n.type === "sprite")!;
    expect(logo.y).toBe(baseY + 10);
  });

  test("negative logo__y shifts logo up", () => {
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS,
      bgStyle("-5")
    );
    const logo = nodes.find((n) => n.type === "image" || n.type === "sprite")!;
    expect(logo.y).toBe(baseY - 5);
  });
});

// ─── saved-banner compatibility ────────────────────────────────────────────

describe("saved-banner compatibility", () => {
  test("null style produces same output as no style argument", () => {
    const noStyleNodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS
    );
    const nullStyleNodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_FREE,
      DEFAULT_RESOURCE_BANNER_SETTINGS,
      null
    );
    expect(JSON.stringify(noStyleNodes)).toBe(JSON.stringify(nullStyleNodes));
  });

  test("saved config with style__version=1 resolves v1 style settings", () => {
    const savedSettings = {
      style__version: "1",
      background__mode: "solid",
      background__color: "#abcdef"
    };
    const style = parseBannerStyleSettings(savedSettings);
    expect(style).not.toBeNull();
    expect(style!.version).toBe(1);
    expect(style!.background.mode).toBe("solid");
  });

  test("saved config without style fields returns null (legacy behavior)", () => {
    const savedSettings = { template: "MOONLIGHT_PURPLE", logoSize: "80" };
    expect(parseBannerStyleSettings(savedSettings)).toBeNull();
  });

  test("invalid optional style field in saved config is handled defensively by parse", () => {
    const savedSettings = {
      style__version: "1",
      background__mode: "solid",
      background__color: "not-valid-hex"
    };
    const style = parseBannerStyleSettings(savedSettings);
    // parse is forgiving — returns a result but bgColor is null
    expect(style).not.toBeNull();
    expect(style!.background.color).toBeNull();
  });
});
