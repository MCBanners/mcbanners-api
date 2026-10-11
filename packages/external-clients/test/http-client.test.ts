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
