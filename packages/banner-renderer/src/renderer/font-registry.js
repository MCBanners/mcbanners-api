import { GlobalFonts } from "@napi-rs/canvas";
import { rendererAssetManifest, resolveAssetPath } from "../assets";
import { rendererFontFaceValues } from "../types/font-face";
import { fontWeightValues } from "../types/font-weight";
const FONT_ASSET_KEYS = {
    inter: { regular: "InterRegular", bold: "InterBold" },
    montserrat: { regular: "MontserratRegular", bold: "MontserratBold" },
    "open-sans": { regular: "OpenSansRegular", bold: "OpenSansBold" },
    poppins: { regular: "PoppinsRegular", bold: "PoppinsBold" },
    raleway: { regular: "RalewayRegular", bold: "RalewayBold" },
    "source-sans-pro": { regular: "SourceSansProRegular", bold: "SourceSansProBold" },
    "jetbrains-mono": { regular: "JetbrainsMonoRegular", bold: "JetbrainsMonoBold" },
    roboto: { regular: "RobotoRegular", bold: "RobotoBold" }
};
/** Unique canvas family names per font face + weight combination. */
const FONT_FAMILY_NAMES = {
    inter: { regular: "MCBanners.Inter.Regular", bold: "MCBanners.Inter.Bold" },
    montserrat: {
        regular: "MCBanners.Montserrat.Regular",
        bold: "MCBanners.Montserrat.Bold"
    },
    "open-sans": {
        regular: "MCBanners.OpenSans.Regular",
        bold: "MCBanners.OpenSans.Bold"
    },
    poppins: { regular: "MCBanners.Poppins.Regular", bold: "MCBanners.Poppins.Bold" },
    raleway: { regular: "MCBanners.Raleway.Regular", bold: "MCBanners.Raleway.Bold" },
    "source-sans-pro": {
        regular: "MCBanners.SourceSansPro.Regular",
        bold: "MCBanners.SourceSansPro.Bold"
    },
    "jetbrains-mono": {
        regular: "MCBanners.JetbrainsMono.Regular",
        bold: "MCBanners.JetbrainsMono.Bold"
    },
    roboto: { regular: "MCBanners.Roboto.Regular", bold: "MCBanners.Roboto.Bold" }
};
let fontsRegistered = false;
/**
 * Registers all bundled renderer fonts with the @napi-rs/canvas GlobalFonts
 * registry using stable, namespaced family names.
 *
 * This must be called once before any text rendering. Subsequent calls are
 * no-ops (idempotent). Throws if any font file is missing or registration fails.
 */
export const registerRendererFonts = () => {
    if (fontsRegistered)
        return;
    for (const fontFace of rendererFontFaceValues) {
        for (const fontWeight of fontWeightValues) {
            const assetKey = FONT_ASSET_KEYS[fontFace][fontWeight];
            const asset = rendererAssetManifest.assets.find((a) => a.key === assetKey);
            if (asset === undefined) {
                throw new Error(`Renderer font asset not found in manifest: ${assetKey}`);
            }
            const familyName = FONT_FAMILY_NAMES[fontFace][fontWeight];
            const fontFilePath = resolveAssetPath(asset);
            const result = GlobalFonts.registerFromPath(fontFilePath, familyName);
            if (result === null) {
                throw new Error(`Failed to register renderer font: ${familyName} from ${fontFilePath}`);
            }
        }
    }
    fontsRegistered = true;
};
/**
 * Returns the registered canvas family name for a given font face and weight.
 */
export const resolveFontFamilyName = (fontFace, fontWeight) => FONT_FAMILY_NAMES[fontFace][fontWeight];
/**
 * Builds a CSS font shorthand string for use with `context.font`.
 * Example: `'20px "MCBanners.Inter.Bold"'`
 */
export const buildFontSpec = (fontFace, fontWeight, fontSize) => {
    const family = resolveFontFamilyName(fontFace, fontWeight);
    return `${String(fontSize)}px "${family}"`;
};
