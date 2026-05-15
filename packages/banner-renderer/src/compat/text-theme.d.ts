import type { TextTheme } from "@mcbanners/domain";
import type { RgbaColor } from "../types/rgba-color";
/**
 * LIGHT theme text color.
 * From Java: Layout.LIGHT_TEXT = new Color(230, 224, 224)
 */
export declare const LIGHT_TEXT_COLOR: RgbaColor;
/**
 * DARK theme text color.
 * From Java: Layout.DARK_TEXT = new Color(65, 60, 60)
 */
export declare const DARK_TEXT_COLOR: RgbaColor;
/**
 * Returns the text foreground color for a given TextTheme.
 * Ported from Layout.java textColor() method.
 */
export declare const resolveTextColor: (textTheme: TextTheme) => RgbaColor;
//# sourceMappingURL=text-theme.d.ts.map
