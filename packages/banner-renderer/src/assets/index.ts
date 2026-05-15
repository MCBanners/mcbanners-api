export type AssetKind = "font" | "background-template" | "sprite";

export interface AssetReference {
  readonly id: string;
  readonly kind: AssetKind;
  readonly legacySourcePath: string;
  readonly targetPath: string;
  readonly byteSize: number;
  readonly role?: string;
}

export interface AssetManifest {
  readonly version: 1;
  readonly policy: {
    readonly copiedIntoRepo: boolean;
    readonly hashAlgorithm: "sha256";
    readonly validateOnStartup: boolean;
  };
  readonly assets: readonly AssetReference[];
}

export interface LoadedAssetRegistry {
  readonly fonts: ReadonlyMap<string, AssetReference>;
  readonly backgroundTemplates: ReadonlyMap<string, AssetReference>;
  readonly sprites: ReadonlyMap<string, AssetReference>;
}

const legacyResourceRoot = "../banner-api/src/main/resources";
const targetAssetRoot = "packages/banner-renderer/assets";

const asset = (
  kind: AssetKind,
  id: string,
  relativePath: string,
  byteSize: number,
  role?: string
): AssetReference => ({
  id,
  kind,
  legacySourcePath: `${legacyResourceRoot}/${relativePath}`,
  targetPath: `${targetAssetRoot}/${relativePath}`,
  byteSize,
  ...(role === undefined ? {} : { role })
});

export const rendererAssetManifest = {
  version: 1,
  policy: {
    copiedIntoRepo: false,
    hashAlgorithm: "sha256",
    validateOnStartup: true
  },
  assets: [
    asset("background-template", "BLUE_RADIAL", "banner/blue_radial.png", 435),
    asset("background-template", "BURNING_ORANGE", "banner/burning_orange.png", 357),
    asset("background-template", "DARK_GUNMETAL", "banner/dark_gunmetal.png", 456),
    asset("background-template", "LIGHT_MODE", "banner/light_mode.png", 133),
    asset("background-template", "MALACHITE_GREEN", "banner/malachite_green.png", 456),
    asset("background-template", "MANGO", "banner/mango.png", 328),
    asset("background-template", "MOONLIGHT_PURPLE", "banner/moonlight_purple.png", 421),
    asset("background-template", "ORANGE_RADIAL", "banner/orange_radial.png", 5_923),
    asset("background-template", "PURPLE_TAUPE", "banner/purple_taupe.png", 456),
    asset("background-template", "VELVET", "banner/velvet.png", 330),
    asset("background-template", "YELLOW", "banner/yellow.png", 3_525),

    asset("font", "InterBold", "fonts/InterBold.ttf", 316_100),
    asset("font", "InterRegular", "fonts/InterRegular.ttf", 314_712),
    asset("font", "JetbrainsMonoBold", "fonts/JetbrainsMonoBold.ttf", 210_128),
    asset("font", "JetbrainsMonoRegular", "fonts/JetbrainsMonoRegular.ttf", 203_952),
    asset("font", "MontserratBold", "fonts/MontserratBold.ttf", 261_588),
    asset("font", "MontserratRegular", "fonts/MontserratRegular.ttf", 263_192),
    asset("font", "OpenSansBold", "fonts/OpenSansBold.ttf", 224_452),
    asset("font", "OpenSansRegular", "fonts/OpenSansRegular.ttf", 217_276),
    asset("font", "PoppinsBold", "fonts/PoppinsBold.ttf", 155_972),
    asset("font", "PoppinsRegular", "fonts/PoppinsRegular.ttf", 160_292),
    asset("font", "RalewayBold", "fonts/RalewayBold.ttf", 179_244),
    asset("font", "RalewayRegular", "fonts/RalewayRegular.ttf", 178_520),
    asset("font", "RobotoBold", "fonts/RobotoBold.ttf", 167_336),
    asset("font", "RobotoRegular", "fonts/RobotoRegular.ttf", 168_260),
    asset("font", "SourceSansProBold", "fonts/SourceSansProBold.ttf", 290_916),
    asset("font", "SourceSansProRegular", "fonts/SourceSansProRegular.ttf", 293_516),

    asset("sprite", "DEFAULT_AUTHOR_LOGO", "sprites/default_author_logo.png", 1_095),
    asset(
      "sprite",
      "DEFAULT_BUILTBYBIT_RES_LOGO",
      "sprites/default_builtbybit_res_logo.png",
      122_943,
      "fallback logo"
    ),
    asset(
      "sprite",
      "DEFAULT_CURSEFORGE_RES_LOGO",
      "sprites/default_curseforge_res_logo.png",
      3_693,
      "fallback logo"
    ),
    asset(
      "sprite",
      "DEFAULT_HANGAR_RES_LOGO",
      "sprites/default_hangar_res_logo.png",
      45_164,
      "fallback logo"
    ),
    asset(
      "sprite",
      "DEFAULT_MODRINTH_RES_LOGO",
      "sprites/default_modrinth_res_logo.png",
      13_885,
      "fallback logo"
    ),
    asset(
      "sprite",
      "DEFAULT_POLYMART_RES_LOGO",
      "sprites/default_polymart_res_logo.png",
      179_636,
      "fallback logo"
    ),
    asset("sprite", "DEFAULT_SERVER_LOGO", "sprites/default_server_logo.png", 219),
    asset(
      "sprite",
      "DEFAULT_SPIGOT_RES_LOGO",
      "sprites/default_spigot_res_logo.png",
      9_260,
      "fallback logo"
    ),
    asset(
      "sprite",
      "DEFAULT_SPONGE_RES_LOGO",
      "sprites/default_sponge_res_logo.png",
      1_220,
      "fallback logo"
    ),
    asset("sprite", "STAR_FULL", "sprites/star_full.png", 262, "rating star"),
    asset("sprite", "STAR_HALF", "sprites/star_half.png", 314, "rating star"),
    asset("sprite", "STAR_NONE", "sprites/star_none.png", 253, "rating star")
  ]
} as const satisfies AssetManifest;
