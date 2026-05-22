import type { z } from "zod";

export type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface HttpClientOptions {
  timeoutMs?: number;
  maxImageBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_IMAGE_BYTES = 1_048_576;
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
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchFn(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT }
    });

    if (!response.ok) return null;

    const contentTypeHeader = response.headers.get("Content-Type");
    if (contentTypeHeader !== null) {
      const contentType = contentTypeHeader.split(";")[0]?.trim().toLowerCase();
      if (contentType === undefined || !ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
        return null;
      }
    }

    const contentLengthHeader = response.headers.get("Content-Length");
    if (contentLengthHeader !== null) {
      const contentLength = Number.parseInt(contentLengthHeader, 10);
      if (Number.isFinite(contentLength) && contentLength > maxImageBytes) {
        return null;
      }
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxImageBytes) {
      return null;
    }

    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
