import type { TextAlign } from "@mcbanners/domain";

import type { RendererTextAlign } from "../types/text-align";

/**
 * Maps a domain TextAlign (UPPER, from compatibility query params) to
 * the renderer-internal RendererTextAlign (lowercase).
 *
 * Ported from TextAlign.java enum constants.
 */
const TEXT_ALIGN_MAP: Record<TextAlign, RendererTextAlign> = {
  RIGHT: "right",
  CENTER: "center",
  LEFT: "left"
};

export const mapTextAlign = (textAlign: TextAlign): RendererTextAlign => TEXT_ALIGN_MAP[textAlign];
