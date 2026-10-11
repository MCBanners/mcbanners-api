import { describe, expect, it } from "bun:test";
import { MemoryCache } from "@mcbanners/cache";
import { getOrRenderBannerImage, readWarmBannerImage } from "../src/routes/banner-image-cache";

describe("banner image freshness", () => {
  it("returns warm images only while their source token is current", async () => {
    const sourceCache = new MemoryCache({ ttlMs: 60_000 });
    const imageCache = new MemoryCache({ ttlMs: 60_000 });
    sourceCache.set("source", "original");
    const originalSource = sourceCache.getEntryFreshness("source");
    expect(originalSource).toBeDefined();

    await getOrRenderBannerImage(
      imageCache,
      "image",
      async () => Buffer.from("original image"),
      originalSource?.token,
      () => sourceCache.getEntryFreshness("source")
    );
    expect(readWarmBannerImage(imageCache, "image", originalSource)).toBeDefined();

    sourceCache.set("source", "replacement");
    expect(readWarmBannerImage(imageCache, "image", sourceCache.getEntryFreshness("source"))).toBe(
      undefined
    );
    expect(imageCache.get<Buffer>("image")).toBeUndefined();
  });

  it("caps rendered image TTL at the source TTL", async () => {
    const sourceCache = new MemoryCache({ ttlMs: 40 });
    const imageCache = new MemoryCache({ ttlMs: 60_000 });
    sourceCache.set("source", "value");
    const source = sourceCache.getEntryFreshness("source");

    await getOrRenderBannerImage(
      imageCache,
      "image",
      async () => Buffer.from("image"),
      source?.token,
      () => sourceCache.getEntryFreshness("source")
    );

    expect(imageCache.getRemainingTtlMs("image")).toBeLessThanOrEqual(40);
  });

  it("does not cache a render if its source changes while rendering", async () => {
    const sourceCache = new MemoryCache({ ttlMs: 60_000 });
    const imageCache = new MemoryCache({ ttlMs: 60_000 });
    sourceCache.set("source", "original");
    const originalSource = sourceCache.getEntryFreshness("source");
    let finishRender: ((image: Buffer) => void) | undefined;

    const rendered = getOrRenderBannerImage(
      imageCache,
      "image",
      () =>
        new Promise<Buffer>((resolve) => {
          finishRender = resolve;
        }),
      originalSource?.token,
      () => sourceCache.getEntryFreshness("source")
    );
    sourceCache.set("source", "replacement");
    finishRender?.(Buffer.from("outdated image"));
    await rendered;

    expect(imageCache.get<Buffer>("image")).toBeUndefined();
  });

  it("does not share an old in-flight image with a request for a replacement source", async () => {
    const sourceCache = new MemoryCache({ ttlMs: 60_000 });
    const imageCache = new MemoryCache({ ttlMs: 60_000 });
    sourceCache.set("source", "original");
    const originalSource = sourceCache.getEntryFreshness("source");
    let finishOldRender: ((image: Buffer) => void) | undefined;
    const oldRequest = getOrRenderBannerImage(
      imageCache,
      "image",
      () =>
        new Promise<Buffer>((resolve) => {
          finishOldRender = resolve;
        }),
      originalSource?.token,
      () => sourceCache.getEntryFreshness("source")
    );

    sourceCache.set("source", "replacement");
    const replacementSource = sourceCache.getEntryFreshness("source");
    const replacementImage = Buffer.from("replacement image");
    let replacementRenders = 0;
    const replacementRequest = getOrRenderBannerImage(
      imageCache,
      "image",
      async () => {
        replacementRenders += 1;
        return replacementImage;
      },
      replacementSource?.token,
      () => sourceCache.getEntryFreshness("source")
    );

    finishOldRender?.(Buffer.from("outdated image"));
    await oldRequest;

    expect(await replacementRequest).toBe(replacementImage);
    expect(replacementRenders).toBe(1);
    expect(imageCache.get<Buffer>("image")).toBe(replacementImage);
  });

  it("treats expired source entries as unavailable for warm image hits", async () => {
    const sourceCache = new MemoryCache({ ttlMs: 1 });
    const imageCache = new MemoryCache({ ttlMs: 60_000 });
    sourceCache.set("source", "value", 1);
    const source = sourceCache.getEntryFreshness("source");
    expect(source).toBeDefined();
    await getOrRenderBannerImage(
      imageCache,
      "image",
      async () => Buffer.from("image"),
      source?.token,
      () => sourceCache.getEntryFreshness("source")
    );
    await Bun.sleep(5);

    expect(readWarmBannerImage(imageCache, "image", sourceCache.getEntryFreshness("source"))).toBe(
      undefined
    );
  });
});
