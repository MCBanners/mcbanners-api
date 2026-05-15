import { describe, expect, test } from "bun:test";

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  createCanvasSurface,
  encodeJpg,
  encodePng,
  registerRendererFonts,
  renderNode
} from "../src";
import {
  DEFAULT_SERVER_BANNER_SETTINGS,
  SERVER_BANNER_HEIGHT,
  SERVER_BANNER_WIDTH,
  buildServerBannerNodes,
  parseServerBannerSettings
} from "../src/layouts/server";
import {
  ALL_FIXTURES,
  FIXTURE_LONG_MOTD_SERVER,
  FIXTURE_NO_ICON_SERVER,
  FIXTURE_STANDARD_SERVER
} from "./fixtures/server-fixtures";

const sha256 = (buf: Buffer): string => createHash("sha256").update(buf).digest("hex");

const renderFixture = async (
  fixture: (typeof ALL_FIXTURES)[number]["fixture"],
  settingsOverride?: Record<string, string>
): Promise<{ png: Buffer; jpg: Buffer }> => {
  registerRendererFonts();
  const settings = settingsOverride
    ? parseServerBannerSettings(settingsOverride)
    : DEFAULT_SERVER_BANNER_SETTINGS;
  const nodes = buildServerBannerNodes(fixture, settings);
  const surface = createCanvasSurface(SERVER_BANNER_WIDTH, SERVER_BANNER_HEIGHT);

  for (const node of nodes) {
    await renderNode(surface, node);
  }

  return { png: await encodePng(surface), jpg: await encodeJpg(surface) };
};

// ─── Basic output tests ───────────────────────────────────────────────────────

describe("server banner render output", () => {
  test("PNG output has valid PNG signature", async () => {
    const { png } = await renderFixture(FIXTURE_STANDARD_SERVER);
    expect(png[0]).toBe(0x89);
    expect(png[1]).toBe(0x50); // P
    expect(png[2]).toBe(0x4e); // N
    expect(png[3]).toBe(0x47); // G
    expect(png.length).toBeGreaterThan(100);
  });

  test("JPG output has valid JPEG signature", async () => {
    const { jpg } = await renderFixture(FIXTURE_STANDARD_SERVER);
    expect(jpg[0]).toBe(0xff);
    expect(jpg[1]).toBe(0xd8);
    expect(jpg.length).toBeGreaterThan(100);
  });

  test("renders without throwing for all fixtures", async () => {
    for (const { fixture } of ALL_FIXTURES) {
      await renderFixture(fixture);
    }
  });

  test("no-icon fixture renders with fallback sprite", async () => {
    const { png } = await renderFixture(FIXTURE_NO_ICON_SERVER);
    expect(png.length).toBeGreaterThan(100);
  });

  test("long MOTD fixture renders wrapped text without throwing", async () => {
    const { png } = await renderFixture(FIXTURE_LONG_MOTD_SERVER);
    expect(png.length).toBeGreaterThan(100);
  });
});

// ─── Determinism tests ────────────────────────────────────────────────────────

describe("server banner render determinism", () => {
  test("same fixture produces identical PNG bytes across two renders", async () => {
    const a = await renderFixture(FIXTURE_STANDARD_SERVER);
    const b = await renderFixture(FIXTURE_STANDARD_SERVER);
    expect(sha256(a.png)).toBe(sha256(b.png));
  });

  test("same fixture produces identical JPG bytes across two renders", async () => {
    const a = await renderFixture(FIXTURE_STANDARD_SERVER);
    const b = await renderFixture(FIXTURE_STANDARD_SERVER);
    expect(sha256(a.jpg)).toBe(sha256(b.jpg));
  });

  test("different background template produces different PNG hash", async () => {
    const a = await renderFixture(FIXTURE_STANDARD_SERVER);
    const b = await renderFixture(FIXTURE_STANDARD_SERVER, { background__template: "BLUE_RADIAL" });
    expect(sha256(a.png)).not.toBe(sha256(b.png));
  });

  test("different fixture data produces different PNG hash", async () => {
    const a = await renderFixture(FIXTURE_STANDARD_SERVER);
    const b = await renderFixture(FIXTURE_NO_ICON_SERVER);
    expect(sha256(a.png)).not.toBe(sha256(b.png));
  });

  test("stable hash: standard server PNG hash is consistent", async () => {
    const { png } = await renderFixture(FIXTURE_STANDARD_SERVER);
    const hash1 = sha256(png);
    const { png: png2 } = await renderFixture(FIXTURE_STANDARD_SERVER);
    const hash2 = sha256(png2);
    expect(hash1).toBe(hash2);
  });
});

// ─── Visual output (writes to ignored output dir) ────────────────────────────

describe("server banner visual output", () => {
  test("writes PNG and JPG outputs for all fixtures to output dir", async () => {
    const outputDir = join(import.meta.dir, "..", "output", "server-fixtures");
    await mkdir(outputDir, { recursive: true });

    for (const { label, fixture } of ALL_FIXTURES) {
      const { png, jpg } = await renderFixture(fixture);
      await writeFile(join(outputDir, `${label}.png`), png);
      await writeFile(join(outputDir, `${label}.jpg`), jpg);
    }
  });
});
