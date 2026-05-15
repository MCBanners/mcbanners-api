import type { RendererFontFace } from "../types/font-face";
import type { FontWeight } from "../types/font-weight";
/**
 * Registers all bundled renderer fonts with the @napi-rs/canvas GlobalFonts
 * registry using stable, namespaced family names.
 *
 * This must be called once before any text rendering. Subsequent calls are
 * no-ops (idempotent). Throws if any font file is missing or registration fails.
 */
export declare const registerRendererFonts: () => void;
/**
 * Returns the registered canvas family name for a given font face and weight.
 */
export declare const resolveFontFamilyName: (
  fontFace: RendererFontFace,
  fontWeight: FontWeight
) => string;
/**
 * Builds a CSS font shorthand string for use with `context.font`.
 * Example: `'20px "MCBanners.Inter.Bold"'`
 */
export declare const buildFontSpec: (
  fontFace: RendererFontFace,
  fontWeight: FontWeight,
  fontSize: number
) => string;
//# sourceMappingURL=font-registry.d.ts.map
