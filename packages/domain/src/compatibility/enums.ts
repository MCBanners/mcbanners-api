import { z } from "zod";

export const serviceBackendValues = [
  "SPIGOT",
  "ORE",
  "CURSEFORGE",
  "MODRINTH",
  "BUILTBYBIT",
  "POLYMART",
  "HANGAR"
] as const;

export type ServiceBackend = (typeof serviceBackendValues)[number];

export const serviceBackendSchema = z.enum(serviceBackendValues);

export const bannerTypeRecords = [
  { name: "SPONGE_AUTHOR", ordinal: 0, relatedServiceBackend: "ORE" },
  { name: "SPONGE_RESOURCE", ordinal: 1, relatedServiceBackend: "ORE" },
  { name: "SPIGOT_AUTHOR", ordinal: 2, relatedServiceBackend: "SPIGOT" },
  { name: "SPIGOT_RESOURCE", ordinal: 3, relatedServiceBackend: "SPIGOT" },
  { name: "MINECRAFT_SERVER", ordinal: 4, relatedServiceBackend: null },
  { name: "CURSEFORGE_AUTHOR", ordinal: 5, relatedServiceBackend: "CURSEFORGE" },
  { name: "CURSEFORGE_RESOURCE", ordinal: 6, relatedServiceBackend: "CURSEFORGE" },
  { name: "MODRINTH_AUTHOR", ordinal: 7, relatedServiceBackend: "MODRINTH" },
  { name: "MODRINTH_RESOURCE", ordinal: 8, relatedServiceBackend: "MODRINTH" },
  { name: "BUILTBYBIT_AUTHOR", ordinal: 9, relatedServiceBackend: "BUILTBYBIT" },
  { name: "BUILTBYBIT_RESOURCE", ordinal: 10, relatedServiceBackend: "BUILTBYBIT" },
  { name: "BUILTBYBIT_MEMBER", ordinal: 11, relatedServiceBackend: "BUILTBYBIT" },
  { name: "POLYMART_AUTHOR", ordinal: 12, relatedServiceBackend: "POLYMART" },
  { name: "POLYMART_RESOURCE", ordinal: 13, relatedServiceBackend: "POLYMART" },
  { name: "POLYMART_TEAM", ordinal: 14, relatedServiceBackend: "POLYMART" },
  { name: "HANGAR_AUTHOR", ordinal: 15, relatedServiceBackend: "HANGAR" },
  { name: "HANGAR_RESOURCE", ordinal: 16, relatedServiceBackend: "HANGAR" },
  { name: "DISCORD_USER", ordinal: 17, relatedServiceBackend: null }
] as const satisfies readonly {
  name: string;
  ordinal: number;
  relatedServiceBackend: ServiceBackend | null;
}[];

export type BannerType = (typeof bannerTypeRecords)[number]["name"];

export const bannerTypeValues = bannerTypeRecords.map((record) => record.name) as [
  BannerType,
  ...BannerType[]
];

export const bannerTypeSchema = z.enum(bannerTypeValues);

export const bannerTypeOrdinalMap = Object.freeze(
  Object.fromEntries(bannerTypeRecords.map((record) => [record.ordinal, record.name]))
) as Readonly<Record<number, BannerType>>;

export const bannerTypeByName = Object.freeze(
  Object.fromEntries(bannerTypeRecords.map((record) => [record.name, record]))
) as Readonly<Record<BannerType, (typeof bannerTypeRecords)[number]>>;

export const bannerOutputFormats = [
  { enumName: "PNG", value: "png" },
  { enumName: "JPEG", value: "jpg" }
] as const;

export type BannerOutputFormat = (typeof bannerOutputFormats)[number]["value"];

export const bannerOutputFormatValues = bannerOutputFormats.map((format) => format.value) as [
  BannerOutputFormat,
  ...BannerOutputFormat[]
];

export const bannerOutputFormatSchema = z.enum(bannerOutputFormatValues);

export const textThemeValues = ["LIGHT", "DARK"] as const;
export type TextTheme = (typeof textThemeValues)[number];
export const textThemeSchema = z.enum(textThemeValues);

export const backgroundTemplateRecords = [
  { name: "BLUE_RADIAL", textTheme: "DARK" },
  { name: "BURNING_ORANGE", textTheme: "LIGHT" },
  { name: "MANGO", textTheme: "DARK" },
  { name: "MOONLIGHT_PURPLE", textTheme: "LIGHT" },
  { name: "ORANGE_RADIAL", textTheme: "DARK" },
  { name: "VELVET", textTheme: "DARK" },
  { name: "YELLOW", textTheme: "DARK" },
  { name: "MALACHITE_GREEN", textTheme: "DARK" },
  { name: "DARK_GUNMETAL", textTheme: "LIGHT" },
  { name: "PURPLE_TAUPE", textTheme: "LIGHT" },
  { name: "LIGHT_MODE", textTheme: "DARK" }
] as const satisfies readonly { name: string; textTheme: TextTheme }[];

export type BackgroundTemplate = (typeof backgroundTemplateRecords)[number]["name"];

export const backgroundTemplateValues = backgroundTemplateRecords.map((record) => record.name) as [
  BackgroundTemplate,
  ...BackgroundTemplate[]
];

export const backgroundTemplateSchema = z.enum(backgroundTemplateValues);

export const backgroundTemplateByName = Object.freeze(
  Object.fromEntries(backgroundTemplateRecords.map((record) => [record.name, record]))
) as Readonly<Record<BackgroundTemplate, (typeof backgroundTemplateRecords)[number]>>;

export const fontFaceValues = [
  "MONTSERRAT",
  "OPEN_SANS",
  "POPPINS",
  "RALEWAY",
  "SOURCE_SANS_PRO",
  "JETBRAINS_MONO",
  "INTER",
  "ROBOTO"
] as const;

export type FontFace = (typeof fontFaceValues)[number];
export const fontFaceSchema = z.enum(fontFaceValues);

export const textAlignValues = ["RIGHT", "CENTER", "LEFT"] as const;
export type TextAlign = (typeof textAlignValues)[number];
export const textAlignSchema = z.enum(textAlignValues);

export const decodeBannerTypeOrdinal = (ordinal: number): BannerType | undefined =>
  bannerTypeOrdinalMap[ordinal];

export const getBackgroundTemplateFileName = (template: BackgroundTemplate): string =>
  `${template.toLowerCase()}.png`;

export const getBackgroundTemplateTextTheme = (template: BackgroundTemplate): TextTheme =>
  backgroundTemplateByName[template].textTheme;

export const getFontFaceFileName = (fontFace: FontFace, bold = false): string => {
  const baseName = fontFace
    .toLowerCase()
    .split("_")
    .map((piece) => `${piece.charAt(0).toUpperCase()}${piece.slice(1)}`)
    .join("");

  return `${baseName}${bold ? "Bold" : "Regular"}.ttf`;
};

export const parseBannerOutputFormat = (raw: string): BannerOutputFormat | undefined => {
  const normalized = raw.toLowerCase();
  return bannerOutputFormatValues.find((format) => format === normalized);
};
