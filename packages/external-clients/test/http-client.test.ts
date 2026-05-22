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
    const result = await fetchImageBase64(
      "https://example.test/icon.png",
      { maxImageBytes: 3 },
      responseFetch(
        new Response(tinyPng, {
          status: 200,
          headers: { "Content-Type": "image/png", "Content-Length": "4" }
        })
      )
    );

    expect(result).toBeNull();
  });

  it("rejects oversized images after reading when Content-Length is absent", async () => {
    const result = await fetchImageBase64(
      "https://example.test/icon.png",
      { maxImageBytes: 3 },
      responseFetch(
        new Response(tinyPng, {
          status: 200,
          headers: { "Content-Type": "image/png" }
        })
      )
    );

    expect(result).toBeNull();
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
