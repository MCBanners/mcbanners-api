import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  compareCase,
  compareFixture,
  type FetchLike,
  jsonShape,
  normalizeContentType
} from "../src/compare";
import { parseImageDimensions } from "../src/image";
import { runCli } from "../src/index";
import type { CompatRouteCase } from "../src/types";

const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89
]);

const PNG_1X1_DIFFERENT_BYTES = Uint8Array.from([...PNG_1X1, 0x00, 0x01, 0x02]);

const PNG_2X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00
]);

let outputDir: string;

const silentConsole = {
  log: (...data: unknown[]) => {
    void data;
  },
  error: (...data: unknown[]) => {
    void data;
  }
};

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

  it("passes image cases with matching status, content type, and dimensions even when bytes differ", async () => {
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
        new Response(calls === 1 ? PNG_1X1 : PNG_1X1_DIFFERENT_BYTES, {
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

    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.comparison?.kind).toBe("image");
    if (result.comparison?.kind === "image") {
      expect(result.comparison.byteSizeEqual).toBe(false);
      expect(result.comparison.legacy.sha256).not.toBe(result.comparison.candidate.sha256);
      expect(result.comparison.dimensionsEqual).toBe(true);
    }
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
        new Response(calls === 1 ? PNG_1X1 : PNG_2X1, {
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

  it("fails image cases when content types differ", async () => {
    const routeCase: CompatRouteCase = {
      id: "image-content-type",
      enabled: true,
      type: "image",
      method: "GET",
      path: "/banner/server/example.org/25565/banner.png"
    };
    let calls = 0;
    const fetchImpl: FetchLike = () => {
      calls += 1;
      return Promise.resolve(
        new Response(PNG_1X1, {
          status: 200,
          headers: { "Content-Type": calls === 1 ? "image/png" : "image/jpeg" }
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
    expect(result.failures.some((failure) => failure.startsWith("content-type mismatch"))).toBe(
      true
    );
  });

  it("fails image cases when status codes differ", async () => {
    const routeCase: CompatRouteCase = {
      id: "image-status",
      enabled: true,
      type: "image",
      method: "GET",
      path: "/banner/server/example.org/25565/banner.png"
    };
    let calls = 0;
    const fetchImpl: FetchLike = () => {
      calls += 1;
      return Promise.resolve(
        new Response(PNG_1X1, {
          status: calls === 1 ? 200 : 404,
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
    expect(result.failures.some((failure) => failure.startsWith("status mismatch"))).toBe(true);
  });

  it("treats disabled cases as skipped neutral results", async () => {
    const summary = await compareFixture(
      {
        name: "skip-fixture",
        cases: [
          {
            id: "disabled",
            enabled: false,
            disabledReason: "manual-only fixture",
            type: "image",
            method: "GET",
            path: "/banner/saved/abcdefghijklmn.png"
          }
        ]
      },
      "http://legacy.test",
      "http://candidate.test",
      outputDir,
      () => {
        throw new Error("disabled case should not fetch");
      }
    );

    expect(summary.totals).toMatchObject({ enabled: 0, skipped: 1, passed: 0, failed: 0 });
    expect(summary.cases[0]?.skipped).toBe(true);
    expect(summary.cases[0]?.passed).toBe(true);
    expect(summary.cases[0]?.failures).toEqual([]);
    expect(summary.cases[0]?.skipReason).toBe("manual-only fixture");
  });

  it("returns CLI exit 0 for mixed pass and skip results", async () => {
    const fixturePath = join(outputDir, "fixture.json");
    await writeFile(
      fixturePath,
      JSON.stringify({
        name: "mixed-pass-skip",
        cases: [
          {
            id: "passing-image",
            enabled: true,
            type: "image",
            method: "GET",
            path: "/banner/server/example.org/25565/banner.png"
          },
          {
            id: "disabled-image",
            enabled: false,
            disabledReason: "manual-only fixture",
            type: "image",
            method: "GET",
            path: "/banner/saved/abcdefghijklmn.png"
          }
        ]
      })
    );

    const exitCode = await runCli(
      [
        "--legacy-base-url",
        "http://legacy.test",
        "--candidate-base-url",
        "http://candidate.test",
        "--fixture",
        fixturePath,
        "--output-dir",
        join(outputDir, "reports")
      ],
      () =>
        Promise.resolve(
          new Response(PNG_1X1, { status: 200, headers: { "Content-Type": "image/png" } })
        ),
      silentConsole
    );

    expect(exitCode).toBe(0);
  });

  it("returns CLI exit 1 when an enabled case fails", async () => {
    const fixturePath = join(outputDir, "fixture.json");
    await writeFile(
      fixturePath,
      JSON.stringify({
        name: "enabled-failure",
        cases: [
          {
            id: "failing-image",
            enabled: true,
            type: "image",
            method: "GET",
            path: "/banner/server/example.org/25565/banner.png"
          }
        ]
      })
    );

    let calls = 0;
    const exitCode = await runCli(
      [
        "--legacy-base-url",
        "http://legacy.test",
        "--candidate-base-url",
        "http://candidate.test",
        "--fixture",
        fixturePath,
        "--output-dir",
        join(outputDir, "reports")
      ],
      () => {
        calls += 1;
        return Promise.resolve(
          new Response(calls === 1 ? PNG_1X1 : PNG_2X1, {
            status: 200,
            headers: { "Content-Type": "image/png" }
          })
        );
      },
      silentConsole
    );

    expect(exitCode).toBe(1);
  });

  describe("expectedLegacyFailure behavior", () => {
    const knownLegacyCase = {
      id: "known-legacy-failure",
      enabled: true,
      type: "image" as const,
      method: "GET" as const,
      path: "/mc/server?host=mc.hypixel.net",
      expectedLegacyFailure: { reason: "Legacy returns 400" }
    };

    it("legacy fails + candidate passes => candidate_improvement, exit 0", async () => {
      let calls = 0;
      const result = await compareCase(
        knownLegacyCase,
        "http://legacy.test",
        "http://candidate.test",
        outputDir,
        () => {
          calls += 1;
          return Promise.resolve(
            new Response(PNG_1X1, {
              status: calls === 1 ? 400 : 200,
              headers: { "Content-Type": "image/png" }
            })
          );
        }
      );

      expect(result.passed).toBe(true);
      expect(result.knownLegacyFailureOutcome).toBe("candidate_improvement");
    });

    it("legacy fails + candidate fails + expectedLegacyFailure => both_failing, exit 1", async () => {
      const result = await compareCase(
        knownLegacyCase,
        "http://legacy.test",
        "http://candidate.test",
        outputDir,
        () =>
          Promise.resolve(
            new Response(PNG_1X1, {
              status: 400,
              headers: { "Content-Type": "image/png" }
            })
          )
      );

      expect(result.passed).toBe(false);
      expect(result.knownLegacyFailureOutcome).toBe("both_failing");
    });

    it("legacy passes + candidate passes + expectedLegacyFailure => legacy_unexpectedly_passed, exit 0 with warn", async () => {
      const result = await compareCase(
        knownLegacyCase,
        "http://legacy.test",
        "http://candidate.test",
        outputDir,
        () =>
          Promise.resolve(
            new Response(PNG_1X1, {
              status: 200,
              headers: { "Content-Type": "image/png" }
            })
          )
      );

      expect(result.passed).toBe(true);
      expect(result.knownLegacyFailureOutcome).toBe("legacy_unexpectedly_passed");
    });

    it("legacy passes + candidate fails + expectedLegacyFailure => regression, exit 1", async () => {
      let calls = 0;
      const result = await compareCase(
        knownLegacyCase,
        "http://legacy.test",
        "http://candidate.test",
        outputDir,
        () => {
          calls += 1;
          return Promise.resolve(
            new Response(PNG_1X1, {
              status: calls === 1 ? 200 : 500,
              headers: { "Content-Type": "image/png" }
            })
          );
        }
      );

      expect(result.passed).toBe(false);
      expect(result.knownLegacyFailureOutcome).toBe("regression");
    });

    it("candidateImprovements totals count candidate_improvement outcomes", async () => {
      const summary = await compareFixture(
        {
          name: "improvements-fixture",
          cases: [knownLegacyCase]
        },
        "http://legacy.test",
        "http://candidate.test",
        outputDir,
        (() => {
          let calls = 0;
          return () => {
            calls += 1;
            return Promise.resolve(
              new Response(PNG_1X1, {
                status: calls === 1 ? 400 : 200,
                headers: { "Content-Type": "image/png" }
              })
            );
          };
        })()
      );

      expect(summary.totals.candidateImprovements).toBe(1);
      expect(summary.totals.passed).toBe(1);
      expect(summary.totals.failed).toBe(0);
    });
  });
});
