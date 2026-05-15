import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { compareCase, jsonShape, normalizeContentType, type FetchLike } from "../src/compare";
import { parseImageDimensions } from "../src/image";
import type { CompatRouteCase } from "../src/types";

const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89
]);

let outputDir: string;

beforeEach(async () => {
  outputDir = await mkdtemp(join(tmpdir(), "mcbanners-compat-"));
});

afterEach(async () => {
  await rm(outputDir, { recursive: true, force: true });
});

describe("compat comparison helpers", () => {
  it("normalizes content type parameters", () => {
    expect(normalizeContentType("application/json; charset=utf-8")).toBe("application/json");
  });

  it("builds stable JSON body shape", () => {
    expect(jsonShape({ b: 1, a: [{ id: "x", ok: true }] })).toEqual({
      a: [{ id: "string", ok: "boolean" }],
      b: "number"
    });
  });

  it("reads PNG dimensions without image dependencies", () => {
    expect(parseImageDimensions(PNG_1X1)).toEqual({ width: 1, height: 1 });
  });

  it("passes JSON cases with matching status, content type, and body shape", async () => {
    const routeCase: CompatRouteCase = {
      id: "json",
      enabled: true,
      type: "json",
      method: "GET",
      path: "/mc/server?host=example.org"
    };
    const fetchImpl: FetchLike = () =>
      Promise.resolve(
        new Response(JSON.stringify({ host: "example.org", players: { online: 1 } }), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        })
      );

    const result = await compareCase(
      routeCase,
      "http://legacy.test",
      "http://candidate.test",
      outputDir,
      fetchImpl
    );

    expect(result.passed).toBe(true);
    expect(result.comparison?.kind).toBe("json");
    expect(result.artifacts.legacy).toBe("artifacts/json/legacy.json");
    expect(result.artifacts.candidate).toBe("artifacts/json/candidate.json");
  });

  it("fails image cases when dimensions differ or cannot be read", async () => {
    const routeCase: CompatRouteCase = {
      id: "image",
      enabled: true,
      type: "image",
      method: "GET",
      path: "/banner/server/example.org/25565/banner.png"
    };
    let calls = 0;
    const fetchImpl: FetchLike = () => {
      calls += 1;
      return Promise.resolve(
        new Response(calls === 1 ? PNG_1X1 : new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "image/png" }
        })
      );
    };

    const result = await compareCase(
      routeCase,
      "http://legacy.test",
      "http://candidate.test",
      outputDir,
      fetchImpl
    );

    expect(result.passed).toBe(false);
    expect(result.failures).toContain("image dimensions mismatch or unavailable");
  });
});
