import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "bun:test";

import {
  AUTHOR_BANNER_HEIGHT,
  AUTHOR_BANNER_WIDTH,
  buildAuthorBannerNodes,
  createCanvasSurface,
  encodePng,
  parseAuthorBannerSettings,
  registerRendererFonts,
  renderNode
} from "../src";
import { FIXTURE_SPIGOT_AUTHOR } from "./fixtures/author-fixtures";

beforeAll(() => {
  registerRendererFonts();
});

const renderPng = async (): Promise<Buffer> => {
  const nodes = buildAuthorBannerNodes(FIXTURE_SPIGOT_AUTHOR, parseAuthorBannerSettings({}));
  const surface = createCanvasSurface(AUTHOR_BANNER_WIDTH, AUTHOR_BANNER_HEIGHT);
  for (const node of nodes) {
    await renderNode(surface, node);
  }

  return await encodePng(surface);
};

describe("author layout render", () => {
  it("renders deterministic PNG output for the same fixture", async () => {
    const first = await renderPng();
    const second = await renderPng();
    const firstHash = createHash("sha256").update(first).digest("hex");
    const secondHash = createHash("sha256").update(second).digest("hex");

    expect(first.byteLength).toBeGreaterThan(0);
    expect(firstHash).toBe(secondHash);
  });
});
