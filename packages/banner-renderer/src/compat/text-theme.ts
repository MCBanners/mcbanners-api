import type { TextTheme } from "@mcbanners/domain";

import type { RgbaColor } from "../types/rgba-color";
import { rgbaColor } from "../types/rgba-color";

/**
 * LIGHT theme text color.
 * From Java: Layout.LIGHT_TEXT = new Color(230, 224, 224)
 */
export const LIGHT_TEXT_COLOR: RgbaColor = Object.freeze(rgbaColor(230, 224, 224));

/**
 * DARK theme text color.
 * From Java: Layout.DARK_TEXT = new Color(65, 60, 60)
 */
export const DARK_TEXT_COLOR: RgbaColor = Object.freeze(rgbaColor(65, 60, 60));

/**
 * Returns the text foreground color for a given TextTheme.
 * Ported from Layout.java textColor() method.
 */
export const resolveTextColor = (textTheme: TextTheme): RgbaColor =>
  textTheme === "LIGHT" ? LIGHT_TEXT_COLOR : DARK_TEXT_COLOR;
