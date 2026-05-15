import { describe, expect, test } from "bun:test";

import {
  AssetValidationError,
  computeAssetSha256,
  rendererAssetManifest,
  resolveAssetPath,
  validateAssetFiles,
  validateAssetManifest,
  type AssetManifest
} from "@mcbanners/banner-renderer";

const expectAssetValidationFailure = async (promise: Promise<unknown>): Promise<void> => {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AssetValidationError);
    return;
  }

  throw new Error("Expected asset validation to fail");
};

describe("rendererAssetManifest", () => {
  test("describes copied legacy rendering assets with required SHA-256 hashes", () => {
    expect(rendererAssetManifest.policy.copiedIntoRepo).toBe(true);
    expect(rendererAssetManifest.policy.hashAlgorithm).toBe("sha256");
    expect(rendererAssetManifest.assets).toHaveLength(39);

    for (const asset of rendererAssetManifest.assets) {
      expect(asset.required).toBe(true);
      expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(asset.relativePath).not.toStartWith("/");
    }
  });

  test("uses stable relative paths grouped by legacy asset category", () => {
    const byKind = rendererAssetManifest.assets.reduce<Record<string, number>>((counts, asset) => {
      counts[asset.kind] = (counts[asset.kind] ?? 0) + 1;
      return counts;
    }, {});

    expect(byKind["background-template"]).toBe(11);
    expect(byKind.font).toBe(16);
    expect(byKind.sprite).toBe(12);

    for (const asset of rendererAssetManifest.assets) {
      expect(asset.legacySourcePath.startsWith("../banner-api/src/main/resources/")).toBe(true);
      expect(asset.byteSize).toBeGreaterThan(0);
    }
  });

  test("includes required rating and fallback sprite assets", () => {
    const assetKeys = rendererAssetManifest.assets.map((asset) => asset.key);

    expect(assetKeys).toContain("STAR_FULL");
    expect(assetKeys).toContain("STAR_HALF");
    expect(assetKeys).toContain("STAR_NONE");
    expect(assetKeys).toContain("DEFAULT_AUTHOR_LOGO");
    expect(assetKeys).toContain("DEFAULT_SERVER_LOGO");
    expect(assetKeys).toContain("DEFAULT_POLYMART_RES_LOGO");
  });

  test("validates manifest shape and rejects duplicate keys", () => {
    expect(validateAssetManifest(rendererAssetManifest)).toBe(rendererAssetManifest);

    const duplicateManifest = {
      ...rendererAssetManifest,
      assets: [rendererAssetManifest.assets[0], rendererAssetManifest.assets[0]]
    } as AssetManifest;

    expect(() => validateAssetManifest(duplicateManifest)).toThrow(AssetValidationError);
  });

  test("rejects unsupported kind and extension references", () => {
    const invalidManifest = {
      ...rendererAssetManifest,
      assets: [
        {
          ...rendererAssetManifest.assets[0],
          key: "BROKEN",
          kind: "video",
          relativePath: "banner/broken.gif",
          extension: ".gif"
        }
      ]
    } as unknown as AssetManifest;

    expect(() => validateAssetManifest(invalidManifest)).toThrow(AssetValidationError);
  });

  test("validates copied files and SHA-256 hashes", async () => {
    const validatedManifest = await validateAssetFiles(rendererAssetManifest);
    expect(validatedManifest).toBe(rendererAssetManifest);

    for (const asset of rendererAssetManifest.assets) {
      const actualHash = await computeAssetSha256(resolveAssetPath(asset));
      expect(actualHash).toBe(asset.sha256);
    }
  });

  test("fails file validation on required missing assets and hash mismatches", async () => {
    const missingManifest = {
      ...rendererAssetManifest,
      assets: [
        {
          ...rendererAssetManifest.assets[0],
          key: "MISSING",
          relativePath: "banner/missing.png"
        }
      ]
    } as AssetManifest;

    await expectAssetValidationFailure(validateAssetFiles(missingManifest));

    const hashMismatchManifest = {
      ...rendererAssetManifest,
      assets: [
        {
          ...rendererAssetManifest.assets[0],
          key: "HASH_MISMATCH",
          sha256: "0".repeat(64)
        }
      ]
    } as AssetManifest;

    await expectAssetValidationFailure(validateAssetFiles(hashMismatchManifest));
  });
});
