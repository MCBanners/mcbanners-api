import { describe, expect, test } from "bun:test";

import { createHash } from "node:crypto";

import {
  createCanvasSurface,
  encodeJpg,
  encodePng,
  registerRendererFonts,
  renderImageNode,
  renderSpriteNode,
  renderTextNode,
  renderWrappedTextNode,
  WHITE
} from "@mcbanners/banner-renderer";

const sha256 = (buf: Buffer): string => createHash("sha256").update(buf).digest("hex");

/** Renders a fixed scene and returns PNG + JPG buffers. */
const renderReferenceScene = async (): Promise<{ png: Buffer; jpg: Buffer }> => {
  registerRendererFonts();
  const surface = createCanvasSurface(468, 60);

  await renderImageNode(surface, {
    type: "image",
    x: 0,
    y: 0,
    width: 468,
    height: 60,
    assetKey: "BLUE_RADIAL"
  });

  await renderSpriteNode(surface, {
    type: "sprite",
    x: 18,
    y: 17,
    assetKey: "STAR_FULL",
    width: 24,
    height: 24
  });

  renderTextNode(surface, {
    type: "text",
    x: 56,
    y: 37,
    content: "MCBanners",
    fontFace: "inter",
    fontWeight: "bold",
    fontSize: 20,
    color: WHITE,
    align: "left"
  });

  const png = await encodePng(surface);
  const jpg = await encodeJpg(surface);
  return { png, jpg };
};

describe("deterministic rendering", () => {
  test("identical render trees produce identical PNG bytes", async () => {
    const first = await renderReferenceScene();
    const second = await renderReferenceScene();

    expect(sha256(first.png)).toBe(sha256(second.png));
  });

  test("identical render trees produce identical JPEG bytes", async () => {
    const first = await renderReferenceScene();
    const second = await renderReferenceScene();

    expect(sha256(first.jpg)).toBe(sha256(second.jpg));
  });

  test("PNG output is non-empty and has valid signature across renders", async () => {
    const pngSignature = [0x89, 0x50, 0x4e, 0x47] as const;
    const { png } = await renderReferenceScene();

    expect(png.length).toBeGreaterThan(1000);
    expect([...png.subarray(0, pngSignature.length)]).toEqual([...pngSignature]);
  });

  test("JPEG output is non-empty and has valid signature across renders", async () => {
    const jpgSignature = [0xff, 0xd8, 0xff] as const;
    const { jpg } = await renderReferenceScene();

    expect(jpg.length).toBeGreaterThan(500);
    expect([...jpg.subarray(0, jpgSignature.length)]).toEqual([...jpgSignature]);
  });

  test("text-only render is deterministic", async () => {
    const render = async (): Promise<Buffer> => {
      registerRendererFonts();
      const surface = createCanvasSurface(468, 60);

      renderTextNode(surface, {
        type: "text",
        x: 10,
        y: 37,
        content: "Hello world — determinism check",
        fontFace: "source-sans-pro",
        fontWeight: "regular",
        fontSize: 16,
        color: WHITE,
        align: "left"
      });

      return encodePng(surface);
    };

    const first = await render();
    const second = await render();

    expect(sha256(first)).toBe(sha256(second));
  });

  test("wrapped text render is deterministic", async () => {
    const render = async (): Promise<Buffer> => {
      registerRendererFonts();
      const surface = createCanvasSurface(468, 120);

      renderWrappedTextNode(surface, {
        type: "wrapped-text",
        x: 10,
        y: 20,
        content: "Wrapping determinism test with a line long enough to wrap inside the given width",
        fontFace: "inter",
        fontWeight: "regular",
        fontSize: 14,
        color: WHITE,
        align: "left",
        maxWidth: 250,
        lineHeight: 18
      });

      return encodePng(surface);
    };

    const first = await render();
    const second = await render();

    expect(sha256(first)).toBe(sha256(second));
  });

  test("different text content produces different PNG hash", async () => {
    registerRendererFonts();

    const renderWith = async (content: string): Promise<Buffer> => {
      const surface = createCanvasSurface(468, 60);
      renderTextNode(surface, {
        type: "text",
        x: 10,
        y: 37,
        content,
        fontFace: "inter",
        fontWeight: "regular",
        fontSize: 20,
        color: WHITE,
        align: "left"
      });
      return encodePng(surface);
    };

    const a = await renderWith("Alpha");
    const b = await renderWith("Beta");

    expect(sha256(a)).not.toBe(sha256(b));
  });

  test("different backgrounds produce different PNG hash", async () => {
    const renderWith = async (assetKey: string): Promise<Buffer> => {
      const surface = createCanvasSurface(468, 60);
      await renderImageNode(surface, {
        type: "image",
        x: 0,
        y: 0,
        width: 468,
        height: 60,
        assetKey
      });
      return encodePng(surface);
    };

    const blue = await renderWith("BLUE_RADIAL");
    const orange = await renderWith("ORANGE_RADIAL");

    expect(sha256(blue)).not.toBe(sha256(orange));
  });
});
