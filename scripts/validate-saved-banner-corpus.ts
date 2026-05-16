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
 *     --database-url mysql://root:root@127.0.0.1:3307/mcbanners_staging \
 *     --output-dir output/saved-banner-corpus \
 *     [--type MINECRAFT_SERVER] \
 *     [--type SPIGOT_RESOURCE] \
 *     [--limit 500] \
 *     [--concurrency 5] \
 *     [--sample-failures 100] \
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
  classifyPreFlight,
  classifyHttpStatus,
  guardDbSafety,
  redactDbUrl,
  aggregateSummary,
  buildMetadataPreview,
  parseBannerTypeFilter,
  parseConcurrency,
  truncateStr,
  type BannerType,
  type RawRow,
  type CorpusResult,
  type CorpusSummary
} from "./corpus-helpers";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_OUTPUT_DIR = join(import.meta.dir, "..", "output", "saved-banner-corpus");
const DEFAULT_SAMPLE_FAILURES = 100;
const DEFAULT_CONCURRENCY = 5;

interface CliOptions {
  readonly baseUrl: string;
  readonly databaseUrl: string;
  readonly outputDir: string;
  readonly limit: number | null;
  readonly sampleFailures: number;
  readonly concurrency: number;
  readonly typeFilters: readonly BannerType[];
  readonly saveFailedResponses: boolean;
  readonly allowProductionDb: boolean;
}

const HELP_TEXT = `validate-saved-banner-corpus � MCBanners saved-banner compatibility validator

Usage:
  bun run saved:validate-corpus -- [options]

Options:
  --base-url <url>          Bun API base URL (default: ${DEFAULT_BASE_URL})
  --database-url <url>      MySQL/MariaDB connection URL (required)
  --output-dir <path>       Output directory for reports
                            (default: output/saved-banner-corpus)
  --type <BannerType>       Only process rows of this banner type (repeatable)
                            e.g. --type MINECRAFT_SERVER --type SPIGOT_RESOURCE
  --limit <n>               Process at most N rows (before type filter)
  --concurrency <n>         Parallel API calls (default: ${DEFAULT_CONCURRENCY})
  --sample-failures <n>     Include up to N failures in the report
                            (default: ${DEFAULT_SAMPLE_FAILURES})
  --save-failed-responses   Write non-200 response bodies to output-dir/failed-responses/
  --allow-production-db     Skip the DB name safety guard
  --help                    Show this help text

Safety:
  By default the script refuses to connect unless the database name contains
  "staging", "test", or "dev". Pass --allow-production-db to override.

Output:
  <output-dir>/summary.json  � machine-readable results
  <output-dir>/summary.md    � human-readable markdown report

Exit code:
  0  all rows passed or were skipped (UNSUPPORTED_DISCORD / INVALID_ORDINAL)
  1  at least one row was classified as a failure
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
  const sampleRaw = readArg(argv, "--sample-failures");
  const concurrencyRaw = readArg(argv, "--concurrency");
  const typeRaws = readAllArgs(argv, "--type");

  const typeFilters: BannerType[] = [];
  for (const raw of typeRaws) {
    const t = parseBannerTypeFilter(raw);
    if (t === null) throw new Error(`unknown --type value: ${raw}`);
    typeFilters.push(t);
  }

  return {
    baseUrl: (readArg(argv, "--base-url") ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
    databaseUrl: requireArg(argv, "--database-url"),
    outputDir: readArg(argv, "--output-dir") ?? DEFAULT_OUTPUT_DIR,
    limit: limitRaw !== undefined ? Number.parseInt(limitRaw, 10) : null,
    sampleFailures:
      sampleRaw !== undefined ? Number.parseInt(sampleRaw, 10) : DEFAULT_SAMPLE_FAILURES,
    concurrency: parseConcurrency(concurrencyRaw, DEFAULT_CONCURRENCY),
    typeFilters,
    saveFailedResponses: argv.includes("--save-failed-responses"),
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

const fetchBannerResponse = async (
  baseUrl: string,
  mnemonic: string
): Promise<BannerResponse> => {
  const response = await fetch(`${baseUrl}/banner/saved/${mnemonic}.png`);
  const bodyBytes = new Uint8Array(await response.arrayBuffer());
  return {
    httpStatus: response.status,
    contentType: response.headers.get("content-type"),
    bodyBytes
  };
};

const isImageContentType = (ct: string | null): boolean =>
  ct !== null && ct.startsWith("image/");

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

const processRow = async (
  baseUrl: string,
  row: SavedBannerRow,
  saveDir: string | null
): Promise<CorpusResult> => {
  const rawRow: RawRow = {
    id: row.id,
    type: row.type,
    mnemonic: row.mnemonic,
    metadata: row.metadata,
    settings: row.settings
  };

  const preFlight = classifyPreFlight(rawRow);

  if (preFlight.status !== "OK") {
    return {
      id: row.id,
      mnemonic: row.mnemonic,
      typeOrdinal: row.type,
      bannerType: preFlight.bannerType,
      classification: preFlight.status,
      reason: preFlight.reason
    };
  }

  const metadata = preFlight.metadata!;
  const settings = preFlight.settings ?? {};
  const metadataKeys = Object.keys(metadata);
  const settingsKeys = Object.keys(settings);
  const metadataPreview = buildMetadataPreview(metadata);
  const recallUrl = `${baseUrl}/banner/saved/${row.mnemonic}.png`;

  try {
    const { httpStatus, contentType, bodyBytes } = await fetchBannerResponse(
      baseUrl,
      row.mnemonic
    );

    const responseBodyPreview = extractBodyPreview(contentType, bodyBytes);
    const classification = classifyHttpStatus(httpStatus, responseBodyPreview ?? null);

    if (saveDir !== null && httpStatus !== 200) {
      const ext =
        contentType?.includes("json") ? "json" : contentType?.includes("text") ? "txt" : "bin";
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
// Concurrency runner
// ---------------------------------------------------------------------------

const runConcurrent = async (
  rows: readonly SavedBannerRow[],
  concurrency: number,
  fn: (row: SavedBannerRow) => Promise<CorpusResult>,
  onBatchDone: (processed: number, total: number) => void
): Promise<CorpusResult[]> => {
  const results: CorpusResult[] = [];
  for (let i = 0; i < rows.length; i += concurrency) {
    const batch = rows.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    onBatchDone(Math.min(i + concurrency, rows.length), rows.length);
  }
  return results;
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
  typeFilters: readonly BannerType[]
): string => {
  const lines: string[] = [];

  lines.push("# Saved Banner Corpus Validation Report");
  lines.push("");
  lines.push(`**Base URL:** ${baseUrl}`);
  if (typeFilters.length > 0) {
    lines.push(`**Type filter:** ${typeFilters.join(", ")}`);
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
  lines.push(...formatGroupsSection("By Banner Type + Classification", summary.failureGroups.byBannerTypeAndClassification));
  lines.push(...formatGroupsSection("By Banner Type + Metadata Key Set", summary.failureGroups.byBannerTypeAndMetadataKeySet));
  lines.push(...formatGroupsSection("By HTTP Status", summary.failureGroups.byHttpStatus));
  lines.push(...formatGroupsSection("By Response Body Message", summary.failureGroups.byResponseBodyMessage));

  if (summary.sampledFailures.length > 0) {
    lines.push(`## Sampled Failures (${summary.sampledFailures.length})`);
    lines.push("");
    lines.push("| id | mnemonic | bannerType | classification | httpStatus | metadataPreview | recallUrl |");
    lines.push("|----|----------|------------|----------------|------------|-----------------|-----------|");
    for (const f of summary.sampledFailures) {
      const status = f.httpStatus !== undefined ? String(f.httpStatus) : "�";
      const type = f.bannerType ?? `ordinal:${f.typeOrdinal}`;
      const meta = (f.metadataPreview ?? f.reason ?? "�").replace(/\|/g, "/");
      const url = f.recallUrl ?? "�";
      lines.push(
        `| ${f.id} | ${f.mnemonic} | ${type} | ${f.classification} | ${status} | ${meta} | ${url} |`
      );
    }
    lines.push("");
  }

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
  sampleFailures,
  concurrency,
  typeFilters,
  saveFailedResponses,
  allowProductionDb
} = parsedArgs;

console.log(`Base URL:    ${baseUrl}`);
console.log(`Database:    ${redactDbUrl(databaseUrl)}`);
console.log(`Output dir:  ${outputDir}`);
if (typeFilters.length > 0) console.log(`Type filter: ${typeFilters.join(", ")}`);
if (limit !== null) console.log(`Limit:       ${limit}`);
console.log(`Concurrency: ${concurrency}`);
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

const results = await runConcurrent(
  filteredRows,
  concurrency,
  (row) => processRow(baseUrl, row, saveDir),
  (processed, total) => {
    if (processed % 100 === 0 || processed === total) {
      console.log(`  ${processed}/${total} processed...`);
    }
  }
);

console.log(`All ${results.length} rows processed.`);
console.log("");

const summary = aggregateSummary(results, sampleFailures);
printSummaryTable(summary);
console.log("");

const summaryJsonPath = join(outputDir, "summary.json");
await writeFile(
  summaryJsonPath,
  JSON.stringify(
    {
      meta: {
        baseUrl,
        rowCount: results.length,
        typeFilters: typeFilters.length > 0 ? typeFilters : undefined
      },
      ...summary
    },
    null,
    2
  )
);

const summaryMdPath = join(outputDir, "summary.md");
await writeFile(summaryMdPath, formatSummaryMarkdown(summary, baseUrl, typeFilters));

console.log(`Reports written to: ${outputDir}`);
console.log(`  ${summaryJsonPath}`);
console.log(`  ${summaryMdPath}`);

if (summary.failCount > 0) {
  console.error(`\n${summary.failCount} failure(s). See sampledFailures in summary.json.`);
  process.exit(1);
}

console.log("\nAll rows passed or skipped.");
