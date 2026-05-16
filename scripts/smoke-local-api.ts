#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { join } from "node:path";

type SmokeKind = "json" | "image";

interface SmokeCase {
  readonly id: string;
  readonly path: string;
  readonly kind: SmokeKind;
  readonly expectedStatus: number;
  readonly expectedContentType?: string;
  readonly optional?: boolean;
}

interface SmokeResult {
  readonly id: string;
  readonly path: string;
  readonly status: "pass" | "fail" | "skip";
  readonly httpStatus?: number;
  readonly bytes?: number;
  readonly artifact?: string;
  readonly detail: string;
}

interface SmokeConfig {
  readonly baseUrl: string;
  readonly outputDir: string;
}

const defaultConfig: SmokeConfig = {
  baseUrl: "http://localhost:3000",
  outputDir: join(import.meta.dir, "..", "output", "smoke-local-api")
};

const smokeCases: readonly SmokeCase[] = [
  {
    id: "health",
    path: "/health",
    kind: "json",
    expectedStatus: 200,
    expectedContentType: "application/json"
  },
  {
    id: "ready",
    path: "/ready",
    kind: "json",
    expectedStatus: 200,
    expectedContentType: "application/json"
  },
  {
    id: "mc-server-hypixel",
    path: "/mc/server?host=mc.hypixel.net",
    kind: "json",
    expectedStatus: 200,
    expectedContentType: "application/json"
  },
  {
    id: "mc-icon-hypixel",
    path: "/mc/icon?host=mc.hypixel.net",
    kind: "image",
    expectedStatus: 200,
    expectedContentType: "image/png",
    optional: true
  },
  {
    id: "server-banner-hypixel-png",
    path: "/banner/server/mc.hypixel.net/25565/banner.png",
    kind: "image",
    expectedStatus: 200,
    expectedContentType: "image/png"
  },
  {
    id: "modrinth-sodium-banner-png",
    path: "/banner/resource/modrinth/sodium/banner.png",
    kind: "image",
    expectedStatus: 200,
    expectedContentType: "image/png"
  },
  {
    id: "spigot-essentialsx-banner-png",
    path: "/banner/resource/spigot/9089/banner.png",
    kind: "image",
    expectedStatus: 200,
    expectedContentType: "image/png"
  }
];

const parseArgs = (argv: readonly string[]): SmokeConfig => {
  let baseUrl = process.env["MCBANNERS_SMOKE_BASE_URL"] ?? defaultConfig.baseUrl;
  let outputDir = process.env["MCBANNERS_SMOKE_OUTPUT_DIR"] ?? defaultConfig.outputDir;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--base-url" && next !== undefined) {
      baseUrl = next;
      index += 1;
      continue;
    }

    if (arg === "--output-dir" && next !== undefined) {
      outputDir = next;
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(`Usage: bun run smoke:local [--base-url URL] [--output-dir DIR]

Defaults:
  --base-url   ${defaultConfig.baseUrl}
  --output-dir ${defaultConfig.outputDir}

Environment overrides:
  MCBANNERS_SMOKE_BASE_URL
  MCBANNERS_SMOKE_OUTPUT_DIR`);
      process.exit(0);
    }

    throw new Error(`Unknown or incomplete argument: ${arg ?? ""}`);
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    outputDir
  };
};

const responseHasContentType = (response: Response, expectedContentType: string): boolean =>
  response.headers.get("content-type")?.toLowerCase().includes(expectedContentType) ?? false;

const artifactName = (testCase: SmokeCase): string => {
  const extension = testCase.expectedContentType === "image/jpeg" ? "jpg" : "png";
  return `${testCase.id}.${extension}`;
};

const runSmokeCase = async (config: SmokeConfig, testCase: SmokeCase): Promise<SmokeResult> => {
  const url = `${config.baseUrl}${testCase.path}`;

  try {
    const response = await fetch(url);
    const expectedContentType = testCase.expectedContentType;

    if (response.status !== testCase.expectedStatus) {
      if (testCase.optional) {
        return {
          id: testCase.id,
          path: testCase.path,
          status: "skip",
          httpStatus: response.status,
          detail: `optional check returned ${String(response.status)}`
        };
      }

      return {
        id: testCase.id,
        path: testCase.path,
        status: "fail",
        httpStatus: response.status,
        detail: `expected HTTP ${String(testCase.expectedStatus)}`
      };
    }

    if (
      expectedContentType !== undefined &&
      !responseHasContentType(response, expectedContentType)
    ) {
      return {
        id: testCase.id,
        path: testCase.path,
        status: "fail",
        httpStatus: response.status,
        detail: `expected content-type containing ${expectedContentType}`
      };
    }

    if (testCase.kind === "json") {
      await response.json();
      return {
        id: testCase.id,
        path: testCase.path,
        status: "pass",
        httpStatus: response.status,
        detail: "JSON response parsed"
      };
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) {
      return {
        id: testCase.id,
        path: testCase.path,
        status: "fail",
        httpStatus: response.status,
        bytes: 0,
        detail: "image response was empty"
      };
    }

    await mkdir(config.outputDir, { recursive: true });
    const artifact = join(config.outputDir, artifactName(testCase));
    await Bun.write(artifact, bytes);

    return {
      id: testCase.id,
      path: testCase.path,
      status: "pass",
      httpStatus: response.status,
      bytes: bytes.byteLength,
      artifact,
      detail: "image downloaded"
    };
  } catch (error) {
    return {
      id: testCase.id,
      path: testCase.path,
      status: "fail",
      detail: error instanceof Error ? error.message : String(error)
    };
  }
};

const pad = (value: string, width: number): string => value.padEnd(width, " ");

const printResults = (results: readonly SmokeResult[]): void => {
  const rows = results.map((result) => ({
    status: result.status.toUpperCase(),
    id: result.id,
    http: result.httpStatus === undefined ? "-" : String(result.httpStatus),
    bytes: result.bytes === undefined ? "-" : String(result.bytes),
    detail: result.detail
  }));

  const widths = {
    status: Math.max("STATUS".length, ...rows.map((row) => row.status.length)),
    id: Math.max("CHECK".length, ...rows.map((row) => row.id.length)),
    http: Math.max("HTTP".length, ...rows.map((row) => row.http.length)),
    bytes: Math.max("BYTES".length, ...rows.map((row) => row.bytes.length))
  };

  console.log(
    `${pad("STATUS", widths.status)}  ${pad("CHECK", widths.id)}  ${pad("HTTP", widths.http)}  ${pad("BYTES", widths.bytes)}  DETAIL`
  );
  console.log(
    `${"-".repeat(widths.status)}  ${"-".repeat(widths.id)}  ${"-".repeat(widths.http)}  ${"-".repeat(widths.bytes)}  ${"-".repeat(32)}`
  );

  for (const row of rows) {
    console.log(
      `${pad(row.status, widths.status)}  ${pad(row.id, widths.id)}  ${pad(row.http, widths.http)}  ${pad(row.bytes, widths.bytes)}  ${row.detail}`
    );
  }
};

const config = parseArgs(process.argv.slice(2));

console.log(`Smoke base URL: ${config.baseUrl}`);
console.log(`Image output: ${config.outputDir}`);
console.log("");

const results = await Promise.all(smokeCases.map((testCase) => runSmokeCase(config, testCase)));
printResults(results);

const failures = results.filter((result) => result.status === "fail");
const artifacts = results.flatMap((result) =>
  result.artifact === undefined ? [] : [result.artifact]
);

if (artifacts.length > 0) {
  console.log("");
  console.log("Artifacts:");
  for (const artifact of artifacts) {
    console.log(`  ${artifact}`);
  }
}

if (failures.length > 0) {
  console.error("");
  console.error(`Smoke failed: ${String(failures.length)} check(s) failed.`);
  process.exit(1);
}

console.log("");
console.log("Smoke passed.");
