import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  createCanvasSurface,
  encodeJpg,
  encodePng,
  registerRendererFonts,
  renderNode
} from "../src";
import type { ResourceBannerData } from "../src/layouts/resource";
import {
  buildResourceBannerNodes,
  DEFAULT_RESOURCE_BANNER_SETTINGS,
  RESOURCE_BANNER_HEIGHT,
  RESOURCE_BANNER_WIDTH
} from "../src/layouts/resource";
import {
  ALL_RESOURCE_FIXTURES,
  FIXTURE_SPIGOT_FREE,
  FIXTURE_SPIGOT_PREMIUM
} from "./fixtures/resource-fixtures";

const sha256 = (buf: Buffer): string => createHash("sha256").update(buf).digest("hex");

const renderFixture = async (
  fixture: (typeof ALL_RESOURCE_FIXTURES)[number]["fixture"]
): Promise<{ png: Buffer; jpg: Buffer }> => {
  registerRendererFonts();
  const nodes = buildResourceBannerNodes(fixture, DEFAULT_RESOURCE_BANNER_SETTINGS);
  const surface = createCanvasSurface(RESOURCE_BANNER_WIDTH, RESOURCE_BANNER_HEIGHT);

  for (const node of nodes) {
    await renderNode(surface, node);
  }

  return { png: await encodePng(surface), jpg: await encodeJpg(surface) };
};

describe("resource banner render — PNG/JPG encoding", () => {
  test("renders SPIGOT free fixture as PNG without throwing", async () => {
    const { png } = await renderFixture(FIXTURE_SPIGOT_FREE);
    expect(png.byteLength).toBeGreaterThan(100);
  });

  test("renders SPIGOT premium fixture as PNG without throwing", async () => {
    const { png } = await renderFixture(FIXTURE_SPIGOT_PREMIUM);
    expect(png.byteLength).toBeGreaterThan(100);
  });

  test("renders SPIGOT free fixture as JPG without throwing", async () => {
    const { jpg } = await renderFixture(FIXTURE_SPIGOT_FREE);
    expect(jpg.byteLength).toBeGreaterThan(100);
  });

  test("PNG and JPG differ in content for same fixture", async () => {
    const { png, jpg } = await renderFixture(FIXTURE_SPIGOT_FREE);
    expect(sha256(png)).not.toBe(sha256(jpg));
  });
});

describe("resource banner render — determinism", () => {
  test.each(ALL_RESOURCE_FIXTURES)("$label PNG hash is stable across two renders", async ({
    fixture
  }: {
    label: string;
    fixture: ResourceBannerData;
  }) => {
    const { png: png1 } = await renderFixture(fixture);
    const { png: png2 } = await renderFixture(fixture);
    expect(sha256(png1)).toBe(sha256(png2));
  });
});
