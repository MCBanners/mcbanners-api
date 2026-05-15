import { describe, expect, test } from "bun:test";

import {
  backgroundTemplateRecords,
  bannerOutputFormats,
  bannerTypeOrdinalMap,
  bannerTypeRecords,
  decodeBannerTypeOrdinal,
  fontFaceValues,
  getBackgroundTemplateFileName,
  getBackgroundTemplateTextTheme,
  getFontFaceFileName,
  parseBannerOutputFormat,
  serviceBackendValues,
  textAlignValues,
  textThemeValues
} from "../src/compatibility/enums";

describe("legacy enum definitions", () => {
  test("preserves BannerType Java ordinal order without numeric enums", () => {
    expect(bannerTypeRecords.map((record) => record.name)).toEqual([
      "SPONGE_AUTHOR",
      "SPONGE_RESOURCE",
      "SPIGOT_AUTHOR",
      "SPIGOT_RESOURCE",
      "MINECRAFT_SERVER",
      "CURSEFORGE_AUTHOR",
      "CURSEFORGE_RESOURCE",
      "MODRINTH_AUTHOR",
      "MODRINTH_RESOURCE",
      "BUILTBYBIT_AUTHOR",
      "BUILTBYBIT_RESOURCE",
      "BUILTBYBIT_MEMBER",
      "POLYMART_AUTHOR",
      "POLYMART_RESOURCE",
      "POLYMART_TEAM",
      "HANGAR_AUTHOR",
      "HANGAR_RESOURCE",
      "DISCORD_USER"
    ]);

    expect(bannerTypeRecords.map((record) => record.ordinal)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
    ]);
    expect(decodeBannerTypeOrdinal(4)).toBe("MINECRAFT_SERVER");
    expect(decodeBannerTypeOrdinal(17)).toBe("DISCORD_USER");
    expect(decodeBannerTypeOrdinal(18)).toBeUndefined();
    expect(bannerTypeOrdinalMap[0]).toBe("SPONGE_AUTHOR");
  });

  test("preserves related ServiceBackend values", () => {
    expect(serviceBackendValues).toEqual([
      "SPIGOT",
      "ORE",
      "CURSEFORGE",
      "MODRINTH",
      "BUILTBYBIT",
      "POLYMART",
      "HANGAR"
    ]);

    expect(bannerTypeRecords.map((record) => record.relatedServiceBackend)).toEqual([
      "ORE",
      "ORE",
      "SPIGOT",
      "SPIGOT",
      null,
      "CURSEFORGE",
      "CURSEFORGE",
      "MODRINTH",
      "MODRINTH",
      "BUILTBYBIT",
      "BUILTBYBIT",
      "BUILTBYBIT",
      "POLYMART",
      "POLYMART",
      "POLYMART",
      "HANGAR",
      "HANGAR",
      null
    ]);
  });

  test("supports only legacy png and jpg output aliases", () => {
    expect(bannerOutputFormats).toEqual([
      { enumName: "PNG", value: "png" },
      { enumName: "JPEG", value: "jpg" }
    ]);
    expect(parseBannerOutputFormat("png")).toBe("png");
    expect(parseBannerOutputFormat("PNG")).toBe("png");
    expect(parseBannerOutputFormat("jpg")).toBe("jpg");
    expect(parseBannerOutputFormat("jpeg")).toBeUndefined();
    expect(parseBannerOutputFormat("webp")).toBeUndefined();
  });

  test("preserves BackgroundTemplate text themes and file names", () => {
    expect(backgroundTemplateRecords.map((record) => record.name)).toEqual([
      "BLUE_RADIAL",
      "BURNING_ORANGE",
      "MANGO",
      "MOONLIGHT_PURPLE",
      "ORANGE_RADIAL",
      "VELVET",
      "YELLOW",
      "MALACHITE_GREEN",
      "DARK_GUNMETAL",
      "PURPLE_TAUPE",
      "LIGHT_MODE"
    ]);
    expect(getBackgroundTemplateTextTheme("BLUE_RADIAL")).toBe("DARK");
    expect(getBackgroundTemplateTextTheme("BURNING_ORANGE")).toBe("LIGHT");
    expect(getBackgroundTemplateTextTheme("LIGHT_MODE")).toBe("DARK");
    expect(getBackgroundTemplateFileName("MOONLIGHT_PURPLE")).toBe("moonlight_purple.png");
  });

  test("preserves FontFace values and Java file-name mapping", () => {
    expect(fontFaceValues).toEqual([
      "MONTSERRAT",
      "OPEN_SANS",
      "POPPINS",
      "RALEWAY",
      "SOURCE_SANS_PRO",
      "JETBRAINS_MONO",
      "INTER",
      "ROBOTO"
    ]);
    expect(getFontFaceFileName("MONTSERRAT")).toBe("MontserratRegular.ttf");
    expect(getFontFaceFileName("OPEN_SANS", true)).toBe("OpenSansBold.ttf");
    expect(getFontFaceFileName("SOURCE_SANS_PRO")).toBe("SourceSansProRegular.ttf");
    expect(getFontFaceFileName("JETBRAINS_MONO", true)).toBe("JetbrainsMonoBold.ttf");
  });

  test("preserves TextAlign and TextTheme values", () => {
    expect(textAlignValues).toEqual(["RIGHT", "CENTER", "LEFT"]);
    expect(textThemeValues).toEqual(["LIGHT", "DARK"]);
  });
});
