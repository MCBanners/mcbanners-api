import { z } from "zod";

export type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface HttpClientOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;
const USER_AGENT = "MCBanners";

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

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
