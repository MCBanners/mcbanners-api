import { describe, expect, test } from "bun:test";

import {
  DEFAULT_SERVER_BANNER_SETTINGS,
  SERVER_BANNER_HEIGHT,
  SERVER_BANNER_LOGO_MAX_SIZE,
  SERVER_BANNER_WIDTH,
  SERVER_BANNER_WRAP_RIGHT_EDGE,
  buildServerBannerNodes,
  parseServerBannerSettings
} from "../src/layouts/server";
import type { RenderNode } from "../src/nodes/render-node";
import type { ImageNode } from "../src/nodes/image-node";
import type { SpriteNode } from "../src/nodes/sprite-node";
import type { TextNode } from "../src/nodes/text-node";
import type { WrappedTextNode } from "../src/nodes/wrapped-text-node";
import {
  ALL_FIXTURES,
  FIXTURE_EMPTY_VALUES_SERVER,
  FIXTURE_LONG_MOTD_SERVER,
  FIXTURE_NO_ICON_SERVER,
  FIXTURE_STANDARD_SERVER
} from "./fixtures/server-fixtures";

// ─── parseServerBannerSettings ───────────────────────────────────────────────

describe("parseServerBannerSettings", () => {
  test("returns defaults when rawQuery is null", () => {
    const settings = parseServerBannerSettings(null);
    expect(settings).toEqual(DEFAULT_SERVER_BANNER_SETTINGS);
  });

  test("returns defaults when rawQuery is empty", () => {
    const settings = parseServerBannerSettings({});
    expect(settings).toEqual(DEFAULT_SERVER_BANNER_SETTINGS);
  });

  test("overrides background template from query", () => {
    const settings = parseServerBannerSettings({ background__template: "BLUE_RADIAL" });
    expect(settings.background.template).toBe("BLUE_RADIAL");
  });

  test("overrides server name font size from query", () => {
    const settings = parseServerBannerSettings({ server_name__font_size: "24" });
    expect(settings.serverName.fontSize).toBe(24);
  });

  test("overrides server name display from query", () => {
    const settings = parseServerBannerSettings({ server_name__display: "Custom Name" });
    expect(settings.serverName.display).toBe("Custom Name");
  });

  test("overrides server name enable=false from query", () => {
    const settings = parseServerBannerSettings({ server_name__enable: "false" });
    expect(settings.serverName.enable).toBe(false);
  });

  test("overrides logo size from query", () => {
    const settings = parseServerBannerSettings({ logo__size: "64" });
    expect(settings.logo.size).toBe(64);
  });

  test("ignores invalid enum values and keeps defaults", () => {
    const settings = parseServerBannerSettings({ background__template: "NOT_A_TEMPLATE" });
    expect(settings.background.template).toBe(DEFAULT_SERVER_BANNER_SETTINGS.background.template);
  });

  test("parses all text namespaces independently", () => {
    const settings = parseServerBannerSettings({
      version__y: "40",
      motd__font_size: "12",
      players__enable: "false"
    });
    expect(settings.version.y).toBe(40);
    expect(settings.motd.fontSize).toBe(12);
    expect(settings.players.enable).toBe(false);
    // Untouched fields stay at defaults
    expect(settings.version.fontSize).toBe(DEFAULT_SERVER_BANNER_SETTINGS.version.fontSize);
  });
});

// ─── buildServerBannerNodes structure ────────────────────────────────────────

describe("buildServerBannerNodes", () => {
  test("produces a non-empty array of nodes", () => {
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    expect(nodes.length).toBeGreaterThan(0);
  });

  test("first node is the background ImageNode covering full canvas", () => {
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    const bg = nodes[0] as ImageNode;
    expect(bg.type).toBe("image");
    expect(bg.x).toBe(0);
    expect(bg.y).toBe(0);
    expect(bg.width).toBe(SERVER_BANNER_WIDTH);
    expect(bg.height).toBe(SERVER_BANNER_HEIGHT);
    expect(bg.assetKey).toBe("MOONLIGHT_PURPLE");
  });

  test("second node is an ImageNode with iconBase64 when icon is provided", () => {
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    const icon = nodes[1] as ImageNode;
    expect(icon.type).toBe("image");
    expect(icon.imageData).toBe(FIXTURE_STANDARD_SERVER.iconBase64);
  });

  test("second node is SpriteNode DEFAULT_SERVER_LOGO when no icon", () => {
    const nodes = buildServerBannerNodes(FIXTURE_NO_ICON_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    const sprite = nodes[1] as SpriteNode;
    expect(sprite.type).toBe("sprite");
    expect(sprite.assetKey).toBe("DEFAULT_SERVER_LOGO");
  });

  test("logo is vertically centered within canvas height", () => {
    const nodes = buildServerBannerNodes(FIXTURE_NO_ICON_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    const logo = nodes[1] as SpriteNode;
    const logoSize = DEFAULT_SERVER_BANNER_SETTINGS.logo.size;
    const expectedY = Math.floor((SERVER_BANNER_HEIGHT - logoSize) / 2);
    expect(logo.y).toBe(expectedY);
  });

  test("logo size is capped at SERVER_BANNER_LOGO_MAX_SIZE", () => {
    const settings = parseServerBannerSettings({ logo__size: "200" });
    const nodes = buildServerBannerNodes(FIXTURE_NO_ICON_SERVER, settings);
    const logo = nodes[1] as SpriteNode;
    expect(logo.width).toBe(SERVER_BANNER_LOGO_MAX_SIZE);
    expect(logo.height).toBe(SERVER_BANNER_LOGO_MAX_SIZE);
  });

  test("produces a TextNode for server name at default position", () => {
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    const nameNode = nodes.find(
      (n): n is TextNode => n.type === "text" && n.y === DEFAULT_SERVER_BANNER_SETTINGS.serverName.y
    );
    expect(nameNode).toBeDefined();
    expect(nameNode?.content).toBe(FIXTURE_STANDARD_SERVER.name);
    expect(nameNode?.fontWeight).toBe("bold");
  });

  test("server name uses display override when set", () => {
    const settings = parseServerBannerSettings({ server_name__display: "Override Name" });
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, settings);
    const nameNode = nodes.find(
      (n): n is TextNode => n.type === "text" && n.y === settings.serverName.y
    );
    expect(nameNode?.content).toBe("Override Name");
  });

  test("server name is omitted when enable=false", () => {
    const settings = parseServerBannerSettings({ server_name__enable: "false" });
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, settings);
    const nameNode = nodes.find(
      (n): n is TextNode => n.type === "text" && n.y === settings.serverName.y
    );
    expect(nameNode).toBeUndefined();
  });

  test("MOTD is a WrappedTextNode at default position", () => {
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    const motdNode = nodes.find(
      (n): n is WrappedTextNode =>
        n.type === "wrapped-text" && n.y === DEFAULT_SERVER_BANNER_SETTINGS.motd.y
    );
    expect(motdNode).toBeDefined();
    expect(motdNode?.content).toBe(FIXTURE_STANDARD_SERVER.motd);
  });

  test("MOTD wrap width equals SERVER_BANNER_WRAP_RIGHT_EDGE minus motd.x", () => {
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    const motdNode = nodes.find((n): n is WrappedTextNode => n.type === "wrapped-text");
    const expectedMaxWidth = SERVER_BANNER_WRAP_RIGHT_EDGE - DEFAULT_SERVER_BANNER_SETTINGS.motd.x;
    expect(motdNode?.maxWidth).toBe(expectedMaxWidth);
  });

  test("MOTD lineHeight equals motd fontSize", () => {
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    const motdNode = nodes.find((n): n is WrappedTextNode => n.type === "wrapped-text");
    expect(motdNode?.lineHeight).toBe(DEFAULT_SERVER_BANNER_SETTINGS.motd.fontSize);
  });

  test("MOTD does not set maxChars when default is 9999", () => {
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    const motdNode = nodes.find((n): n is WrappedTextNode => n.type === "wrapped-text");
    expect("maxChars" in (motdNode ?? {})).toBe(false);
  });

  test("MOTD sets maxChars when override is < 9999", () => {
    const settings = parseServerBannerSettings({ motd__max_chars: "50" });
    const nodes = buildServerBannerNodes(FIXTURE_LONG_MOTD_SERVER, settings);
    const motdNode = nodes.find((n): n is WrappedTextNode => n.type === "wrapped-text");
    expect(motdNode?.maxChars).toBe(50);
  });

  test("players TextNode shows combined count string", () => {
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    const playersNode = nodes.find(
      (n): n is TextNode => n.type === "text" && n.y === DEFAULT_SERVER_BANNER_SETTINGS.players.y
    );
    expect(playersNode?.content).toContain("42500");
    expect(playersNode?.content).toContain("200000");
  });

  test("players omitted when enable=false", () => {
    const settings = parseServerBannerSettings({ players__enable: "false" });
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, settings);
    const playersNode = nodes.find(
      (n): n is TextNode => n.type === "text" && n.y === DEFAULT_SERVER_BANNER_SETTINGS.players.y
    );
    expect(playersNode).toBeUndefined();
  });

  test("all nodes are JSON-serializable", () => {
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    const json = JSON.stringify(nodes);
    const parsed: RenderNode[] = JSON.parse(json) as RenderNode[];
    expect(parsed.length).toBe(nodes.length);
  });

  test("empty data produces valid node array without throwing", () => {
    expect(() => {
      buildServerBannerNodes(FIXTURE_EMPTY_VALUES_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    }).not.toThrow();
  });

  test("long MOTD fixture produces wrapped-text node without throwing", () => {
    expect(() => {
      buildServerBannerNodes(FIXTURE_LONG_MOTD_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    }).not.toThrow();
  });
});

// ─── Snapshot tests ───────────────────────────────────────────────────────────

describe("buildServerBannerNodes snapshots", () => {
  test("standard server node tree snapshot", () => {
    const nodes = buildServerBannerNodes(FIXTURE_STANDARD_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    // Snapshot the node types in order, not imageData (which is long)
    const summary = nodes.map((n) => ({
      type: n.type,
      x: n.x,
      y: n.y,
      ...(n.type === "text" || n.type === "wrapped-text" ? { content: n.content } : {}),
      ...(n.type === "image" || n.type === "sprite"
        ? { assetKey: "assetKey" in n ? n.assetKey : "(imageData)" }
        : {})
    }));
    expect(summary).toMatchSnapshot();
  });

  test("no-icon server node tree snapshot", () => {
    const nodes = buildServerBannerNodes(FIXTURE_NO_ICON_SERVER, DEFAULT_SERVER_BANNER_SETTINGS);
    const summary = nodes.map((n) => ({ type: n.type, x: n.x, y: n.y }));
    expect(summary).toMatchSnapshot();
  });
});

// ─── Parameterized fixture smoke tests ────────────────────────────────────────

describe("buildServerBannerNodes fixture smoke tests", () => {
  for (const { label, fixture } of ALL_FIXTURES) {
    test(`${label}: produces non-empty valid node array`, () => {
      const nodes = buildServerBannerNodes(fixture, DEFAULT_SERVER_BANNER_SETTINGS);
      expect(nodes.length).toBeGreaterThan(0);
      for (const node of nodes) {
        expect(node.type).toBeDefined();
        expect(typeof node.x).toBe("number");
        expect(typeof node.y).toBe("number");
      }
    });
  }
});
