import { describe, expect, it } from "bun:test";
import { z } from "zod";

import { type FetchFn, fetchImageBase64, fetchJson } from "../src/http-client";

const JsonSchema = z.object({ ok: z.boolean() });
const tinyPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

const responseFetch =
  (response: Response): FetchFn =>
  () =>
    Promise.resolve(response);

describe("fetchJson", () => {
  it("returns parsed JSON for a schema-valid 200 response", async () => {
    const result = await fetchJson(
      "https://example.test/data",
      JsonSchema,
      {},
      responseFetch(Response.json({ ok: true }))
    );

    expect(result).toEqual({ ok: true });
  });

  it.each([202, 401, 429, 500])("maps HTTP %p to null", async (status) => {
    const result = await fetchJson(
      "https://example.test/data",
      JsonSchema,
      {},
      responseFetch(new Response("{}", { status }))
    );

    expect(result).toBeNull();
  });

  it("maps timeout aborts to null", async () => {
    const abortingFetch: FetchFn = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });

    const result = await fetchJson(
      "https://example.test/slow",
      JsonSchema,
      { timeoutMs: 1 },
      abortingFetch
    );

    expect(result).toBeNull();
  });

  it("maps malformed JSON to null", async () => {
    const result = await fetchJson(
      "https://example.test/data",
      JsonSchema,
      {},
      responseFetch(new Response("not json", { status: 200 }))
    );

    expect(result).toBeNull();
  });
});

describe("fetchImageBase64", () => {
  it("reuses a successfully fetched image for the same URL", async () => {
    let requests = 0;
    const fetchFn: FetchFn = () => {
      requests += 1;
      return Promise.resolve(new Response(tinyPng, { headers: { "Content-Type": "image/png" } }));
    };

    const first = await fetchImageBase64("https://example.test/logo.png", {}, fetchFn);
    const second = await fetchImageBase64("https://example.test/logo.png", {}, fetchFn);

    expect(second).toBe(first);
    expect(requests).toBe(1);
  });

  it("coalesces concurrent requests for the same URL and options", async () => {
    let requests = 0;
    const fetchFn: FetchFn = async () => {
      requests += 1;
      await Bun.sleep(5);
      return new Response(tinyPng, { headers: { "Content-Type": "image/png" } });
    };

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        fetchImageBase64("https://example.test/concurrent-logo.png", {}, fetchFn)
      )
    );

    expect(new Set(results).size).toBe(1);
    expect(requests).toBe(1);
  });

  it("does not let a cached image bypass a caller's smaller byte limit", async () => {
    let requests = 0;
    const fetchFn: FetchFn = () => {
      requests += 1;
      return Promise.resolve(new Response(tinyPng, { headers: { "Content-Type": "image/png" } }));
    };

    expect(
      await fetchImageBase64(
        "https://example.test/limited-logo.png",
        { maxImageBytes: tinyPng.byteLength },
        fetchFn
      )
    ).toBe(Buffer.from(tinyPng).toString("base64"));
    expect(
      await fetchImageBase64(
        "https://example.test/limited-logo.png",
        { maxImageBytes: tinyPng.byteLength - 1 },
        fetchFn
      )
    ).toBeNull();
    expect(requests).toBe(1);
  });

  it("keeps concurrent requests with different byte limits independent", async () => {
    let requests = 0;
    const fetchFn: FetchFn = async () => {
      requests += 1;
      await Bun.sleep(5);
      return new Response(tinyPng, { headers: { "Content-Type": "image/png" } });
    };

    const [withinLimit, overLimit] = await Promise.all([
      fetchImageBase64(
        "https://example.test/concurrent-limits.png",
        { maxImageBytes: tinyPng.byteLength },
        fetchFn
      ),
      fetchImageBase64(
        "https://example.test/concurrent-limits.png",
        { maxImageBytes: tinyPng.byteLength - 1 },
        fetchFn
      )
    ]);

    expect(withinLimit).toBe(Buffer.from(tinyPng).toString("base64"));
    expect(overLimit).toBeNull();
    expect(requests).toBe(2);
  });

  it("isolates custom fetch implementations and keeps changed URLs distinct", async () => {
    let firstFetchRequests = 0;
    const firstFetch: FetchFn = () => {
      firstFetchRequests += 1;
      return Promise.resolve(
        new Response(new Uint8Array([1]), { headers: { "Content-Type": "image/png" } })
      );
    };
    const secondFetch: FetchFn = () =>
      Promise.resolve(
        new Response(new Uint8Array([2]), { headers: { "Content-Type": "image/png" } })
      );

    const first = await fetchImageBase64("https://example.test/logo-a.png", {}, firstFetch);
    const isolated = await fetchImageBase64("https://example.test/logo-a.png", {}, secondFetch);
    const changedUrl = await fetchImageBase64("https://example.test/logo-b.png", {}, firstFetch);

    expect(first).toBe(Buffer.from([1]).toString("base64"));
    expect(isolated).toBe(Buffer.from([2]).toString("base64"));
    expect(changedUrl).toBe(Buffer.from([1]).toString("base64"));
    expect(firstFetchRequests).toBe(2);
  });

  it("expires successful entries and fetches them again", async () => {
    let requests = 0;
    let now = 1_000;
    const realNow = Date.now;
    Date.now = () => now;
    const fetchFn: FetchFn = () => {
      requests += 1;
      return Promise.resolve(new Response(tinyPng, { headers: { "Content-Type": "image/png" } }));
    };

    try {
      await fetchImageBase64("https://example.test/expiring-logo.png", {}, fetchFn);
      await fetchImageBase64("https://example.test/expiring-logo.png", {}, fetchFn);
      now += 5 * 60_000;
      await fetchImageBase64("https://example.test/expiring-logo.png", {}, fetchFn);
    } finally {
      Date.now = realNow;
    }

    expect(requests).toBe(2);
  });

  it("evicts the least recently used entry when the entry limit is reached", async () => {
    const requests = new Map<string, number>();
    const fetchFn: FetchFn = (input) => {
      const url = String(input);
      requests.set(url, (requests.get(url) ?? 0) + 1);
      return Promise.resolve(new Response(tinyPng, { headers: { "Content-Type": "image/png" } }));
    };

    const logoUrl = (index: number) => `https://example.test/logo-${index}.png`;
    await fetchImageBase64(logoUrl(0), {}, fetchFn);
    await fetchImageBase64(logoUrl(1), {}, fetchFn);
    await fetchImageBase64(logoUrl(0), {}, fetchFn);
    for (let index = 2; index < 129; index += 1) {
      await fetchImageBase64(logoUrl(index), {}, fetchFn);
    }

    await fetchImageBase64(logoUrl(0), {}, fetchFn);
    await fetchImageBase64(logoUrl(1), {}, fetchFn);

    expect(requests.get(logoUrl(0))).toBe(1);
    expect(requests.get(logoUrl(1))).toBe(2);
  });

  it("evicts entries when the cache byte limit is reached", async () => {
    const largeLogo = new Uint8Array(2.5 * 1024 * 1024);
    const requests = new Map<string, number>();
    const fetchFn: FetchFn = (input) => {
      const url = String(input);
      requests.set(url, (requests.get(url) ?? 0) + 1);
      return Promise.resolve(new Response(largeLogo, { headers: { "Content-Type": "image/png" } }));
    };

    const options = { maxImageBytes: largeLogo.byteLength };
    const firstUrl = "https://example.test/large-logo-a.png";
    const secondUrl = "https://example.test/large-logo-b.png";
    expect(await fetchImageBase64(firstUrl, options, fetchFn)).not.toBe(null);
    expect(await fetchImageBase64(secondUrl, options, fetchFn)).not.toBe(null);
    expect(await fetchImageBase64(secondUrl, options, fetchFn)).not.toBe(null);
    expect(await fetchImageBase64(firstUrl, options, fetchFn)).not.toBe(null);

    expect(requests.get(firstUrl)).toBe(2);
    expect(requests.get(secondUrl)).toBe(1);
  });

  it("does not cache failures", async () => {
    let requests = 0;
    const fetchFn: FetchFn = () => {
      requests += 1;
      return Promise.resolve(
        requests === 1
          ? new Response("", { status: 500 })
          : new Response(tinyPng, { headers: { "Content-Type": "image/png" } })
      );
    };

    expect(await fetchImageBase64("https://example.test/retry-logo.png", {}, fetchFn)).toBeNull();
    expect(await fetchImageBase64("https://example.test/retry-logo.png", {}, fetchFn)).toBe(
      Buffer.from(tinyPng).toString("base64")
    );
    expect(requests).toBe(2);
  });

  it("returns base64 for allowed image content types", async () => {
    const result = await fetchImageBase64(
      "https://example.test/icon.png",
      {},
      responseFetch(
        new Response(tinyPng, {
          status: 200,
          headers: { "Content-Type": "image/png" }
        })
      )
    );

    expect(result).toBe(Buffer.from(tinyPng).toString("base64"));
  });

  it("accepts allowed image content types with parameters", async () => {
    const result = await fetchImageBase64(
      "https://example.test/icon.jpg",
      {},
      responseFetch(
        new Response(tinyPng, {
          status: 200,
          headers: { "Content-Type": "image/jpeg; charset=binary" }
        })
      )
    );

    expect(result).toBe(Buffer.from(tinyPng).toString("base64"));
  });

  it("rejects unsupported content types", async () => {
    const result = await fetchImageBase64(
      "https://example.test/icon.svg",
      {},
      responseFetch(
        new Response("<svg />", {
          status: 200,
          headers: { "Content-Type": "image/svg+xml" }
        })
      )
    );

    expect(result).toBeNull();
  });

  it("rejects oversized images by Content-Length before reading the body", async () => {
    let pulls = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulls += 1;
          controller.enqueue(tinyPng);
        },
        cancel() {
          cancelled = true;
        }
      },
      { highWaterMark: 0 }
    );
    const result = await fetchImageBase64(
      "https://example.test/icon.png",
      { maxImageBytes: 3 },
      responseFetch(
        new Response(body, {
          status: 200,
          headers: { "Content-Type": "image/png", "Content-Length": "4" }
        })
      )
    );

    expect(result).toBeNull();
    await Bun.sleep(0);
    expect(pulls).toBe(0);
    expect(cancelled).toBe(true);
  });

  it("rejects oversized images after reading when Content-Length is absent", async () => {
    let pulls = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(2));
      },
      cancel() {
        cancelled = true;
      }
    });
    const result = await fetchImageBase64(
      "https://example.test/icon.png",
      { maxImageBytes: 3 },
      responseFetch(
        new Response(body, {
          status: 200,
          headers: { "Content-Type": "image/png" }
        })
      )
    );

    expect(result).toBeNull();
    await Bun.sleep(0);
    expect(pulls).toBeLessThan(10);
    expect(cancelled).toBe(true);
  });

  it("enforces the byte limit when Content-Length under-reports the body", async () => {
    let bytesConsumed = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = new Uint8Array(2);
        bytesConsumed += chunk.byteLength;
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      }
    });
    const result = await fetchImageBase64(
      "https://example.test/icon.png",
      { maxImageBytes: 3 },
      responseFetch(
        new Response(body, {
          status: 200,
          headers: { "Content-Type": "image/png", "Content-Length": "1" }
        })
      )
    );

    expect(result).toBeNull();
    await Bun.sleep(0);
    expect(bytesConsumed).toBeLessThan(10);
    expect(cancelled).toBe(true);
  });

  it("ignores an invalid Content-Length and accepts a valid in-limit stream", async () => {
    const result = await fetchImageBase64(
      "https://example.test/icon.png",
      { maxImageBytes: tinyPng.byteLength },
      responseFetch(
        new Response(tinyPng, {
          status: 200,
          headers: { "Content-Type": "image/png", "Content-Length": "4bytes" }
        })
      )
    );

    expect(result).toBe(Buffer.from(tinyPng).toString("base64"));
  });

  it("maps image stream timeouts to null and aborts the request", async () => {
    let requestAborted = false;
    const fetchFn: FetchFn = (_input, init) => {
      let bodyController: ReadableStreamDefaultController<Uint8Array> | undefined;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          bodyController = controller;
          controller.enqueue(new Uint8Array([1]));
        }
      });
      init?.signal?.addEventListener("abort", () => {
        requestAborted = true;
        bodyController?.error(new DOMException("Aborted", "AbortError"));
      });
      return Promise.resolve(
        new Response(body, { status: 200, headers: { "Content-Type": "image/png" } })
      );
    };

    const result = await fetchImageBase64(
      "https://example.test/slow.png",
      { timeoutMs: 5 },
      fetchFn
    );

    expect(result).toBeNull();
    expect(requestAborted).toBe(true);
  });

  it("returns null on image fetch failures", async () => {
    const result = await fetchImageBase64(
      "https://example.test/icon.png",
      {},
      responseFetch(new Response("", { status: 500 }))
    );

    expect(result).toBeNull();
  });
});
