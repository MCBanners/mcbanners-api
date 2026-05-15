import { z } from "zod";
export declare const serviceBackendValues: readonly [
  "SPIGOT",
  "ORE",
  "CURSEFORGE",
  "MODRINTH",
  "BUILTBYBIT",
  "POLYMART",
  "HANGAR"
];
export type ServiceBackend = (typeof serviceBackendValues)[number];
export declare const serviceBackendSchema: z.ZodEnum<{
  ORE: "ORE";
  SPIGOT: "SPIGOT";
  CURSEFORGE: "CURSEFORGE";
  MODRINTH: "MODRINTH";
  BUILTBYBIT: "BUILTBYBIT";
  POLYMART: "POLYMART";
  HANGAR: "HANGAR";
}>;
export declare const bannerTypeRecords: readonly [
  {
    readonly name: "SPONGE_AUTHOR";
    readonly ordinal: 0;
    readonly relatedServiceBackend: "ORE";
  },
  {
    readonly name: "SPONGE_RESOURCE";
    readonly ordinal: 1;
    readonly relatedServiceBackend: "ORE";
  },
  {
    readonly name: "SPIGOT_AUTHOR";
    readonly ordinal: 2;
    readonly relatedServiceBackend: "SPIGOT";
  },
  {
    readonly name: "SPIGOT_RESOURCE";
    readonly ordinal: 3;
    readonly relatedServiceBackend: "SPIGOT";
  },
  {
    readonly name: "MINECRAFT_SERVER";
    readonly ordinal: 4;
    readonly relatedServiceBackend: null;
  },
  {
    readonly name: "CURSEFORGE_AUTHOR";
    readonly ordinal: 5;
    readonly relatedServiceBackend: "CURSEFORGE";
  },
  {
    readonly name: "CURSEFORGE_RESOURCE";
    readonly ordinal: 6;
    readonly relatedServiceBackend: "CURSEFORGE";
  },
  {
    readonly name: "MODRINTH_AUTHOR";
    readonly ordinal: 7;
    readonly relatedServiceBackend: "MODRINTH";
  },
  {
    readonly name: "MODRINTH_RESOURCE";
    readonly ordinal: 8;
    readonly relatedServiceBackend: "MODRINTH";
  },
  {
    readonly name: "BUILTBYBIT_AUTHOR";
    readonly ordinal: 9;
    readonly relatedServiceBackend: "BUILTBYBIT";
  },
  {
    readonly name: "BUILTBYBIT_RESOURCE";
    readonly ordinal: 10;
    readonly relatedServiceBackend: "BUILTBYBIT";
  },
  {
    readonly name: "BUILTBYBIT_MEMBER";
    readonly ordinal: 11;
    readonly relatedServiceBackend: "BUILTBYBIT";
  },
  {
    readonly name: "POLYMART_AUTHOR";
    readonly ordinal: 12;
    readonly relatedServiceBackend: "POLYMART";
  },
  {
    readonly name: "POLYMART_RESOURCE";
    readonly ordinal: 13;
    readonly relatedServiceBackend: "POLYMART";
  },
  {
    readonly name: "POLYMART_TEAM";
    readonly ordinal: 14;
    readonly relatedServiceBackend: "POLYMART";
  },
  {
    readonly name: "HANGAR_AUTHOR";
    readonly ordinal: 15;
    readonly relatedServiceBackend: "HANGAR";
  },
  {
    readonly name: "HANGAR_RESOURCE";
    readonly ordinal: 16;
    readonly relatedServiceBackend: "HANGAR";
  },
  {
    readonly name: "DISCORD_USER";
    readonly ordinal: 17;
    readonly relatedServiceBackend: null;
  }
];
export type BannerType = (typeof bannerTypeRecords)[number]["name"];
export declare const bannerTypeValues: [BannerType, ...BannerType[]];
export declare const bannerTypeSchema: z.ZodEnum<{
  SPONGE_AUTHOR: "SPONGE_AUTHOR";
  SPONGE_RESOURCE: "SPONGE_RESOURCE";
  SPIGOT_AUTHOR: "SPIGOT_AUTHOR";
  SPIGOT_RESOURCE: "SPIGOT_RESOURCE";
  MINECRAFT_SERVER: "MINECRAFT_SERVER";
  CURSEFORGE_AUTHOR: "CURSEFORGE_AUTHOR";
  CURSEFORGE_RESOURCE: "CURSEFORGE_RESOURCE";
  MODRINTH_AUTHOR: "MODRINTH_AUTHOR";
  MODRINTH_RESOURCE: "MODRINTH_RESOURCE";
  BUILTBYBIT_AUTHOR: "BUILTBYBIT_AUTHOR";
  BUILTBYBIT_RESOURCE: "BUILTBYBIT_RESOURCE";
  BUILTBYBIT_MEMBER: "BUILTBYBIT_MEMBER";
  POLYMART_AUTHOR: "POLYMART_AUTHOR";
  POLYMART_RESOURCE: "POLYMART_RESOURCE";
  POLYMART_TEAM: "POLYMART_TEAM";
  HANGAR_AUTHOR: "HANGAR_AUTHOR";
  HANGAR_RESOURCE: "HANGAR_RESOURCE";
  DISCORD_USER: "DISCORD_USER";
}>;
export declare const bannerTypeOrdinalMap: Readonly<Record<number, BannerType>>;
export declare const bannerTypeByName: Readonly<
  Record<BannerType, (typeof bannerTypeRecords)[number]>
>;
export declare const bannerOutputFormats: readonly [
  {
    readonly enumName: "PNG";
    readonly value: "png";
  },
  {
    readonly enumName: "JPEG";
    readonly value: "jpg";
  }
];
export type BannerOutputFormat = (typeof bannerOutputFormats)[number]["value"];
export declare const bannerOutputFormatValues: [BannerOutputFormat, ...BannerOutputFormat[]];
export declare const bannerOutputFormatSchema: z.ZodEnum<{
  png: "png";
  jpg: "jpg";
}>;
export declare const textThemeValues: readonly ["LIGHT", "DARK"];
export type TextTheme = (typeof textThemeValues)[number];
export declare const textThemeSchema: z.ZodEnum<{
  LIGHT: "LIGHT";
  DARK: "DARK";
}>;
export declare const backgroundTemplateRecords: readonly [
  {
    readonly name: "BLUE_RADIAL";
    readonly textTheme: "DARK";
  },
  {
    readonly name: "BURNING_ORANGE";
    readonly textTheme: "LIGHT";
  },
  {
    readonly name: "MANGO";
    readonly textTheme: "DARK";
  },
  {
    readonly name: "MOONLIGHT_PURPLE";
    readonly textTheme: "LIGHT";
  },
  {
    readonly name: "ORANGE_RADIAL";
    readonly textTheme: "DARK";
  },
  {
    readonly name: "VELVET";
    readonly textTheme: "DARK";
  },
  {
    readonly name: "YELLOW";
    readonly textTheme: "DARK";
  },
  {
    readonly name: "MALACHITE_GREEN";
    readonly textTheme: "DARK";
  },
  {
    readonly name: "DARK_GUNMETAL";
    readonly textTheme: "LIGHT";
  },
  {
    readonly name: "PURPLE_TAUPE";
    readonly textTheme: "LIGHT";
  },
  {
    readonly name: "LIGHT_MODE";
    readonly textTheme: "DARK";
  }
];
export type BackgroundTemplate = (typeof backgroundTemplateRecords)[number]["name"];
export declare const backgroundTemplateValues: [BackgroundTemplate, ...BackgroundTemplate[]];
export declare const backgroundTemplateSchema: z.ZodEnum<{
  BLUE_RADIAL: "BLUE_RADIAL";
  BURNING_ORANGE: "BURNING_ORANGE";
  MANGO: "MANGO";
  MOONLIGHT_PURPLE: "MOONLIGHT_PURPLE";
  ORANGE_RADIAL: "ORANGE_RADIAL";
  VELVET: "VELVET";
  YELLOW: "YELLOW";
  MALACHITE_GREEN: "MALACHITE_GREEN";
  DARK_GUNMETAL: "DARK_GUNMETAL";
  PURPLE_TAUPE: "PURPLE_TAUPE";
  LIGHT_MODE: "LIGHT_MODE";
}>;
export declare const backgroundTemplateByName: Readonly<
  Record<BackgroundTemplate, (typeof backgroundTemplateRecords)[number]>
>;
export declare const fontFaceValues: readonly [
  "MONTSERRAT",
  "OPEN_SANS",
  "POPPINS",
  "RALEWAY",
  "SOURCE_SANS_PRO",
  "JETBRAINS_MONO",
  "INTER",
  "ROBOTO"
];
export type FontFace = (typeof fontFaceValues)[number];
export declare const fontFaceSchema: z.ZodEnum<{
  MONTSERRAT: "MONTSERRAT";
  OPEN_SANS: "OPEN_SANS";
  POPPINS: "POPPINS";
  RALEWAY: "RALEWAY";
  SOURCE_SANS_PRO: "SOURCE_SANS_PRO";
  JETBRAINS_MONO: "JETBRAINS_MONO";
  INTER: "INTER";
  ROBOTO: "ROBOTO";
}>;
export declare const textAlignValues: readonly ["RIGHT", "CENTER", "LEFT"];
export type TextAlign = (typeof textAlignValues)[number];
export declare const textAlignSchema: z.ZodEnum<{
  RIGHT: "RIGHT";
  CENTER: "CENTER";
  LEFT: "LEFT";
}>;
export declare const decodeBannerTypeOrdinal: (ordinal: number) => BannerType | undefined;
export declare const getBackgroundTemplateFileName: (template: BackgroundTemplate) => string;
export declare const getBackgroundTemplateTextTheme: (template: BackgroundTemplate) => TextTheme;
export declare const getFontFaceFileName: (fontFace: FontFace, bold?: boolean) => string;
export declare const parseBannerOutputFormat: (raw: string) => BannerOutputFormat | undefined;
//# sourceMappingURL=enums.d.ts.map
