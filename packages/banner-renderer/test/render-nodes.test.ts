import { describe, expect, test } from "bun:test";

import type {
  DebugNode,
  ImageNode,
  RenderNode,
  SpriteNode,
  TextNode,
  WrappedTextNode
} from "@mcbanners/banner-renderer";
import { BLACK, WHITE, rgbaColor } from "@mcbanners/banner-renderer";

const sampleTextNode = (): TextNode => ({
  type: "text",
  x: 10,
  y: 30,
  content: "Hello world",
  fontFace: "inter",
  fontWeight: "bold",
  fontSize: 20,
  color: WHITE,
  align: "left"
});

const sampleWrappedTextNode = (): WrappedTextNode => ({
  type: "wrapped-text",
  x: 10,
  y: 30,
  content: "This is a longer piece of text that should be wrapped across multiple lines",
  fontFace: "source-sans-pro",
  fontWeight: "regular",
  fontSize: 14,
  color: WHITE,
  align: "left",
  maxWidth: 240,
  lineHeight: 18,
  maxChars: 200
});

const sampleImageNode = (): ImageNode => ({
  type: "image",
  x: 0,
  y: 0,
  width: 468,
  height: 60,
  assetKey: "BLUE_RADIAL"
});

const sampleSpriteNode = (): SpriteNode => ({
  type: "sprite",
  x: 18,
  y: 17,
  assetKey: "STAR_FULL",
  width: 24,
  height: 24
});

const sampleDebugNode = (): DebugNode => ({
  type: "debug",
  x: 0,
  y: 0,
  width: 100,
  height: 50,
  label: "debug-bounds",
  color: rgbaColor(255, 0, 0)
});

describe("render node serialization", () => {
  test("TextNode is JSON-serializable and round-trips cleanly", () => {
    const node = sampleTextNode();
    const serialized = JSON.stringify(node);
    const deserialized = JSON.parse(serialized) as TextNode;

    expect(deserialized.type).toBe("text");
    expect(deserialized.content).toBe(node.content);
    expect(deserialized.fontFace).toBe(node.fontFace);
    expect(deserialized.fontWeight).toBe(node.fontWeight);
    expect(deserialized.fontSize).toBe(node.fontSize);
    expect(deserialized.color).toEqual(node.color);
    expect(deserialized.align).toBe(node.align);
    expect(deserialized.x).toBe(node.x);
    expect(deserialized.y).toBe(node.y);
  });

  test("WrappedTextNode is JSON-serializable and round-trips cleanly", () => {
    const node = sampleWrappedTextNode();
    const serialized = JSON.stringify(node);
    const deserialized = JSON.parse(serialized) as WrappedTextNode;

    expect(deserialized.type).toBe("wrapped-text");
    expect(deserialized.maxWidth).toBe(node.maxWidth);
    expect(deserialized.lineHeight).toBe(node.lineHeight);
    expect(deserialized.maxChars).toBe(node.maxChars);
  });

  test("WrappedTextNode without maxChars serializes without undefined field", () => {
    const node: WrappedTextNode = {
      ...sampleWrappedTextNode(),
      maxChars: undefined
    };
    const serialized = JSON.stringify(node);
    const parsed = JSON.parse(serialized) as Record<string, unknown>;

    expect("maxChars" in parsed).toBe(false);
  });

  test("ImageNode with assetKey is JSON-serializable", () => {
    const node = sampleImageNode();
    const deserialized = JSON.parse(JSON.stringify(node)) as ImageNode;

    expect(deserialized.type).toBe("image");
    expect(deserialized.assetKey).toBe("BLUE_RADIAL");
    expect(deserialized.imageData).toBeUndefined();
  });

  test("ImageNode with imageData is JSON-serializable", () => {
    const imageBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const node: ImageNode = {
      type: "image",
      x: 0,
      y: 0,
      width: 32,
      height: 32,
      imageData: imageBytes.toString("base64")
    };
    const deserialized = JSON.parse(JSON.stringify(node)) as ImageNode;

    expect(deserialized.imageData).toBe(node.imageData);
    expect(Buffer.from(deserialized.imageData!, "base64")).toEqual(imageBytes);
  });

  test("SpriteNode is JSON-serializable and round-trips cleanly", () => {
    const node = sampleSpriteNode();
    const deserialized = JSON.parse(JSON.stringify(node)) as SpriteNode;

    expect(deserialized.type).toBe("sprite");
    expect(deserialized.assetKey).toBe("STAR_FULL");
    expect(deserialized.width).toBe(24);
    expect(deserialized.height).toBe(24);
  });

  test("DebugNode is JSON-serializable and round-trips cleanly", () => {
    const node = sampleDebugNode();
    const deserialized = JSON.parse(JSON.stringify(node)) as DebugNode;

    expect(deserialized.type).toBe("debug");
    expect(deserialized.label).toBe("debug-bounds");
    expect(deserialized.color).toEqual({ r: 255, g: 0, b: 0, a: 255 });
  });

  test("RenderNode array is JSON-serializable as a heterogeneous tree", () => {
    const nodes: RenderNode[] = [
      sampleImageNode(),
      sampleSpriteNode(),
      sampleTextNode(),
      sampleWrappedTextNode(),
      sampleDebugNode()
    ];
    const serialized = JSON.stringify(nodes);
    const deserialized = JSON.parse(serialized) as RenderNode[];

    expect(deserialized).toHaveLength(5);
    expect(deserialized.map((n) => n.type)).toEqual([
      "image",
      "sprite",
      "text",
      "wrapped-text",
      "debug"
    ]);
  });

  test("discriminated union narrows correctly on type field", () => {
    const nodes: RenderNode[] = [sampleTextNode(), sampleImageNode(), sampleSpriteNode()];

    for (const node of nodes) {
      switch (node.type) {
        case "text":
          expect(node.content).toBeDefined();
          break;
        case "image":
          expect(node.width).toBeDefined();
          break;
        case "sprite":
          expect(node.assetKey).toBeDefined();
          break;
      }
    }
  });

  test("RgbaColor constants are JSON-serializable", () => {
    expect(JSON.parse(JSON.stringify(WHITE))).toEqual({ r: 255, g: 255, b: 255, a: 255 });
    expect(JSON.parse(JSON.stringify(BLACK))).toEqual({ r: 0, g: 0, b: 0, a: 255 });
  });

  test("render node snapshot matches expected shape", () => {
    expect(sampleTextNode()).toMatchSnapshot();
    expect(sampleWrappedTextNode()).toMatchSnapshot();
    expect(sampleImageNode()).toMatchSnapshot();
    expect(sampleSpriteNode()).toMatchSnapshot();
  });
});
