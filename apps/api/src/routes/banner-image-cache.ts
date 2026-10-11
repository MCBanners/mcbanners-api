import type { MemoryCache } from "@mcbanners/cache";

export interface BannerSourceFreshness {
  readonly token: symbol;
  readonly remainingTtlMs: number;
}

export type ReadBannerSourceFreshness = () => BannerSourceFreshness | undefined;

const imageSourceTokens = new WeakMap<Buffer, symbol | undefined>();

export const readWarmBannerImage = (
  cache: MemoryCache | undefined,
  imageKey: string,
  source: BannerSourceFreshness | undefined
): { image: Buffer; remainingTtlMs: number } | undefined => {
  if (cache === undefined || source === undefined) return undefined;

  const image = cache.get<Buffer>(imageKey);
  if (image === undefined) return undefined;
  if (imageSourceTokens.get(image) !== source.token) {
    cache.delete(imageKey);
    return undefined;
  }

  return { image, remainingTtlMs: source.remainingTtlMs };
};

export const getOrRenderBannerImage = async (
  cache: MemoryCache | undefined,
  imageKey: string,
  render: () => Promise<Buffer>,
  sourceToken: symbol | undefined,
  readSourceFreshness?: ReadBannerSourceFreshness
): Promise<Buffer> => {
  const renderAndRemember = async (): Promise<Buffer> => {
    const image = await render();
    imageSourceTokens.set(image, sourceToken);
    return image;
  };

  if (cache === undefined) return renderAndRemember();

  const sourceIsCurrent = (): boolean => {
    if (readSourceFreshness === undefined) return true;
    const current = readSourceFreshness();
    return sourceToken !== undefined && current?.token === sourceToken;
  };

  const getOrSet = () =>
    cache.getOrSet(imageKey, renderAndRemember, {
      isFresh: (image) =>
        image !== null && imageSourceTokens.get(image) === sourceToken && sourceIsCurrent(),
      cacheResult: (image) => image !== null && sourceIsCurrent(),
      ...(readSourceFreshness === undefined
        ? {}
        : {
            ttlMs: () => {
              const current = readSourceFreshness();
              return current !== undefined && current.token === sourceToken
                ? Math.min(cache.getDefaultTtlMs(), current.remainingTtlMs)
                : 0;
            }
          }),
      byteEstimate: (image) => image.length
    });

  let image = await getOrSet();
  while (imageSourceTokens.get(image) !== sourceToken && sourceIsCurrent()) {
    image = await getOrSet();
  }
  return image;
};

export const bannerCacheControl = (remainingSourceTtlMs?: number): string => {
  if (remainingSourceTtlMs === undefined) {
    return "public, max-age=60, stale-while-revalidate=300";
  }

  const maxAgeSeconds = Math.floor(Math.min(60_000, remainingSourceTtlMs) / 1000);
  const staleWhileRevalidateSeconds = Math.floor(
    Math.min(300_000, Math.max(0, remainingSourceTtlMs - maxAgeSeconds * 1000)) / 1000
  );
  return `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`;
};

export const bannerImageResponse = (
  image: Buffer,
  outputType: string,
  remainingSourceTtlMs?: number,
  sourceIsCurrent = true
): Response =>
  new Response(image, {
    headers: {
      "Content-Type": outputType === "jpg" ? "image/jpeg" : "image/png",
      "Content-Length": String(image.length),
      "Cache-Control": sourceIsCurrent ? bannerCacheControl(remainingSourceTtlMs) : "no-store"
    }
  });

export const getSourceWithFreshness = async <T>(
  cache: MemoryCache | undefined,
  key: string,
  fetch: () => Promise<T>
): Promise<{ value: T; token: symbol | undefined }> => {
  if (cache === undefined) return { value: await fetch(), token: undefined };
  return cache.getOrSetWithFreshness(key, fetch, { cacheNull: false });
};
