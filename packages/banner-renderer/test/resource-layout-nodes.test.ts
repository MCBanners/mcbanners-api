import { describe, expect, test } from "bun:test";
import type { ResourceBannerData } from "../src/layouts/resource";
import {
  buildResourceBannerNodes,
  DEFAULT_RESOURCE_BANNER_SETTINGS,
  parseResourceBannerSettings,
  RESOURCE_BANNER_HEIGHT,
  RESOURCE_BANNER_LOGO_MAX_SIZE,
  RESOURCE_BANNER_STAR_SIZE,
  RESOURCE_BANNER_WIDTH
} from "../src/layouts/resource";
import type { ImageNode } from "../src/nodes/image-node";
import type { RenderNode } from "../src/nodes/render-node";
import type { SpriteNode } from "../src/nodes/sprite-node";
import type { TextNode } from "../src/nodes/text-node";
import { formatUpdatedDate } from "../src/text/date-util";
import { abbreviateNumber } from "../src/text/number-util";
import {
  ALL_RESOURCE_FIXTURES,
  FIXTURE_CURSEFORGE,
  FIXTURE_HANGAR,
  FIXTURE_LONG_NAME,
  FIXTURE_MODRINTH,
  FIXTURE_NO_LOGO,
  FIXTURE_SPIGOT_FREE,
  FIXTURE_SPIGOT_PREMIUM,
  FIXTURE_UNICODE
} from "./fixtures/resource-fixtures";

// ─── abbreviateNumber ─────────────────────────────────────────────────────────

describe("abbreviateNumber", () => {
  test("returns raw number when < 1000", () => {
    expect(abbreviateNumber(0)).toBe("0");
    expect(abbreviateNumber(999)).toBe("999");
  });

  test("abbreviates thousands", () => {
    expect(abbreviateNumber(1000)).toBe("1K");
    expect(abbreviateNumber(1500)).toBe("1.5K");
    expect(abbreviateNumber(10_000)).toBe("10K");
    expect(abbreviateNumber(15_000)).toBe("15K");
    expect(abbreviateNumber(100_000)).toBe("100K");
  });

  test("abbreviates millions", () => {
    expect(abbreviateNumber(1_000_000)).toBe("1M");
    expect(abbreviateNumber(1_500_000)).toBe("1.5M");
    expect(abbreviateNumber(250_000_000)).toBe("250M");
  });

  test("abbreviates billions", () => {
    expect(abbreviateNumber(1_000_000_000)).toBe("1G");
    expect(abbreviateNumber(3_500_000_000)).toBe("3.5G");
  });

  test("handles negative numbers", () => {
    expect(abbreviateNumber(-1500)).toBe("-1.5K");
  });

  test("handles non-finite gracefully", () => {
    expect(abbreviateNumber(Infinity)).toBe("0");
    expect(abbreviateNumber(NaN)).toBe("0");
  });
});

// ─── formatUpdatedDate ────────────────────────────────────────────────────────

describe("formatUpdatedDate", () => {
  test("formats M/dd/yyyy without leading zero on month", () => {
    expect(formatUpdatedDate("2024-01-05T00:00:00Z")).toBe("1/05/2024");
    expect(formatUpdatedDate("2024-12-31T23:59:00Z")).toBe("12/31/2024");
  });

  test("day always has leading zero", () => {
    expect(formatUpdatedDate("2024-03-01T00:00:00Z")).toBe("3/01/2024");
  });

  test("uses UTC timezone", () => {
    // 2024-01-05T23:00:00Z is Jan 5 in UTC, Jan 6 in UTC+1
    expect(formatUpdatedDate("2024-01-05T23:00:00Z")).toBe("1/05/2024");
  });
});

// ─── parseResourceBannerSettings ─────────────────────────────────────────────

describe("parseResourceBannerSettings", () => {
  test("returns defaults when rawQuery is null", () => {
    const settings = parseResourceBannerSettings(null);
    expect(settings).toEqual(DEFAULT_RESOURCE_BANNER_SETTINGS);
  });

  test("returns defaults when rawQuery is empty", () => {
    const settings = parseResourceBannerSettings({});
    expect(settings).toEqual(DEFAULT_RESOURCE_BANNER_SETTINGS);
  });

  test("overrides background template from query", () => {
    const settings = parseResourceBannerSettings({ background__template: "BLUE_RADIAL" });
    expect(settings.background.template).toBe("BLUE_RADIAL");
  });

  test("overrides resource_name font size", () => {
    const settings = parseResourceBannerSettings({ resource_name__font_size: "22" });
    expect(settings.resourceName.fontSize).toBe(22);
  });

  test("overrides resource_name display", () => {
    const settings = parseResourceBannerSettings({ resource_name__display: "Custom Plugin" });
    expect(settings.resourceName.display).toBe("Custom Plugin");
  });

  test("overrides author_name x and y", () => {
    const settings = parseResourceBannerSettings({
      author_name__x: "110",
      author_name__y: "45"
    });
    expect(settings.authorName.x).toBe(110);
    expect(settings.authorName.y).toBe(45);
  });

  test("overrides stars x, y, and gap", () => {
    const settings = parseResourceBannerSettings({
      stars__x: "170",
      stars__y: "55",
      stars__gap: "16"
    });
    expect(settings.stars.x).toBe(170);
    expect(settings.stars.y).toBe(55);
    expect(settings.stars.gap).toBe(16);
  });

  test("overrides downloads enable=false", () => {
    const settings = parseResourceBannerSettings({ downloads__enable: "false" });
    expect(settings.downloads.enable).toBe(false);
  });

  test("overrides price font_bold=false", () => {
    const settings = parseResourceBannerSettings({ price__font_bold: "false" });
    expect(settings.price.fontBold).toBe(false);
  });

  test("ignores invalid enum values and keeps defaults", () => {
    const settings = parseResourceBannerSettings({ background__template: "NOT_A_TEMPLATE" });
    expect(settings.background.template).toBe(DEFAULT_RESOURCE_BANNER_SETTINGS.background.template);
  });
});

// ─── buildResourceBannerNodes — structure ─────────────────────────────────────

describe("buildResourceBannerNodes — background node", () => {
  test("first node is a background image at (0,0)", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const bg = nodes[0] as ImageNode;
    expect(bg.type).toBe("image");
    expect(bg.x).toBe(0);
    expect(bg.y).toBe(0);
    expect(bg.width).toBe(RESOURCE_BANNER_WIDTH);
    expect(bg.height).toBe(RESOURCE_BANNER_HEIGHT);
    expect(bg.assetKey).toBe(DEFAULT_RESOURCE_BANNER_SETTINGS.background.template);
  });
});

describe("buildResourceBannerNodes — logo", () => {
  test("uses base64 image when logoBase64 is provided", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const logo = nodes[1] as ImageNode;
    expect(logo.type).toBe("image");
    expect(logo.imageData).toBeDefined();
  });

  test("uses backend sprite fallback when logoBase64 is null (spigot)", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_NO_LOGO, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const logo = nodes[1] as SpriteNode;
    expect(logo.type).toBe("sprite");
    expect(logo.assetKey).toBe("DEFAULT_SPIGOT_RES_LOGO");
  });

  test("uses MODRINTH sprite fallback when logoBase64 is null", () => {
    const noLogoModrinth = {
      ...FIXTURE_MODRINTH,
      resource: { ...FIXTURE_MODRINTH.resource, logoBase64: null }
    };
    const nodes = buildResourceBannerNodes(noLogoModrinth, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const logo = nodes[1] as SpriteNode;
    expect(logo.assetKey).toBe("DEFAULT_MODRINTH_RES_LOGO");
  });

  test("uses CURSEFORGE sprite fallback", () => {
    const noLogoForge = {
      ...FIXTURE_CURSEFORGE,
      resource: { ...FIXTURE_CURSEFORGE.resource, logoBase64: null }
    };
    const nodes = buildResourceBannerNodes(noLogoForge, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const logo = nodes[1] as SpriteNode;
    expect(logo.assetKey).toBe("DEFAULT_CURSEFORGE_RES_LOGO");
  });

  test("uses HANGAR sprite fallback", () => {
    const noLogoHangar = {
      ...FIXTURE_HANGAR,
      resource: { ...FIXTURE_HANGAR.resource, logoBase64: null }
    };
    const nodes = buildResourceBannerNodes(noLogoHangar, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const logo = nodes[1] as SpriteNode;
    expect(logo.assetKey).toBe("DEFAULT_HANGAR_RES_LOGO");
  });

  test("logo y is auto-centered: floor((100 - size) / 2)", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_NO_LOGO, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const logo = nodes[1] as SpriteNode;
    const logoSize = Math.min(
      DEFAULT_RESOURCE_BANNER_SETTINGS.logo.size,
      RESOURCE_BANNER_LOGO_MAX_SIZE
    );
    expect(logo.y).toBe(Math.floor((RESOURCE_BANNER_HEIGHT - logoSize) / 2));
  });

  test("logo size is capped at RESOURCE_BANNER_LOGO_MAX_SIZE", () => {
    const settings = parseResourceBannerSettings({ logo__size: "200" });
    const nodes = buildResourceBannerNodes(FIXTURE_NO_LOGO, settings);
    const logo = nodes[1] as SpriteNode;
    expect(logo.width).toBe(RESOURCE_BANNER_LOGO_MAX_SIZE);
    expect(logo.height).toBe(RESOURCE_BANNER_LOGO_MAX_SIZE);
  });
});

// ─── buildResourceBannerNodes — resource name ─────────────────────────────────

describe("buildResourceBannerNodes — resource name", () => {
  const findResourceName = (nodes: readonly RenderNode[]): TextNode =>
    nodes.find(
      (n): n is TextNode =>
        n.type === "text" && n.y === DEFAULT_RESOURCE_BANNER_SETTINGS.resourceName.y
    )!;

  test("uses resource.name when display is empty", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    expect(findResourceName(nodes).content).toBe(FIXTURE_SPIGOT_FREE.resource.name);
  });

  test("uses display override when set", () => {
    const settings = parseResourceBannerSettings({ resource_name__display: "Override Name" });
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, settings);
    expect(findResourceName(nodes).content).toBe("Override Name");
  });

  test('falls back to resource.name when display is "unset"', () => {
    const settings = parseResourceBannerSettings({ resource_name__display: "unset" });
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, settings);
    expect(findResourceName(nodes).content).toBe(FIXTURE_SPIGOT_FREE.resource.name);
  });

  test("resource name is omitted when enable=false", () => {
    const settings = parseResourceBannerSettings({ resource_name__enable: "false" });
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, settings);
    const found = nodes.find(
      (n): n is TextNode =>
        n.type === "text" && n.y === DEFAULT_RESOURCE_BANNER_SETTINGS.resourceName.y
    );
    expect(found).toBeUndefined();
  });

  test("resource name renders at default x=104, y=25", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const nameNode = findResourceName(nodes);
    expect(nameNode.x).toBe(104);
    expect(nameNode.y).toBe(25);
  });

  test("resource name default font is bold size-18", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const nameNode = findResourceName(nodes);
    expect(nameNode.fontWeight).toBe("bold");
    expect(nameNode.fontSize).toBe(18);
  });
});

// ─── buildResourceBannerNodes — author name ───────────────────────────────────

describe("buildResourceBannerNodes — author name", () => {
  test('renders "by {author.name}"', () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const authorNode = nodes.find(
      (n): n is TextNode =>
        n.type === "text" && n.y === DEFAULT_RESOURCE_BANNER_SETTINGS.authorName.y
    )!;
    expect(authorNode.content).toBe(`by ${FIXTURE_SPIGOT_FREE.author.name}`);
  });

  test("uses display override for author name", () => {
    const settings = parseResourceBannerSettings({ author_name__display: "Plugin Team" });
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, settings);
    const authorNode = nodes.find(
      (n): n is TextNode =>
        n.type === "text" && n.y === DEFAULT_RESOURCE_BANNER_SETTINGS.authorName.y
    )!;
    expect(authorNode.content).toBe("Plugin Team");
  });
});

// ─── buildResourceBannerNodes — reviews / updated branch ─────────────────────

describe("buildResourceBannerNodes — reviews/updated backend branch", () => {
  const reviewsY = DEFAULT_RESOURCE_BANNER_SETTINGS.reviews.y; // 62

  test("SPIGOT renders '{n} reviews'", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const reviewNode = nodes.find((n): n is TextNode => n.type === "text" && n.y === reviewsY)!;
    expect(reviewNode.content).toBe(
      `${abbreviateNumber(FIXTURE_SPIGOT_FREE.resource.rating.count)} reviews`
    );
  });

  test("HANGAR renders '{n} stars'", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_HANGAR, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const reviewNode = nodes.find((n): n is TextNode => n.type === "text" && n.y === reviewsY)!;
    expect(reviewNode.content).toBe(
      `${abbreviateNumber(FIXTURE_HANGAR.resource.rating.count)} stars`
    );
  });

  test("MODRINTH renders 'Updated: M/dd/yyyy'", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_MODRINTH, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const updatedNode = nodes.find((n): n is TextNode => n.type === "text" && n.y === reviewsY)!;
    expect(updatedNode.content).toBe(
      `Updated: ${formatUpdatedDate(FIXTURE_MODRINTH.resource.lastUpdated!)}`
    );
  });

  test("CURSEFORGE renders 'Updated: M/dd/yyyy'", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_CURSEFORGE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const updatedNode = nodes.find((n): n is TextNode => n.type === "text" && n.y === reviewsY)!;
    expect(updatedNode.content).toMatch(/^Updated: /);
    expect(updatedNode.content).toBe(
      `Updated: ${formatUpdatedDate(FIXTURE_CURSEFORGE.resource.lastUpdated!)}`
    );
  });

  test("BUILTBYBIT renders '{n} reviews'", () => {
    const builtbybit = { ...FIXTURE_NO_LOGO, backend: "BUILTBYBIT" as const };
    const nodes = buildResourceBannerNodes(builtbybit, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const reviewNode = nodes.find((n): n is TextNode => n.type === "text" && n.y === reviewsY)!;
    expect(reviewNode.content).toContain("reviews");
  });

  test("ORE renders '{n} reviews'", () => {
    const ore = { ...FIXTURE_NO_LOGO, backend: "ORE" as const };
    const nodes = buildResourceBannerNodes(ore, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const reviewNode = nodes.find((n): n is TextNode => n.type === "text" && n.y === reviewsY)!;
    expect(reviewNode.content).toContain("reviews");
  });
});

// ─── buildResourceBannerNodes — star sprites ──────────────────────────────────

describe("buildResourceBannerNodes — star sprites", () => {
  const getStarNodes = (nodes: readonly RenderNode[]): SpriteNode[] =>
    nodes.filter(
      (n): n is SpriteNode =>
        n.type === "sprite" && ["STAR_FULL", "STAR_HALF", "STAR_NONE"].includes(n.assetKey)
    );

  test("renders 5 star nodes for SPIGOT with rating average", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    expect(getStarNodes(nodes)).toHaveLength(5);
  });

  test("star nodes are 12×12 px", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    for (const star of getStarNodes(nodes)) {
      expect(star.width).toBe(RESOURCE_BANNER_STAR_SIZE);
      expect(star.height).toBe(RESOURCE_BANNER_STAR_SIZE);
    }
  });

  test("star positions increment by gap", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const stars = getStarNodes(nodes);
    const gap = DEFAULT_RESOURCE_BANNER_SETTINGS.stars.gap;
    for (let i = 0; i < 5; i++) {
      expect(stars[i].x).toBe(DEFAULT_RESOURCE_BANNER_SETTINGS.stars.x + gap * i);
    }
  });

  test("4.5 star rating produces 4 FULL + 1 HALF", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS); // average=4.5
    const stars = getStarNodes(nodes);
    const fullCount = stars.filter((s) => s.assetKey === "STAR_FULL").length;
    const halfCount = stars.filter((s) => s.assetKey === "STAR_HALF").length;
    const noneCount = stars.filter((s) => s.assetKey === "STAR_NONE").length;
    expect(fullCount).toBe(4);
    expect(halfCount).toBe(1);
    expect(noneCount).toBe(0);
  });

  test("4.75 star rating produces 5 FULL", () => {
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_PREMIUM,
      DEFAULT_RESOURCE_BANNER_SETTINGS
    ); // average=4.75
    const stars = getStarNodes(nodes);
    expect(stars.every((s) => s.assetKey === "STAR_FULL")).toBe(true);
  });

  test("3.5 star rating produces 3 FULL + 1 HALF + 1 NONE", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_NO_LOGO, DEFAULT_RESOURCE_BANNER_SETTINGS); // average=3.5
    const stars = getStarNodes(nodes);
    const fullCount = stars.filter((s) => s.assetKey === "STAR_FULL").length;
    const halfCount = stars.filter((s) => s.assetKey === "STAR_HALF").length;
    const noneCount = stars.filter((s) => s.assetKey === "STAR_NONE").length;
    expect(fullCount).toBe(3);
    expect(halfCount).toBe(1);
    expect(noneCount).toBe(1);
  });

  test("no stars for CURSEFORGE (even with rating average)", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_CURSEFORGE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    expect(getStarNodes(nodes)).toHaveLength(0);
  });

  test("no stars for MODRINTH", () => {
    const modrinthWithRating = {
      ...FIXTURE_MODRINTH,
      resource: { ...FIXTURE_MODRINTH.resource, rating: { count: 100, average: 4.0 } }
    };
    const nodes = buildResourceBannerNodes(modrinthWithRating, DEFAULT_RESOURCE_BANNER_SETTINGS);
    expect(getStarNodes(nodes)).toHaveLength(0);
  });

  test("no stars for HANGAR", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_HANGAR, DEFAULT_RESOURCE_BANNER_SETTINGS);
    expect(getStarNodes(nodes)).toHaveLength(0);
  });

  test("no stars when rating.average is null (SPIGOT)", () => {
    const noRating = {
      ...FIXTURE_SPIGOT_FREE,
      resource: { ...FIXTURE_SPIGOT_FREE.resource, rating: { count: 0, average: null } }
    };
    const nodes = buildResourceBannerNodes(noRating, DEFAULT_RESOURCE_BANNER_SETTINGS);
    expect(getStarNodes(nodes)).toHaveLength(0);
  });
});

// ─── buildResourceBannerNodes — downloads ─────────────────────────────────────

describe("buildResourceBannerNodes — downloads", () => {
  const downloadsY = DEFAULT_RESOURCE_BANNER_SETTINGS.downloads.y; // 83

  test("free resource uses 'downloads' wording", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const dlNode = nodes.find((n): n is TextNode => n.type === "text" && n.y === downloadsY)!;
    expect(dlNode.content).toContain("downloads");
    expect(dlNode.content).not.toContain("purchases");
  });

  test("premium resource uses 'purchases' wording", () => {
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_PREMIUM,
      DEFAULT_RESOURCE_BANNER_SETTINGS
    );
    const dlNode = nodes.find((n): n is TextNode => n.type === "text" && n.y === downloadsY)!;
    expect(dlNode.content).toContain("purchases");
    expect(dlNode.content).not.toContain("downloads");
  });

  test("download count is abbreviated", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const dlNode = nodes.find((n): n is TextNode => n.type === "text" && n.y === downloadsY)!;
    expect(dlNode.content).toBe(
      `${abbreviateNumber(FIXTURE_SPIGOT_FREE.resource.downloadCount)} downloads`
    );
  });

  test("downloads node omitted when enable=false", () => {
    const settings = parseResourceBannerSettings({ downloads__enable: "false" });
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, settings);
    const found = nodes.find((n): n is TextNode => n.type === "text" && n.y === downloadsY);
    expect(found).toBeUndefined();
  });
});

// ─── buildResourceBannerNodes — price ────────────────────────────────────────

describe("buildResourceBannerNodes — price", () => {
  const priceX = DEFAULT_RESOURCE_BANNER_SETTINGS.price.x; // 210

  test("price node renders for premium resource", () => {
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_PREMIUM,
      DEFAULT_RESOURCE_BANNER_SETTINGS
    );
    const priceNode = nodes.find((n): n is TextNode => n.type === "text" && n.x === priceX);
    expect(priceNode).toBeDefined();
    expect(priceNode!.content).toBe("9.99 USD");
  });

  test("price node is absent for free resource", () => {
    const nodes = buildResourceBannerNodes(FIXTURE_SPIGOT_FREE, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const priceNode = nodes.find((n): n is TextNode => n.type === "text" && n.x === priceX);
    expect(priceNode).toBeUndefined();
  });

  test("price node is bold by default", () => {
    const nodes = buildResourceBannerNodes(
      FIXTURE_SPIGOT_PREMIUM,
      DEFAULT_RESOURCE_BANNER_SETTINGS
    );
    const priceNode = nodes.find((n): n is TextNode => n.type === "text" && n.x === priceX)!;
    expect(priceNode.fontWeight).toBe("bold");
  });
});

// ─── buildResourceBannerNodes — JSON serializability ─────────────────────────

describe("buildResourceBannerNodes — JSON serializability", () => {
  test.each(ALL_RESOURCE_FIXTURES)("$label nodes are JSON-round-trippable", ({
    fixture
  }: {
    label: string;
    fixture: ResourceBannerData;
  }) => {
    const nodes = buildResourceBannerNodes(fixture, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const json = JSON.stringify(nodes);
    const parsed = JSON.parse(json) as RenderNode[];
    expect(parsed).toHaveLength(nodes.length);
    expect(parsed[0].type).toBe("image");
  });
});

// ─── buildResourceBannerNodes — determinism ───────────────────────────────────

describe("buildResourceBannerNodes — determinism", () => {
  test.each(ALL_RESOURCE_FIXTURES)("$label produces identical output on repeated calls", ({
    fixture
  }: {
    label: string;
    fixture: ResourceBannerData;
  }) => {
    const a = buildResourceBannerNodes(fixture, DEFAULT_RESOURCE_BANNER_SETTINGS);
    const b = buildResourceBannerNodes(fixture, DEFAULT_RESOURCE_BANNER_SETTINGS);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

// ─── buildResourceBannerNodes — long/unicode ──────────────────────────────────

describe("buildResourceBannerNodes — long name and unicode", () => {
  test("long resource name renders without throwing", () => {
    expect(() =>
      buildResourceBannerNodes(FIXTURE_LONG_NAME, DEFAULT_RESOURCE_BANNER_SETTINGS)
    ).not.toThrow();
  });

  test("unicode resource/author renders without throwing", () => {
    expect(() =>
      buildResourceBannerNodes(FIXTURE_UNICODE, DEFAULT_RESOURCE_BANNER_SETTINGS)
    ).not.toThrow();
  });
});
