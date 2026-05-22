#!/usr/bin/env bun
/**
 * validate-saved-banner-corpus.ts
 *
 * Validates every row in the saved_banner table against the Bun candidate
 * saved-banner recall endpoint.  Use this after importing production data into
 * a staging database to measure compatibility coverage before cutover.
 *
 * Usage:
 *   bun run saved:validate-corpus -- \
 *     --base-url http://localhost:3000 \
 *     --database-url mysql://<user>:<password>@<host>:3306/mcbanners_staging \
 *     --output-dir output/saved-banner-corpus \
 *     [--type MINECRAFT_SERVER] \
 *     [--type SPIGOT_RESOURCE] \
 *     [--limit 500] \
 *     [--concurrency 5] \
 *     [--save-failed-responses] \
 *     [--allow-production-db]
 *
 * Safety:
 *   The script refuses to connect unless the database name contains
 *   "staging", "test", or "dev".  Pass --allow-production-db to override.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { readSavedBannerCorpusRows, type SavedBannerRow } from "@mcbanners/db";
import { decodeBannerTypeOrdinal } from "@mcbanners/domain";

import {
  aggregateSummary,
  type BannerType,
  buildMetadataPreview,
  type CorpusClassification,
  type CorpusResult,
  type CorpusSummary,
  classifyHttpStatus,
  classifyPreFlight,
  guardDbSafety,
  parseBannerTypeFilter,
  parseClassificationFilter,
  parseConcurrency,
  type RawRow,
  redactDbUrl,
  runConcurrentQueue,
  truncateStr
} from "./corpus-helpers";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_OUTPUT_DIR = join(import.meta.dir, "..", "output", "saved-banner-corpus");
const DEFAULT_CONCURRENCY = 5;

interface CliOptions {
  readonly baseUrl: string;
  readonly databaseUrl: string;
  readonly outputDir: string;
  readonly limit: number | null;
  readonly concurrency: number;
  readonly typeFilters: readonly BannerType[];
  readonly classificationFilters: readonly CorpusClassification[];
  readonly saveFailedResponses: boolean;
  readonly skipDeadUpstream: boolean;
  readonly allowProductionDb: boolean;
}

const HELP_TEXT = `validate-saved-banner-corpus -- MCBanners saved-banner compatibility validator

Usage:
  bun run saved:validate-corpus -- [options]

Options:
  --base-url <url>              Bun API base URL (default: ${DEFAULT_BASE_URL})
  --database-url <url>          MySQL/MariaDB connection URL (required)
  --output-dir <path>           Output directory for reports
                                (default: output/saved-banner-corpus)
  --type <BannerType>           Only process rows of this banner type (repeatable)
                                e.g. --type MINECRAFT_SERVER --type SPIGOT_RESOURCE
  --classification <cls>        Only include this classification in aggregate results
                                (repeatable). Skips API calls when all filters are
                                pre-flight types (INVALID_JSON, MISSING_METADATA).
                                e.g. --classification INVALID_JSON
  --limit <n>                   Process at most N rows (before type filter)
  --concurrency <n>             Parallel API calls (default: ${DEFAULT_CONCURRENCY})
  --save-failed-responses       Write non-200 response bodies and pre-flight artifacts
                                to output-dir/failed-responses/
  --skip-known-dead-upstream    Exclude dead-upstream 404s from the failure exit code
                                (still recorded). Treated as dead upstream:
                                RENDER_404_SERVER_OFFLINE, RENDER_404_DNS_FAILURE,
                                RENDER_404_CONNECTION_FAILURE,
                                RENDER_404_UPSTREAM_NOT_FOUND, RENDER_404_RESOURCE_REMOVED
  --allow-production-db         Skip the DB name safety guard
  --help                        Show this help text

Safety:
  By default the script refuses to connect unless the database name contains
  "staging", "test", or "dev". Pass --allow-production-db to override.

Output:
  <output-dir>/summary.json  -- machine-readable results
  <output-dir>/summary.md    -- human-readable markdown report

Exit code:
  0  all rows passed or were skipped
     (or: actualCompatibilityFailures = 0 when --skip-known-dead-upstream)
  1  at least one failure
`;
const readArg = (argv: readonly string[], name: string): string | undefined => {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  const next = argv[idx + 1];
  if (next === undefined || next.startsWith("--")) {
    throw new Error(`missing value for ${name}`);
  }
  return next;
};

const readAllArgs = (argv: readonly string[], name: string): readonly string[] => {
  const values: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        throw new Error(`missing value for ${name}`);
      }
      values.push(next);
      i += 1;
    }
  }
  return values;
};

const requireArg = (argv: readonly string[], name: string): string => {
  const value = readArg(argv, name);
  if (value === undefined) throw new Error(`missing required option: ${name}`);
  return value;
};

const parseArgs = (argv: readonly string[]): CliOptions | "help" => {
  if (argv.includes("--help") || argv.includes("-h")) return "help";

  const limitRaw = readArg(argv, "--limit");
  const concurrencyRaw = readArg(argv, "--concurrency");
  const typeRaws = readAllArgs(argv, "--type");
  const classificationRaws = readAllArgs(argv, "--classification");

  const typeFilters: BannerType[] = [];
  for (const raw of typeRaws) {
    const t = parseBannerTypeFilter(raw);
    if (t === null) throw new Error(`unknown --type value: ${raw}`);
    typeFilters.push(t);
  }

  const classificationFilters: CorpusClassification[] = [];
  for (const raw of classificationRaws) {
    const c = parseClassificationFilter(raw);
    if (c === null) throw new Error(`unknown --classification value: ${raw}`);
    classificationFilters.push(c);
  }

  return {
    baseUrl: (readArg(argv, "--base-url") ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
    databaseUrl: requireArg(argv, "--database-url"),
    outputDir: readArg(argv, "--output-dir") ?? DEFAULT_OUTPUT_DIR,
    limit: limitRaw !== undefined ? Number.parseInt(limitRaw, 10) : null,
    concurrency: parseConcurrency(concurrencyRaw, DEFAULT_CONCURRENCY),
    typeFilters,
    classificationFilters,
    saveFailedResponses: argv.includes("--save-failed-responses"),
    skipDeadUpstream: argv.includes("--skip-known-dead-upstream"),
    allowProductionDb: argv.includes("--allow-production-db")
  };
};

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

interface BannerResponse {
  readonly httpStatus: number;
  readonly contentType: string | null;
  readonly bodyBytes: Uint8Array;
}

const fetchBannerResponse = async (baseUrl: string, mnemonic: string): Promise<BannerResponse> => {
  const response = await fetch(`${baseUrl}/banner/saved/${mnemonic}.png`);
  const bodyBytes = new Uint8Array(await response.arrayBuffer());
  return {
    httpStatus: response.status,
    contentType: response.headers.get("content-type"),
    bodyBytes
  };
};

const isImageContentType = (ct: string | null): boolean => ct?.startsWith("image/") ?? false;

const extractBodyPreview = (
  contentType: string | null,
  bytes: Uint8Array,
  maxLen = 300
): string | undefined => {
  if (isImageContentType(contentType)) return undefined;
  const text = new TextDecoder().decode(bytes.slice(0, maxLen * 4));
  const trimmed = text.trim();
  return trimmed === "" ? undefined : truncateStr(trimmed, maxLen);
};

// ---------------------------------------------------------------------------
// Row processing
// ---------------------------------------------------------------------------

// Pre-flight classification types that don't require an API call
const PREFLIGHT_ONLY_CLASSIFICATIONS: ReadonlySet<CorpusClassification> = new Set([
  "INVALID_JSON",
  "MISSING_METADATA",
  "INVALID_ORDINAL",
  "UNSUPPORTED_DISCORD"
]);

const savePreFlightArtifact = async (
  saveDir: string,
  row: SavedBannerRow,
  classification: CorpusClassification,
  extra: Record<string, unknown>
): Promise<void> => {
  const artifact = {
    id: row.id,
    mnemonic: row.mnemonic,
    classification,
    rawMetadata: row.metadata,
    rawSettings: row.settings,
    ...extra
  };
  const path = join(saveDir, `${row.mnemonic}_${classification}_preflight.json`);
  await writeFile(path, JSON.stringify(artifact, null, 2)).catch(() => undefined);
};

const processRow = async (
  baseUrl: string,
  row: SavedBannerRow,
  saveDir: string | null,
  skipApiCall: boolean
): Promise<CorpusResult | null> => {
  const rawRow: RawRow = {
    id: row.id,
    type: row.type,
    mnemonic: row.mnemonic,
    metadata: row.metadata,
    settings: row.settings
  };

  const preFlight = classifyPreFlight(rawRow);

  if (preFlight.status !== "OK") {
    if (saveDir !== null) {
      const extra: Record<string, unknown> = { reason: preFlight.reason };
      if (preFlight.status === "MISSING_METADATA" && preFlight.bannerType !== null) {
        extra["actualMetadataKeys"] = Object.keys(
          (() => {
            try {
              const p: unknown = JSON.parse(row.metadata);
              return p !== null && typeof p === "object" && !Array.isArray(p) ? p : {};
            } catch {
              return {};
            }
          })()
        );
      }
      await savePreFlightArtifact(saveDir, row, preFlight.status, extra);
    }
    return {
      id: row.id,
      mnemonic: row.mnemonic,
      typeOrdinal: row.type,
      bannerType: preFlight.bannerType,
      classification: preFlight.status,
      reason: preFlight.reason
    };
  }

  // If only pre-flight classifications are filtered, skip API calls for passing rows
  if (skipApiCall) return null;

  const metadata = preFlight.metadata!;
  const settings = preFlight.settings ?? {};
  const metadataKeys = Object.keys(metadata);
  const settingsKeys = Object.keys(settings);
  const metadataPreview = buildMetadataPreview(metadata);
  const recallUrl = `${baseUrl}/banner/saved/${row.mnemonic}.png`;

  try {
    const { httpStatus, contentType, bodyBytes } = await fetchBannerResponse(baseUrl, row.mnemonic);

    const responseBodyPreview = extractBodyPreview(contentType, bodyBytes);
    const classification = classifyHttpStatus(
      httpStatus,
      responseBodyPreview ?? null,
      preFlight.bannerType
    );

    if (saveDir !== null && httpStatus !== 200) {
      const bodyText = responseBodyPreview ?? "";
      const looksLikeJson =
        bodyText.trimStart().startsWith("{") || bodyText.trimStart().startsWith("[");
      const ext =
        contentType?.includes("json") || looksLikeJson
          ? "json"
          : bodyText.length > 0
            ? "txt"
            : "bin";
      const outPath = join(saveDir, `${row.mnemonic}_${httpStatus}.${ext}`);
      await writeFile(outPath, bodyBytes).catch(() => undefined);
    }

    return {
      id: row.id,
      mnemonic: row.mnemonic,
      typeOrdinal: row.type,
      bannerType: preFlight.bannerType,
      classification,
      httpStatus,
      contentType,
      byteSize: bodyBytes.byteLength,
      metadataKeys,
      metadataPreview,
      settingsKeys,
      recallUrl,
      ...(responseBodyPreview !== undefined ? { responseBodyPreview } : {})
    };
  } catch (e) {
    return {
      id: row.id,
      mnemonic: row.mnemonic,
      typeOrdinal: row.type,
      bannerType: preFlight.bannerType,
      classification: "OTHER_FAILURE",
      reason: e instanceof Error ? e.message : String(e),
      metadataKeys,
      metadataPreview,
      settingsKeys,
      recallUrl
    };
  }
};

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

const pad = (value: string, width: number): string => value.padEnd(width, " ");

const formatGroupsSection = (label: string, groups: Record<string, number>): string[] => {
  const lines: string[] = [];
  const entries = Object.entries(groups).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) return lines;
  lines.push(`### ${label}`);
  lines.push("");
  lines.push("| Key | Count |");
  lines.push("|-----|-------|");
  for (const [key, count] of entries) {
    lines.push(`| \`${key}\` | ${count} |`);
  }
  lines.push("");
  return lines;
};

const formatSummaryMarkdown = (
  summary: CorpusSummary,
  baseUrl: string,
  typeFilters: readonly BannerType[],
  classificationFilters: readonly CorpusClassification[],
  skipDeadUpstream: boolean
): string => {
  const lines: string[] = [];

  lines.push("# Saved Banner Corpus Validation Report");
  lines.push("");
  lines.push(`**Base URL:** ${baseUrl}`);
  if (typeFilters.length > 0) {
    lines.push(`**Type filter:** ${typeFilters.join(", ")}`);
  }
  if (classificationFilters.length > 0) {
    lines.push(`**Classification filter:** ${classificationFilters.join(", ")}`);
  }
  lines.push(`**Total rows processed:** ${summary.totalRows}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push("| Outcome | Count |");
  lines.push("|---------|-------|");
  lines.push(`| PASS (rendered) | ${summary.passCount} |`);
  lines.push(`| SKIP (unsupported / invalid ordinal) | ${summary.skipCount} |`);
  lines.push(`| FAIL | ${summary.failCount} |`);
  if (summary.deadUpstreamCount > 0) {
    lines.push(`| Dead upstream (historical) | ${summary.deadUpstreamCount} |`);
    lines.push(`| Actual compatibility failures | ${summary.actualCompatibilityFailures} |`);
    if (skipDeadUpstream) {
      lines.push("");
      lines.push(
        `> **--skip-known-dead-upstream**: exit code based on ${summary.actualCompatibilityFailures} actual compatibility failure(s).`
      );
    }
  }
  lines.push("");

  lines.push("## By Classification");
  lines.push("");
  lines.push("| Classification | Count |");
  lines.push("|----------------|-------|");
  for (const [cls, count] of Object.entries(summary.byClassification)) {
    lines.push(`| ${cls} | ${count} |`);
  }
  lines.push("");

  lines.push("## By Banner Type");
  lines.push("");
  lines.push("| Banner Type | Count |");
  lines.push("|-------------|-------|");
  for (const [type, count] of Object.entries(summary.byBannerType)) {
    lines.push(`| ${type} | ${count} |`);
  }
  lines.push("");

  lines.push("## Failure Groups");
  lines.push("");
  lines.push(
    ...formatGroupsSection(
      "By Banner Type + Classification",
      summary.failureGroups.byBannerTypeAndClassification
    )
  );
  lines.push(
    ...formatGroupsSection(
      "By Banner Type + Metadata Key Set",
      summary.failureGroups.byBannerTypeAndMetadataKeySet
    )
  );
  lines.push(...formatGroupsSection("By HTTP Status", summary.failureGroups.byHttpStatus));
  lines.push(
    ...formatGroupsSection("By Response Body Message", summary.failureGroups.byResponseBodyMessage)
  );

  lines.push("## Privacy");
  lines.push("");
  lines.push(
    "This report is aggregate-only. It does not include saved-banner row IDs, mnemonics, metadata previews, or recall URLs."
  );
  lines.push("");

  return lines.join("\n");
};

const printSummaryTable = (summary: CorpusSummary): void => {
  const rows = [
    { classification: "PASS_RENDERED", count: summary.passCount },
    { classification: "SKIP (total)", count: summary.skipCount },
    { classification: "FAIL (total)", count: summary.failCount }
  ];

  const colWidth = Math.max(...rows.map((r) => r.classification.length), "CLASSIFICATION".length);
  console.log(`${pad("CLASSIFICATION", colWidth)}  COUNT`);
  console.log(`${"-".repeat(colWidth)}  -----`);
  for (const row of rows) {
    console.log(`${pad(row.classification, colWidth)}  ${row.count}`);
  }

  if (summary.failCount > 0) {
    console.log("");
    console.log("Top failure groups:");
    const topGroups = Object.entries(summary.failureGroups.byBannerTypeAndClassification)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    for (const [key, count] of topGroups) {
      console.log(`  ${count}  ${key}`);
    }
    if (summary.deadUpstreamCount > 0) {
      console.log("");
      console.log(`  Dead upstream (historical): ${summary.deadUpstreamCount}`);
      console.log(`  Actual compatibility failures: ${summary.actualCompatibilityFailures}`);
    }
  }
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const parsedArgs = parseArgs(process.argv.slice(2));

if (parsedArgs === "help") {
  console.log(HELP_TEXT);
  process.exit(0);
}

const {
  baseUrl,
  databaseUrl,
  outputDir,
  limit,
  concurrency,
  typeFilters,
  classificationFilters,
  saveFailedResponses,
  skipDeadUpstream,
  allowProductionDb
} = parsedArgs;

// If all requested classification filters are pre-flight types, skip API calls entirely
const preFlightOnlyFilters =
  classificationFilters.length > 0 &&
  classificationFilters.every((c) => PREFLIGHT_ONLY_CLASSIFICATIONS.has(c));

console.log(`Base URL:    ${baseUrl}`);
console.log(`Database:    ${redactDbUrl(databaseUrl)}`);
console.log(`Output dir:  ${outputDir}`);
if (typeFilters.length > 0) console.log(`Type filter: ${typeFilters.join(", ")}`);
if (classificationFilters.length > 0)
  console.log(`Class filter: ${classificationFilters.join(", ")}`);
if (limit !== null) console.log(`Limit:       ${limit}`);
console.log(`Concurrency: ${concurrency}`);
if (skipDeadUpstream) console.log(`Skip dead upstream: enabled`);
if (preFlightOnlyFilters) console.log(`Pre-flight only: skipping API calls`);
console.log("");

try {
  guardDbSafety(databaseUrl, allowProductionDb);
} catch (e) {
  console.error(`Safety guard failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

console.log("Fetching rows from database...");
let dbRows: readonly SavedBannerRow[];
try {
  dbRows = await readSavedBannerCorpusRows(databaseUrl, limit);
} catch (e) {
  console.error(`Database query failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}

// Apply type filter at application level
const filteredRows =
  typeFilters.length === 0
    ? dbRows
    : dbRows.filter((row) => {
        const t = decodeBannerTypeOrdinal(row.type);
        return t !== undefined && (typeFilters as readonly string[]).includes(t);
      });

console.log(
  `Fetched ${dbRows.length} rows${typeFilters.length > 0 ? `, ${filteredRows.length} after type filter` : ""}. Processing with concurrency ${concurrency}...`
);
console.log("");

await mkdir(outputDir, { recursive: true });
const saveDir = saveFailedResponses ? join(outputDir, "failed-responses") : null;
if (saveDir !== null) {
  await mkdir(saveDir, { recursive: true });
  console.log(`Saving failed responses to: ${saveDir}`);
}

const startTimeMs = Date.now();
let processedCount = 0;
let passCount = 0;
let failCount = 0;
let skipCount = 0;

const rawResults = await runConcurrentQueue(
  filteredRows as SavedBannerRow[],
  concurrency,
  (row) => processRow(baseUrl, row, saveDir, preFlightOnlyFilters),
  (_index, result) => {
    processedCount++;
    if (result === null) {
      // Skipped due to skipApiCall
      skipCount++;
    } else {
      const c = result.classification;
      if (c === "PASS_RENDERED") passCount++;
      else if (c === "UNSUPPORTED_DISCORD" || c === "INVALID_ORDINAL") skipCount++;
      else failCount++;
    }

    const now = processedCount;
    const total = filteredRows.length;
    if (now % 100 === 0 || now === total) {
      const elapsed = (Date.now() - startTimeMs) / 1000;
      const rate = elapsed > 0 ? now / elapsed : 0;
      const remaining = total - now;
      const eta = rate > 0 ? Math.ceil(remaining / rate) : 0;
      process.stdout.write(
        `\r  ${now}/${total}  pass=${passCount} fail=${failCount} skip=${skipCount}  ${rate.toFixed(1)} rows/s  ETA ${eta}s    `
      );
    }
  }
);

process.stdout.write("\n");

// Filter out null (api-skipped) results; for pre-flight-only runs those passing preflight are null
const results = rawResults.filter((r): r is CorpusResult => r !== null);

console.log(`\nAll ${filteredRows.length} rows processed (${results.length} with results).`);
console.log("");

// Apply classification filter to sampled failures
const filteredResults =
  classificationFilters.length > 0
    ? results.filter((r) => (classificationFilters as string[]).includes(r.classification))
    : results;

const summary = aggregateSummary(filteredResults, 0);
printSummaryTable(summary);
console.log("");

const summaryJsonPath = join(outputDir, "summary.json");
await writeFile(
  summaryJsonPath,
  JSON.stringify(
    {
      meta: {
        baseUrl,
        rowCount: filteredRows.length,
        typeFilters: typeFilters.length > 0 ? typeFilters : undefined,
        classificationFilters: classificationFilters.length > 0 ? classificationFilters : undefined,
        skipDeadUpstream
      },
      ...summary
    },
    null,
    2
  )
);

const summaryMdPath = join(outputDir, "summary.md");
await writeFile(
  summaryMdPath,
  formatSummaryMarkdown(summary, baseUrl, typeFilters, classificationFilters, skipDeadUpstream)
);

console.log(`Reports written to: ${outputDir}`);
console.log(`  ${summaryJsonPath}`);
console.log(`  ${summaryMdPath}`);

const exitFailures = skipDeadUpstream ? summary.actualCompatibilityFailures : summary.failCount;

if (exitFailures > 0) {
  const label = skipDeadUpstream ? "actual compatibility failure(s)" : "failure(s)";
  console.error(`\n${exitFailures} ${label}. See failureGroups in summary.json.`);
  process.exit(1);
}

console.log("\nAll rows passed or skipped.");
