import { describe, expect, test } from "bun:test";

import { rendererAssetManifest } from "@mcbanners/banner-renderer";

describe("rendererAssetManifest", () => {
  test("describes the legacy rendering asset inventory without copying assets", () => {
    expect(rendererAssetManifest.policy.copiedIntoRepo).toBe(false);
    expect(rendererAssetManifest.policy.hashAlgorithm).toBe("sha256");
    expect(rendererAssetManifest.assets).toHaveLength(39);
  });

  test("uses stable target paths grouped by legacy asset category", () => {
    const byKind = rendererAssetManifest.assets.reduce<Record<string, number>>((counts, asset) => {
      counts[asset.kind] = (counts[asset.kind] ?? 0) + 1;
      return counts;
    }, {});

    expect(byKind["background-template"]).toBe(11);
    expect(byKind.font).toBe(16);
    expect(byKind.sprite).toBe(12);

    for (const asset of rendererAssetManifest.assets) {
      expect(asset.legacySourcePath.startsWith("../banner-api/src/main/resources/")).toBe(true);
      expect(asset.targetPath.startsWith("packages/banner-renderer/assets/")).toBe(true);
      expect(asset.byteSize).toBeGreaterThan(0);
    }
  });

  test("includes required rating and fallback sprite assets", () => {
    const assetIds = rendererAssetManifest.assets.map((asset) => asset.id);

    expect(assetIds).toContain("STAR_FULL");
    expect(assetIds).toContain("STAR_HALF");
    expect(assetIds).toContain("STAR_NONE");
    expect(assetIds).toContain("DEFAULT_AUTHOR_LOGO");
    expect(assetIds).toContain("DEFAULT_SERVER_LOGO");
    expect(assetIds).toContain("DEFAULT_POLYMART_RES_LOGO");
  });
});
