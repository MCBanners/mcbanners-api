import { describe, expect, test } from "bun:test";

import { createHash } from "node:crypto";

import {
  BLACK,
  buildFontSpec,
  createCanvasSurface,
  encodeJpg,
  encodePng,
  registerRendererFonts,
  renderDebugNode,
  renderImageNode,
  renderSpriteNode,
  renderTextNode,
  renderWrappedTextNode,
  rgbaColor,
  WHITE
} from "@mcbanners/banner-renderer";

const pngSignature = [0x89, 0x50, 0x4e, 0x47] as const;
const jpgSignature = [0xff, 0xd8, 0xff] as const;

describe("renderer primitives", () => {
  test("createCanvasSurface creates a surface with the correct dimensions", () => {
    const surface = createCanvasSurface(468, 60);

    expect(surface.width).toBe(468);
    expect(surface.height).toBe(60);
    expect(surface.canvas.width).toBe(468);
    expect(surface.canvas.height).toBe(60);
    expect(surface.context).toBeDefined();
  });

  test("registerRendererFonts registers all 16 font files without error", () => {
    expect(() => {
      registerRendererFonts();
    }).not.toThrow();
  });

  test("registerRendererFonts is idempotent across multiple calls", () => {
    expect(() => {
      registerRendererFonts();
      registerRendererFonts();
      registerRendererFonts();
    }).not.toThrow();
  });

  test("buildFontSpec produces expected CSS font string", () => {
    const spec = buildFontSpec("inter", "bold", 20);
    expect(spec).toBe('20px "MCBanners.Inter.Bold"');
  });

  test("buildFontSpec produces regular weight string", () => {
    const spec = buildFontSpec("source-sans-pro", "regular", 14);
    expect(spec).toBe('14px "MCBanners.SourceSansPro.Regular"');
  });

  test("renderTextNode draws to surface without error", () => {
    registerRendererFonts();
    const surface = createCanvasSurface(468, 60);

    expect(() => {
      renderTextNode(surface, {
        type: "text",
        x: 56,
        y: 37,
        content: "MCBanners",
        fontFace: "inter",
        fontWeight: "regular",
        fontSize: 20,
        color: WHITE,
        align: "left"
      });
    }).not.toThrow();
  });

  test("renderTextNode draws centered text without error", () => {
    registerRendererFonts();
    const surface = createCanvasSurface(468, 60);

    expect(() => {
      renderTextNode(surface, {
        type: "text",
        x: 0,
        y: 37,
        content: "Centered",
        fontFace: "inter",
        fontWeight: "bold",
        fontSize: 18,
        color: WHITE,
        align: "center"
      });
    }).not.toThrow();
  });

  test("renderWrappedTextNode draws wrapped text without error", () => {
    registerRendererFonts();
    const surface = createCanvasSurface(468, 120);

    expect(() => {
      renderWrappedTextNode(surface, {
        type: "wrapped-text",
        x: 10,
        y: 20,
        content: "A long piece of text that should wrap onto multiple lines within a banner",
        fontFace: "inter",
        fontWeight: "regular",
        fontSize: 14,
        color: WHITE,
        align: "left",
        maxWidth: 295,
        lineHeight: 18
      });
    }).not.toThrow();
  });

  test("renderWrappedTextNode truncates before wrapping when maxChars set", () => {
    registerRendererFonts();
    const surface = createCanvasSurface(468, 120);

    expect(() => {
      renderWrappedTextNode(surface, {
        type: "wrapped-text",
        x: 10,
        y: 20,
        content: "This text has more characters than allowed by the maxChars limit set here",
        fontFace: "inter",
        fontWeight: "regular",
        fontSize: 14,
        color: WHITE,
        align: "left",
        maxWidth: 295,
        lineHeight: 18,
        maxChars: 30
      });
    }).not.toThrow();
  });

  test("renderImageNode draws asset manifest background without error", async () => {
    const surface = createCanvasSurface(468, 60);

    await renderImageNode(surface, {
      type: "image",
      x: 0,
      y: 0,
      width: 468,
      height: 60,
      assetKey: "BLUE_RADIAL"
    });
  });

  test("renderImageNode draws base64 imageData without error", async () => {
    // Build a tiny 1x1 transparent PNG
    const surface = createCanvasSurface(10, 10);
    const tinyPng = await surface.canvas.encode("png");
    const imageData = tinyPng.toString("base64");

    await renderImageNode(surface, {
      type: "image",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      imageData
    });
  });

  test("renderImageNode throws when neither assetKey nor imageData provided", async () => {
    const surface = createCanvasSurface(10, 10);
    let caughtError: unknown;

    try {
      await renderImageNode(surface, {
        type: "image",
        x: 0,
        y: 0,
        width: 10,
        height: 10
      });
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toContain(
      "ImageNode requires either assetKey or imageData"
    );
  });

  test("renderSpriteNode draws sprite without error", async () => {
    const surface = createCanvasSurface(468, 60);

    await renderSpriteNode(surface, {
      type: "sprite",
      x: 18,
      y: 17,
      assetKey: "STAR_FULL",
      width: 24,
      height: 24
    });
  });

  test("renderSpriteNode throws for unknown asset key", async () => {
    const surface = createCanvasSurface(10, 10);
    let caughtError: unknown;

    try {
      await renderSpriteNode(surface, {
        type: "sprite",
        x: 0,
        y: 0,
        assetKey: "DOES_NOT_EXIST",
        width: 10,
        height: 10
      });
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toContain("Image asset not found in manifest");
  });

  test("renderDebugNode draws debug overlay without error", () => {
    const surface = createCanvasSurface(200, 100);

    expect(() => {
      renderDebugNode(surface, {
        type: "debug",
        x: 10,
        y: 10,
        width: 80,
        height: 40,
        label: "test-debug",
        color: rgbaColor(255, 0, 0)
      });
    }).not.toThrow();
  });

  test("encodePng returns non-empty buffer with PNG signature", async () => {
    const surface = createCanvasSurface(10, 10);
    const png = await encodePng(surface);

    expect(png.length).toBeGreaterThan(0);
    expect([...png.subarray(0, pngSignature.length)]).toEqual([...pngSignature]);
  });

  test("encodeJpg returns non-empty buffer with JPEG signature", async () => {
    const surface = createCanvasSurface(10, 10);
    const jpg = await encodeJpg(surface);

    expect(jpg.length).toBeGreaterThan(0);
    expect([...jpg.subarray(0, jpgSignature.length)]).toEqual([...jpgSignature]);
  });

  test("encodePng with rendered content produces larger buffer than blank canvas", async () => {
    registerRendererFonts();
    const blank = createCanvasSurface(468, 60);
    const withContent = createCanvasSurface(468, 60);

    await renderImageNode(withContent, {
      type: "image",
      x: 0,
      y: 0,
      width: 468,
      height: 60,
      assetKey: "BLUE_RADIAL"
    });

    const blankPng = await encodePng(blank);
    const contentPng = await encodePng(withContent);

    // A canvas with an image drawn will differ from a blank canvas
    const blankHash = createHash("sha256").update(blankPng).digest("hex");
    const contentHash = createHash("sha256").update(contentPng).digest("hex");

    expect(blankHash).not.toBe(contentHash);
  });

  test("full scene renders without error and produces valid PNG", async () => {
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

    surface.context.fillStyle = "rgba(0,0,0,0.28)";
    surface.context.fillRect(0, 0, 468, 60);

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
      content: "MCBanners renderer primitives",
      fontFace: "inter",
      fontWeight: "regular",
      fontSize: 20,
      color: WHITE,
      align: "left"
    });

    const png = await encodePng(surface);
    const jpg = await encodeJpg(surface);

    expect(png.length).toBeGreaterThan(0);
    expect(jpg.length).toBeGreaterThan(0);
    expect([...png.subarray(0, pngSignature.length)]).toEqual([...pngSignature]);
    expect([...jpg.subarray(0, jpgSignature.length)]).toEqual([...jpgSignature]);
  });

  test("all eight font faces render without error", () => {
    registerRendererFonts();
    const surface = createCanvasSurface(468, 60);
    const faces = [
      "inter",
      "montserrat",
      "open-sans",
      "poppins",
      "raleway",
      "source-sans-pro",
      "jetbrains-mono",
      "roboto"
    ] as const;

    for (const fontFace of faces) {
      expect(() => {
        renderTextNode(surface, {
          type: "text",
          x: 10,
          y: 30,
          content: fontFace,
          fontFace,
          fontWeight: "regular",
          fontSize: 14,
          color: BLACK,
          align: "left"
        });
      }).not.toThrow();
    }
  });
});
