import type { z } from "zod";

export type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface HttpClientOptions {
  timeoutMs?: number;
  maxImageBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_IMAGE_BYTES = 1_048_576;
const REMOTE_LOGO_CACHE_TTL_MS = 5 * 60_000;
const REMOTE_LOGO_CACHE_MAX_ENTRIES = 128;
const REMOTE_LOGO_CACHE_MAX_BYTES = 8 * 1024 * 1024;
const USER_AGENT = "MCBanners";
export const allowedImageContentTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif"
] as const;
const ALLOWED_IMAGE_CONTENT_TYPES = new Set<string>(allowedImageContentTypes);

export const defaultMaxImageBytes = DEFAULT_MAX_IMAGE_BYTES;

interface FetchedImage {
  readonly base64: string;
  readonly byteLength: number;
}

interface RemoteLogoCacheEntry extends FetchedImage {
  readonly expiresAt: number;
  readonly estimatedBytes: number;
}

interface RemoteLogoCache {
  readonly entries: Map<string, RemoteLogoCacheEntry>;
  readonly inFlight: Map<string, Promise<FetchedImage | null>>;
  bytes: number;
}

const remoteLogoCache: RemoteLogoCache = { entries: new Map(), inFlight: new Map(), bytes: 0 };
const fetchCacheIds = new WeakMap<FetchFn, number>();
let nextFetchCacheId = 0;

const getFetchCacheId = (fetchFn: FetchFn): number => {
  let id = fetchCacheIds.get(fetchFn);
  if (id === undefined) {
    id = ++nextFetchCacheId;
    fetchCacheIds.set(fetchFn, id);
  }
  return id;
};

const deleteRemoteLogoCacheEntry = (cache: RemoteLogoCache, url: string): void => {
  const entry = cache.entries.get(url);
  if (entry === undefined) return;
  cache.entries.delete(url);
  cache.bytes -= entry.estimatedBytes;
};

const readRemoteLogoCache = (
  cache: RemoteLogoCache,
  url: string,
  maxImageBytes: number
): RemoteLogoCacheEntry | null | undefined => {
  const entry = cache.entries.get(url);
  if (entry === undefined) return undefined;
  if (entry.expiresAt <= Date.now()) {
    deleteRemoteLogoCacheEntry(cache, url);
    return undefined;
  }
  if (entry.byteLength > maxImageBytes) return null;

  cache.entries.delete(url);
  cache.entries.set(url, entry);
  return entry;
};

const cacheRemoteLogo = (cache: RemoteLogoCache, url: string, image: FetchedImage): void => {
  const estimatedBytes = (image.base64.length + url.length) * 2;
  if (estimatedBytes > REMOTE_LOGO_CACHE_MAX_BYTES) return;

  deleteRemoteLogoCacheEntry(cache, url);
  while (
    cache.entries.size >= REMOTE_LOGO_CACHE_MAX_ENTRIES ||
    cache.bytes + estimatedBytes > REMOTE_LOGO_CACHE_MAX_BYTES
  ) {
    const oldestUrl = cache.entries.keys().next().value;
    if (oldestUrl === undefined) break;
    deleteRemoteLogoCacheEntry(cache, oldestUrl);
  }

  cache.entries.set(url, {
    ...image,
    expiresAt: Date.now() + REMOTE_LOGO_CACHE_TTL_MS,
    estimatedBytes
  });
  cache.bytes += estimatedBytes;
};

export async function fetchJson<T>(
  url: string,
  schema: z.ZodType<T>,
  options?: HttpClientOptions,
  fetchFn: FetchFn = fetch
): Promise<T | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchFn(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT }
    });

    if (response.status === 404) return null;
    if (!response.ok) return null;

    const json: unknown = await response.json();
    const result = schema.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchImageBase64(
  url: string,
  options?: HttpClientOptions,
  fetchFn: FetchFn = fetch
): Promise<string | null> {
  if (!url) return null;

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxImageBytes = options?.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const cacheKey = JSON.stringify([getFetchCacheId(fetchFn), url]);
  const cached = readRemoteLogoCache(remoteLogoCache, cacheKey, maxImageBytes);
  if (cached !== undefined) return cached?.base64 ?? null;

  const inFlightKey = JSON.stringify([cacheKey, maxImageBytes, timeoutMs]);
  let request = remoteLogoCache.inFlight.get(inFlightKey);
  if (request === undefined) {
    request = fetchImageBase64Uncached(url, options, fetchFn);
    remoteLogoCache.inFlight.set(inFlightKey, request);
  }

  try {
    const image = await request;
    if (image !== null) cacheRemoteLogo(remoteLogoCache, cacheKey, image);
    return image?.base64 ?? null;
  } finally {
    if (remoteLogoCache.inFlight.get(inFlightKey) === request) {
      remoteLogoCache.inFlight.delete(inFlightKey);
    }
  }
}

async function fetchImageBase64Uncached(
  url: string,
  options: HttpClientOptions | undefined,
  fetchFn: FetchFn
): Promise<FetchedImage | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxImageBytes = options?.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  let cancelReader: (() => Promise<void>) | undefined;
  let releaseReaderLock: (() => void) | undefined;
  let bodyComplete = false;

  try {
    const response = await fetchFn(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT }
    });

    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      return null;
    }

    const contentTypeHeader = response.headers.get("Content-Type");
    if (contentTypeHeader !== null) {
      const contentType = contentTypeHeader.split(";")[0]?.trim().toLowerCase();
      if (contentType === undefined || !ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
        void response.body?.cancel().catch(() => {});
        return null;
      }
    }

    const contentLengthHeader = response.headers.get("Content-Length");
    if (contentLengthHeader !== null) {
      const contentLength = /^\d+$/.test(contentLengthHeader.trim())
        ? Number(contentLengthHeader)
        : Number.NaN;
      if (contentLength > maxImageBytes) {
        controller.abort();
        void response.body?.cancel().catch(() => {});
        return null;
      }
    }

    if (response.body === null) {
      bodyComplete = true;
      return maxImageBytes < 0 ? null : { base64: "", byteLength: 0 };
    }

    const reader = response.body.getReader();
    cancelReader = () => reader.cancel();
    releaseReaderLock = () => reader.releaseLock();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        bodyComplete = true;
        break;
      }
      if (totalBytes + value.byteLength > maxImageBytes) {
        controller.abort();
        return null;
      }
      chunks.push(value);
      totalBytes += value.byteLength;
    }

    return { base64: Buffer.concat(chunks, totalBytes).toString("base64"), byteLength: totalBytes };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    if (!bodyComplete) void cancelReader?.().catch(() => {});
    releaseReaderLock?.();
  }
}
