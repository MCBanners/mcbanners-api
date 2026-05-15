import { describe, expect, test } from "bun:test";

import { getFontFaceFileName } from "../src/compatibility/enums";
import { compatibilityManifest } from "../src/compatibility/manifest";
import { compatibilityManifestSchema } from "../src/compatibility/schema";

describe("compatibilityManifest", () => {
  test("loads and matches the schema", () => {
    expect(() => compatibilityManifestSchema.parse(compatibilityManifest)).not.toThrow();
  });

  test("preserves contiguous Java BannerType ordinals", () => {
    const ordinals: number[] = compatibilityManifest.bannerTypes.map((type) => type.ordinal);

    expect(ordinals).toEqual([...ordinals.keys()]);
  });

  test("keeps supported output aliases stable", () => {
    expect(compatibilityManifest.outputFormats.map((format) => format.alias)).toEqual([
      "png",
      "jpg"
    ]);
  });

  test("has no duplicate namespace/query-key pairs within a banner kind", () => {
    for (const defaultSet of compatibilityManifest.parameterDefaults) {
      const queryKeys = defaultSet.namespaces.flatMap((namespace) =>
        Object.keys(namespace.defaults).map((key) => `${namespace.name}__${key}`)
      );

      expect(new Set(queryKeys).size).toBe(queryKeys.length);
    }
  });

  test("keeps first-class banner and Minecraft route families", () => {
    const paths = [
      ...compatibilityManifest.routes.map((route) => route.publicPath),
      ...compatibilityManifest.mcApi.routes.map((route) => route.publicPath)
    ];

    expect(paths.some((path) => path.startsWith("/banner/"))).toBe(true);
    expect(paths.some((path) => path.startsWith("/mc/"))).toBe(true);
  });

  test("documents Java FontFace regular and bold file-name mapping", () => {
    for (const fontFace of compatibilityManifest.fontFaces) {
      expect(fontFace.regularFileName).toBe(getFontFaceFileName(fontFace.name));
      expect(fontFace.boldFileName).toBe(getFontFaceFileName(fontFace.name, true));
    }
  });
});
