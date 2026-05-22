/**
 * Pure helper functions for the saved-banner corpus validator.
 * Exported for unit testing; no side effects, no I/O.
 */

import { type BannerType, decodeBannerTypeOrdinal } from "@mcbanners/domain";

export type { BannerType };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CorpusClassification =
  | "PASS_RENDERED"
  | "UNSUPPORTED_DISCORD"
  | "INVALID_ORDINAL"
  | "INVALID_JSON"
  | "MISSING_METADATA"
  | "RENDER_404"
  | "RENDER_404_MISSING_UPSTREAM"
  | "RENDER_404_MISSING_METADATA"
  | "RENDER_404_SERVER_OFFLINE"
  | "RENDER_404_DNS_FAILURE"
  | "RENDER_404_CONNECTION_FAILURE"
  | "RENDER_404_UPSTREAM_NOT_FOUND"
  | "RENDER_404_RESOURCE_REMOVED"
  | "RENDER_503_DB_UNAVAILABLE"
  | "RENDER_500_SERVER_ERROR"
  | "RENDER_500"
  | "OTHER_FAILURE";

export interface RawRow {
  readonly id: number | bigint;
  readonly type: number;
  readonly mnemonic: string;
  readonly metadata: string;
  readonly settings: string;
}

export interface CorpusResult {
  readonly id: number;
  readonly mnemonic: string;
  readonly typeOrdinal: number;
  readonly bannerType: BannerType | null;
  readonly classification: CorpusClassification;
  readonly httpStatus?: number;
  readonly contentType?: string | null;
  readonly byteSize?: number;
  readonly reason?: string;
  readonly metadataKeys?: readonly string[];
  readonly metadataPreview?: string;
  readonly settingsKeys?: readonly string[];
  readonly recallUrl?: string;
  readonly responseBodyPreview?: string;
}

export interface FailureGroups {
  /** Key: "<bannerType>:<classification>" */
  readonly byBannerTypeAndClassification: Record<string, number>;
  /** Key: "<bannerType>:{<sorted-key-set>}" */
  readonly byBannerTypeAndMetadataKeySet: Record<string, number>;
  /** Key: http status as string */
  readonly byHttpStatus: Record<string, number>;
  /** Key: truncated response body preview */
  readonly byResponseBodyMessage: Record<string, number>;
}

export interface CorpusSummary {
  readonly totalRows: number;
  readonly passCount: number;
  readonly skipCount: number;
  readonly failCount: number;
  readonly deadUpstreamCount: number;
  readonly actualCompatibilityFailures: number;
  readonly candidateCompatibleHistoricalFailures: number;
  readonly byClassification: Partial<Record<CorpusClassification, number>>;
  readonly byBannerType: Record<string, number>;
  readonly failureGroups: FailureGroups;
}

// ---------------------------------------------------------------------------
// Required metadata keys per banner type (mirrors saved-banner route)
// ---------------------------------------------------------------------------

const REQUIRED_METADATA = {
  SPONGE_AUTHOR: ["author_id"],
  SPONGE_RESOURCE: ["resource_id"],
  SPIGOT_AUTHOR: ["author_id"],
  SPIGOT_RESOURCE: ["resource_id"],
  MINECRAFT_SERVER: ["server_host"],
  CURSEFORGE_AUTHOR: ["author_id"],
  CURSEFORGE_RESOURCE: ["resource_id"],
  MODRINTH_AUTHOR: ["author_id"],
  MODRINTH_RESOURCE: ["resource_id"],
  BUILTBYBIT_AUTHOR: ["author_id"],
  BUILTBYBIT_RESOURCE: ["resource_id"],
  BUILTBYBIT_MEMBER: ["member_id"],
  POLYMART_AUTHOR: ["author_id"],
  POLYMART_RESOURCE: ["resource_id"],
  POLYMART_TEAM: ["team_id"],
  HANGAR_AUTHOR: ["author_id"],
  HANGAR_RESOURCE: ["resource_id"],
  DISCORD_USER: ["user_id"]
} as const satisfies Record<BannerType, readonly string[]>;

const KNOWN_BANNER_TYPES: ReadonlySet<string> = new Set(Object.keys(REQUIRED_METADATA));

// ---------------------------------------------------------------------------
// Pre-flight classification
// ---------------------------------------------------------------------------

export interface PreFlightResult {
  readonly status: "OK" | CorpusClassification;
  readonly bannerType: BannerType | null;
  readonly reason?: string;
  readonly metadata?: Record<string, string>;
  readonly settings?: Record<string, string>;
}

const parseSavedBannerJsonMap = (json: string): Record<string, string> => {
  const parsed: unknown = JSON.parse(json);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("expected a JSON object");
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") {
      throw new TypeError(`value for key "${key}" is not a string`);
    }
    result[key] = value;
  }
  return result;
};

export const classifyPreFlight = (row: RawRow): PreFlightResult => {
  // 1. Decode ordinal
  const bannerType = decodeBannerTypeOrdinal(row.type);
  if (bannerType === undefined) {
    return {
      status: "INVALID_ORDINAL",
      bannerType: null,
      reason: `unknown BannerType ordinal: ${row.type}`
    };
  }

  // 2. DISCORD_USER is explicitly unsupported
  if (bannerType === "DISCORD_USER") {
    return { status: "UNSUPPORTED_DISCORD", bannerType };
  }

  // 3. Parse metadata JSON
  let metadata: Record<string, string>;
  try {
    metadata = parseSavedBannerJsonMap(row.metadata);
  } catch (e) {
    return {
      status: "INVALID_JSON",
      bannerType,
      reason: `metadata parse failed: ${String(e)}`
    };
  }

  // 4. Parse settings JSON
  let settings: Record<string, string>;
  try {
    settings = parseSavedBannerJsonMap(row.settings);
  } catch (e) {
    return {
      status: "INVALID_JSON",
      bannerType,
      reason: `settings parse failed: ${String(e)}`
    };
  }

  // 5. Check required metadata keys
  const requiredKeys: readonly string[] = REQUIRED_METADATA[bannerType];
  for (const key of requiredKeys) {
    const value = metadata[key];
    if (value === undefined || value === "") {
      return {
        status: "MISSING_METADATA",
        bannerType,
        reason: `missing required metadata key: ${key}`
      };
    }
  }

  return { status: "OK", bannerType, metadata, settings };
};

// ---------------------------------------------------------------------------
// String helpers
// ---------------------------------------------------------------------------

export const truncateStr = (str: string, maxLen: number): string =>
  str.length <= maxLen ? str : `${str.slice(0, maxLen)}…`;

export const buildMetadataPreview = (metadata: Record<string, string>, maxLen = 200): string => {
  const pairs = Object.entries(metadata)
    .map(([k, v]) => `${k}=${truncateStr(v, 40)}`)
    .join(", ");
  return truncateStr(pairs, maxLen);
};

/**
 * Parse an arbitrary JSON string and return its top-level keys, or null on error.
 */
export const parseJsonKeys = (json: string): readonly string[] | null => {
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return Object.keys(parsed);
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// HTTP status classification
// ---------------------------------------------------------------------------

const MARKETPLACE_BANNER_TYPES: ReadonlySet<BannerType> = new Set([
  "SPONGE_AUTHOR",
  "SPONGE_RESOURCE",
  "SPIGOT_AUTHOR",
  "SPIGOT_RESOURCE",
  "CURSEFORGE_AUTHOR",
  "CURSEFORGE_RESOURCE",
  "MODRINTH_AUTHOR",
  "MODRINTH_RESOURCE",
  "BUILTBYBIT_AUTHOR",
  "BUILTBYBIT_RESOURCE",
  "BUILTBYBIT_MEMBER",
  "POLYMART_AUTHOR",
  "POLYMART_RESOURCE",
  "POLYMART_TEAM",
  "HANGAR_AUTHOR",
  "HANGAR_RESOURCE"
]);

export const classifyHttpStatus = (
  status: number,
  bodyText: string | null,
  bannerType?: BannerType | null
): CorpusClassification => {
  if (status === 200) return "PASS_RENDERED";
  if (status === 503) return "RENDER_503_DB_UNAVAILABLE";
  if (status >= 500) return "RENDER_500_SERVER_ERROR";
  if (status === 404) {
    if (bodyText !== null) {
      const lower = bodyText.toLowerCase();
      if (lower.includes("upstream") || lower.includes("not found in upstream")) {
        return "RENDER_404_MISSING_UPSTREAM";
      }
      if (lower.includes("missing") || lower.includes("metadata") || lower.includes("required")) {
        return "RENDER_404_MISSING_METADATA";
      }
      if (bannerType === "MINECRAFT_SERVER") {
        if (lower.includes("dns") || lower.includes("unknown host") || lower.includes("resolve")) {
          return "RENDER_404_DNS_FAILURE";
        }
        if (
          lower.includes("connection") ||
          lower.includes("refused") ||
          lower.includes("timeout")
        ) {
          return "RENDER_404_CONNECTION_FAILURE";
        }
        if (lower.includes("offline") || lower.includes("unreachable")) {
          return "RENDER_404_SERVER_OFFLINE";
        }
      }
    }
    // BannerType-based inference for empty/unhinted bodies
    if (bannerType === "MINECRAFT_SERVER") return "RENDER_404_UPSTREAM_NOT_FOUND";
    if (bannerType != null && MARKETPLACE_BANNER_TYPES.has(bannerType)) {
      return "RENDER_404_RESOURCE_REMOVED";
    }
    return "RENDER_404";
  }
  return "OTHER_FAILURE";
};

// ---------------------------------------------------------------------------
// Failure grouping
// ---------------------------------------------------------------------------

const SKIP_CLASSIFICATIONS: ReadonlySet<CorpusClassification> = new Set([
  "UNSUPPORTED_DISCORD",
  "INVALID_ORDINAL"
]);

export const groupFailures = (results: readonly CorpusResult[]): FailureGroups => {
  const byBannerTypeAndClassification: Record<string, number> = {};
  const byBannerTypeAndMetadataKeySet: Record<string, number> = {};
  const byHttpStatus: Record<string, number> = {};
  const byResponseBodyMessage: Record<string, number> = {};

  for (const r of results) {
    if (r.classification === "PASS_RENDERED" || SKIP_CLASSIFICATIONS.has(r.classification)) {
      continue;
    }

    const type = r.bannerType ?? `ordinal:${r.typeOrdinal}`;

    const typeClassKey = `${type}:${r.classification}`;
    byBannerTypeAndClassification[typeClassKey] =
      (byBannerTypeAndClassification[typeClassKey] ?? 0) + 1;

    if (r.metadataKeys !== undefined && r.metadataKeys.length > 0) {
      const keySet = [...r.metadataKeys].sort().join(",");
      const typeKeySetKey = `${type}:{${keySet}}`;
      byBannerTypeAndMetadataKeySet[typeKeySetKey] =
        (byBannerTypeAndMetadataKeySet[typeKeySetKey] ?? 0) + 1;
    }

    if (r.httpStatus !== undefined) {
      const statusKey = String(r.httpStatus);
      byHttpStatus[statusKey] = (byHttpStatus[statusKey] ?? 0) + 1;
    }

    if (r.responseBodyPreview !== undefined && r.responseBodyPreview !== "") {
      const msg = r.responseBodyPreview.slice(0, 120);
      byResponseBodyMessage[msg] = (byResponseBodyMessage[msg] ?? 0) + 1;
    }
  }

  return {
    byBannerTypeAndClassification,
    byBannerTypeAndMetadataKeySet,
    byHttpStatus,
    byResponseBodyMessage
  };
};

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

export const parseBannerTypeFilter = (name: string): BannerType | null => {
  const upper = name.toUpperCase();
  return KNOWN_BANNER_TYPES.has(upper) ? (upper as BannerType) : null;
};

export const parseConcurrency = (raw: string | undefined, defaultValue: number): number => {
  if (raw === undefined) return defaultValue;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : defaultValue;
};

// ---------------------------------------------------------------------------
// Classification filter helpers
// ---------------------------------------------------------------------------

const ALL_CLASSIFICATIONS: ReadonlySet<string> = new Set<CorpusClassification>([
  "PASS_RENDERED",
  "UNSUPPORTED_DISCORD",
  "INVALID_ORDINAL",
  "INVALID_JSON",
  "MISSING_METADATA",
  "RENDER_404",
  "RENDER_404_MISSING_UPSTREAM",
  "RENDER_404_MISSING_METADATA",
  "RENDER_404_SERVER_OFFLINE",
  "RENDER_404_DNS_FAILURE",
  "RENDER_404_CONNECTION_FAILURE",
  "RENDER_404_UPSTREAM_NOT_FOUND",
  "RENDER_404_RESOURCE_REMOVED",
  "RENDER_503_DB_UNAVAILABLE",
  "RENDER_500_SERVER_ERROR",
  "RENDER_500",
  "OTHER_FAILURE"
]);

export const parseClassificationFilter = (name: string): CorpusClassification | null => {
  const upper = name.toUpperCase();
  return ALL_CLASSIFICATIONS.has(upper) ? (upper as CorpusClassification) : null;
};

export const DEAD_UPSTREAM_CLASSIFICATIONS: ReadonlySet<CorpusClassification> = new Set([
  "RENDER_404_SERVER_OFFLINE",
  "RENDER_404_DNS_FAILURE",
  "RENDER_404_CONNECTION_FAILURE",
  "RENDER_404_UPSTREAM_NOT_FOUND",
  "RENDER_404_RESOURCE_REMOVED"
]);

// ---------------------------------------------------------------------------
// Concurrent worker queue
// ---------------------------------------------------------------------------

/**
 * Processes items using a true worker pool (not batch-based).
 * Results are returned in the original item order regardless of completion order.
 */
export const runConcurrentQueue = async <R, T>(
  items: readonly R[],
  concurrency: number,
  fn: (item: R) => Promise<T>,
  onItemDone?: (index: number, result: T) => void
): Promise<T[]> => {
  if (items.length === 0) return [];
  const results = new Array<T>(items.length);
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      const result = await fn(items[index]);
      results[index] = result;
      onItemDone?.(index, result);
    }
  };

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
};

// ---------------------------------------------------------------------------
// DB safety guard
// ---------------------------------------------------------------------------

export const extractDbName = (databaseUrl: string): string | null => {
  try {
    const url = new URL(databaseUrl);
    const pathname = url.pathname.replace(/^\//, "");
    return pathname || null;
  } catch {
    return null;
  }
};

export const isSafeDbName = (dbName: string): boolean => {
  const lower = dbName.toLowerCase();
  return lower.includes("staging") || lower.includes("test") || lower.includes("dev");
};

export const guardDbSafety = (databaseUrl: string, allowProduction: boolean): void => {
  if (allowProduction) return;
  const dbName = extractDbName(databaseUrl);
  if (dbName === null) {
    throw new Error(
      "could not extract database name from --database-url. " +
        "Pass --allow-production-db to skip this guard."
    );
  }
  if (!isSafeDbName(dbName)) {
    throw new Error(
      `database name "${dbName}" does not contain "staging", "test", or "dev". ` +
        "Pass --allow-production-db to connect to a production database."
    );
  }
};

export const redactDbUrl = (databaseUrl: string): string => {
  try {
    const url = new URL(databaseUrl);
    if (url.password) {
      url.password = "***";
    }
    return url.toString();
  } catch {
    return "[invalid-url]";
  }
};

// ---------------------------------------------------------------------------
// Summary aggregation
// ---------------------------------------------------------------------------

export const aggregateSummary = (
  results: readonly CorpusResult[],
  _maxSampledFailures: number
): CorpusSummary => {
  const byClassification: Partial<Record<CorpusClassification, number>> = {};
  const byBannerType: Record<string, number> = {};
  let passCount = 0;
  let skipCount = 0;
  let failCount = 0;
  const allFailures: CorpusResult[] = [];

  for (const result of results) {
    byClassification[result.classification] = (byClassification[result.classification] ?? 0) + 1;

    const typeKey = result.bannerType ?? `ordinal:${result.typeOrdinal}`;
    byBannerType[typeKey] = (byBannerType[typeKey] ?? 0) + 1;

    if (result.classification === "PASS_RENDERED") {
      passCount += 1;
    } else if (SKIP_CLASSIFICATIONS.has(result.classification)) {
      skipCount += 1;
    } else {
      failCount += 1;
      allFailures.push(result);
    }
  }

  const deadUpstreamCount = allFailures.filter((r) =>
    DEAD_UPSTREAM_CLASSIFICATIONS.has(r.classification)
  ).length;

  return {
    totalRows: results.length,
    passCount,
    skipCount,
    failCount,
    deadUpstreamCount,
    actualCompatibilityFailures: failCount - deadUpstreamCount,
    candidateCompatibleHistoricalFailures: deadUpstreamCount,
    byClassification,
    byBannerType,
    failureGroups: groupFailures(results)
  };
};
