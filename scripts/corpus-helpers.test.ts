import { describe, it, expect } from "bun:test";

import {
  classifyPreFlight,
  classifyHttpStatus,
  truncateStr,
  buildMetadataPreview,
  parseJsonKeys,
  groupFailures,
  parseBannerTypeFilter,
  parseConcurrency,
  extractDbName,
  isSafeDbName,
  guardDbSafety,
  redactDbUrl,
  aggregateSummary,
  parseClassificationFilter,
  runConcurrentQueue,
  DEAD_UPSTREAM_CLASSIFICATIONS,
  type RawRow,
  type CorpusResult
} from "./corpus-helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRow = (overrides: Partial<RawRow> = {}): RawRow => ({
  id: 1,
  type: 3, // SPIGOT_RESOURCE
  mnemonic: "abcdefghijklmn",
  metadata: JSON.stringify({ resource_id: "12345" }),
  settings: JSON.stringify({}),
  ...overrides
});

const makeResult = (
  classification: CorpusResult["classification"],
  bannerType: CorpusResult["bannerType"] = "SPIGOT_RESOURCE"
): CorpusResult => ({
  id: 1,
  mnemonic: "abcdefghijklmn",
  typeOrdinal: 3,
  bannerType,
  classification
});

// ---------------------------------------------------------------------------
// classifyPreFlight
// ---------------------------------------------------------------------------

describe("classifyPreFlight", () => {
  it("returns OK for a valid SPIGOT_RESOURCE row", () => {
    const result = classifyPreFlight(makeRow());
    expect(result.status).toBe("OK");
    expect(result.bannerType).toBe("SPIGOT_RESOURCE");
  });

  it("returns OK for MINECRAFT_SERVER with server_host", () => {
    const result = classifyPreFlight(
      makeRow({ type: 4, metadata: JSON.stringify({ server_host: "mc.example.com" }) })
    );
    expect(result.status).toBe("OK");
    expect(result.bannerType).toBe("MINECRAFT_SERVER");
  });

  it("returns UNSUPPORTED_DISCORD for ordinal 17", () => {
    const result = classifyPreFlight(
      makeRow({ type: 17, metadata: JSON.stringify({ user_id: "123" }) })
    );
    expect(result.status).toBe("UNSUPPORTED_DISCORD");
    expect(result.bannerType).toBe("DISCORD_USER");
  });

  it("returns INVALID_ORDINAL for an unknown ordinal", () => {
    const result = classifyPreFlight(makeRow({ type: 999 }));
    expect(result.status).toBe("INVALID_ORDINAL");
    expect(result.bannerType).toBeNull();
    expect(result.reason).toContain("999");
  });

  it("returns INVALID_JSON when metadata is not valid JSON", () => {
    const result = classifyPreFlight(makeRow({ metadata: "not-json{{" }));
    expect(result.status).toBe("INVALID_JSON");
    expect(result.reason).toContain("metadata");
  });

  it("returns INVALID_JSON when metadata is a JSON array not an object", () => {
    const result = classifyPreFlight(makeRow({ metadata: JSON.stringify([1, 2, 3]) }));
    expect(result.status).toBe("INVALID_JSON");
  });

  it("returns INVALID_JSON when settings is not valid JSON", () => {
    const result = classifyPreFlight(makeRow({ settings: "{bad" }));
    expect(result.status).toBe("INVALID_JSON");
    expect(result.reason).toContain("settings");
  });

  it("returns MISSING_METADATA when required key is absent", () => {
    const result = classifyPreFlight(makeRow({ metadata: JSON.stringify({ other: "val" }) }));
    expect(result.status).toBe("MISSING_METADATA");
    expect(result.reason).toContain("resource_id");
  });

  it("returns MISSING_METADATA when required key is empty string", () => {
    const result = classifyPreFlight(makeRow({ metadata: JSON.stringify({ resource_id: "" }) }));
    expect(result.status).toBe("MISSING_METADATA");
  });

  it("returns OK for BUILTBYBIT_MEMBER with member_id", () => {
    const result = classifyPreFlight(
      makeRow({ type: 11, metadata: JSON.stringify({ member_id: "789" }) })
    );
    expect(result.status).toBe("OK");
    expect(result.bannerType).toBe("BUILTBYBIT_MEMBER");
  });

  it("returns OK for POLYMART_TEAM with team_id", () => {
    const result = classifyPreFlight(
      makeRow({ type: 14, metadata: JSON.stringify({ team_id: "42" }) })
    );
    expect(result.status).toBe("OK");
    expect(result.bannerType).toBe("POLYMART_TEAM");
  });
});

// ---------------------------------------------------------------------------
// extractDbName
// ---------------------------------------------------------------------------

describe("extractDbName", () => {
  it("extracts DB name from a mysql URL", () => {
    expect(extractDbName("mysql://user:pass@localhost:3306/mydb")).toBe("mydb");
  });

  it("extracts DB name from a URL without a port", () => {
    expect(extractDbName("mysql://user:pass@localhost/staging_db")).toBe("staging_db");
  });

  it("returns null for an invalid URL", () => {
    expect(extractDbName("not-a-url")).toBeNull();
  });

  it("returns null when path is empty", () => {
    expect(extractDbName("mysql://user:pass@localhost/")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isSafeDbName
// ---------------------------------------------------------------------------

describe("isSafeDbName", () => {
  it("accepts names containing 'staging'", () => {
    expect(isSafeDbName("mcbanners_staging")).toBe(true);
  });

  it("accepts names containing 'test'", () => {
    expect(isSafeDbName("mcbanners_test")).toBe(true);
  });

  it("accepts names containing 'dev'", () => {
    expect(isSafeDbName("mcbanners_dev")).toBe(true);
  });

  it("rejects names without a safe keyword", () => {
    expect(isSafeDbName("mcbanners")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isSafeDbName("MCBANNERS_STAGING")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// guardDbSafety
// ---------------------------------------------------------------------------

describe("guardDbSafety", () => {
  it("throws for a production DB name when allowProduction is false", () => {
    expect(() => guardDbSafety("mysql://u:p@host/mcbanners", false)).toThrow('"mcbanners"');
  });

  it("does not throw for a staging DB name", () => {
    expect(() => guardDbSafety("mysql://u:p@host/mcbanners_staging", false)).not.toThrow();
  });

  it("does not throw when allowProduction is true, even for a production DB name", () => {
    expect(() => guardDbSafety("mysql://u:p@host/mcbanners", true)).not.toThrow();
  });

  it("throws when DB name cannot be extracted and allowProduction is false", () => {
    expect(() => guardDbSafety("not-a-url", false)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// redactDbUrl
// ---------------------------------------------------------------------------

describe("redactDbUrl", () => {
  it("replaces the password with ***", () => {
    const result = redactDbUrl("mysql://user:secret@host:3306/db");
    expect(result).not.toContain("secret");
    expect(result).toContain("***");
    expect(result).toContain("user");
  });

  it("leaves URLs without a password unchanged", () => {
    const result = redactDbUrl("mysql://host/db");
    expect(result).not.toContain("***");
  });

  it("returns [invalid-url] for invalid URLs", () => {
    expect(redactDbUrl("not-a-url")).toBe("[invalid-url]");
  });
});

// ---------------------------------------------------------------------------
// aggregateSummary
// ---------------------------------------------------------------------------

describe("aggregateSummary", () => {
  it("counts PASS_RENDERED correctly", () => {
    const summary = aggregateSummary([makeResult("PASS_RENDERED")], 25);
    expect(summary.passCount).toBe(1);
    expect(summary.failCount).toBe(0);
    expect(summary.skipCount).toBe(0);
    expect(summary.totalRows).toBe(1);
  });

  it("counts UNSUPPORTED_DISCORD as skip", () => {
    const summary = aggregateSummary([makeResult("UNSUPPORTED_DISCORD", "DISCORD_USER")], 25);
    expect(summary.skipCount).toBe(1);
    expect(summary.failCount).toBe(0);
    expect(summary.passCount).toBe(0);
  });

  it("counts INVALID_ORDINAL as skip", () => {
    const summary = aggregateSummary([makeResult("INVALID_ORDINAL", null)], 25);
    expect(summary.skipCount).toBe(1);
    expect(summary.failCount).toBe(0);
  });

  it("counts RENDER_404 as fail", () => {
    const summary = aggregateSummary([makeResult("RENDER_404")], 25);
    expect(summary.failCount).toBe(1);
    expect(summary.passCount).toBe(0);
  });

  it("counts RENDER_500 as fail", () => {
    const summary = aggregateSummary([makeResult("RENDER_500")], 25);
    expect(summary.failCount).toBe(1);
  });

  it("counts INVALID_JSON as fail", () => {
    const summary = aggregateSummary([makeResult("INVALID_JSON")], 25);
    expect(summary.failCount).toBe(1);
  });

  it("counts MISSING_METADATA as fail", () => {
    const summary = aggregateSummary([makeResult("MISSING_METADATA")], 25);
    expect(summary.failCount).toBe(1);
  });

  it("samples failures up to maxSampledFailures", () => {
    const results = Array.from({ length: 10 }, () => makeResult("RENDER_404"));
    const summary = aggregateSummary(results, 3);
    expect(summary.sampledFailures.length).toBe(3);
    expect(summary.failCount).toBe(10);
  });

  it("includes all failures when fewer than maxSampledFailures", () => {
    const results = [makeResult("RENDER_404"), makeResult("RENDER_500")];
    const summary = aggregateSummary(results, 25);
    expect(summary.sampledFailures.length).toBe(2);
  });

  it("aggregates byBannerType correctly", () => {
    const results = [
      makeResult("PASS_RENDERED", "SPIGOT_RESOURCE"),
      makeResult("PASS_RENDERED", "SPIGOT_RESOURCE"),
      makeResult("PASS_RENDERED", "MODRINTH_RESOURCE")
    ];
    const summary = aggregateSummary(results, 25);
    expect(summary.byBannerType["SPIGOT_RESOURCE"]).toBe(2);
    expect(summary.byBannerType["MODRINTH_RESOURCE"]).toBe(1);
  });

  it("uses ordinal:N as key for null bannerType", () => {
    const result: CorpusResult = {
      id: 1,
      mnemonic: "abcdefghijklmn",
      typeOrdinal: 999,
      bannerType: null,
      classification: "INVALID_ORDINAL"
    };
    const summary = aggregateSummary([result], 25);
    expect(summary.byBannerType["ordinal:999"]).toBe(1);
  });

  it("populates byClassification", () => {
    const results = [
      makeResult("PASS_RENDERED"),
      makeResult("RENDER_404"),
      makeResult("RENDER_404")
    ];
    const summary = aggregateSummary(results, 25);
    expect(summary.byClassification["PASS_RENDERED"]).toBe(1);
    expect(summary.byClassification["RENDER_404"]).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// truncateStr
// ---------------------------------------------------------------------------

describe("truncateStr", () => {
  it("returns short strings unchanged", () => {
    expect(truncateStr("hello", 10)).toBe("hello");
  });

  it("truncates long strings and appends ellipsis", () => {
    const result = truncateStr("abcdefghij", 5);
    expect(result).toBe("abcde\u2026");
  });

  it("returns string unchanged when length equals maxLen", () => {
    expect(truncateStr("hello", 5)).toBe("hello");
  });
});

// ---------------------------------------------------------------------------
// buildMetadataPreview
// ---------------------------------------------------------------------------

describe("buildMetadataPreview", () => {
  it("formats key=value pairs", () => {
    const result = buildMetadataPreview({ resource_id: "12345" });
    expect(result).toContain("resource_id=12345");
  });

  it("truncates long values", () => {
    const longVal = "x".repeat(100);
    const result = buildMetadataPreview({ key: longVal });
    expect(result).toContain("key=");
    expect(result.length).toBeLessThan(longVal.length);
  });

  it("truncates the full preview to maxLen", () => {
    const meta = { a: "1", b: "2", c: "3", d: "4", e: "5" };
    const result = buildMetadataPreview(meta, 10);
    expect(result.length).toBeLessThanOrEqual(11); // maxLen + ellipsis char
  });

  it("returns empty string for empty metadata", () => {
    expect(buildMetadataPreview({})).toBe("");
  });
});

// ---------------------------------------------------------------------------
// parseJsonKeys
// ---------------------------------------------------------------------------

describe("parseJsonKeys", () => {
  it("returns keys of a JSON object", () => {
    const keys = parseJsonKeys(JSON.stringify({ a: "1", b: "2" }));
    expect(keys).toEqual(["a", "b"]);
  });

  it("returns null for a JSON array", () => {
    expect(parseJsonKeys(JSON.stringify([1, 2, 3]))).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseJsonKeys("{bad")).toBeNull();
  });

  it("returns null for JSON null", () => {
    expect(parseJsonKeys("null")).toBeNull();
  });

  it("returns empty array for an empty object", () => {
    expect(parseJsonKeys("{}")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// classifyHttpStatus
// ---------------------------------------------------------------------------

describe("classifyHttpStatus", () => {
  it("classifies 200 as PASS_RENDERED", () => {
    expect(classifyHttpStatus(200, null)).toBe("PASS_RENDERED");
  });

  it("classifies 503 as RENDER_503_DB_UNAVAILABLE", () => {
    expect(classifyHttpStatus(503, null)).toBe("RENDER_503_DB_UNAVAILABLE");
  });

  it("classifies 500 as RENDER_500_SERVER_ERROR", () => {
    expect(classifyHttpStatus(500, null)).toBe("RENDER_500_SERVER_ERROR");
  });

  it("classifies 502 as RENDER_500_SERVER_ERROR", () => {
    expect(classifyHttpStatus(502, null)).toBe("RENDER_500_SERVER_ERROR");
  });

  it("classifies 404 with no body as RENDER_404", () => {
    expect(classifyHttpStatus(404, null)).toBe("RENDER_404");
  });

  it("classifies 404 with upstream keyword as RENDER_404_MISSING_UPSTREAM", () => {
    expect(classifyHttpStatus(404, '{"error":"upstream not found"}')).toBe(
      "RENDER_404_MISSING_UPSTREAM"
    );
  });

  it("classifies 404 with missing keyword as RENDER_404_MISSING_METADATA", () => {
    expect(classifyHttpStatus(404, '{"error":"missing required metadata"}')).toBe(
      "RENDER_404_MISSING_METADATA"
    );
  });

  it("classifies 301 as OTHER_FAILURE", () => {
    expect(classifyHttpStatus(301, null)).toBe("OTHER_FAILURE");
  });

  it("classifies 429 as OTHER_FAILURE", () => {
    expect(classifyHttpStatus(429, null)).toBe("OTHER_FAILURE");
  });
});

// ---------------------------------------------------------------------------
// groupFailures
// ---------------------------------------------------------------------------

describe("groupFailures", () => {
  const makeRichResult = (
    classification: CorpusResult["classification"],
    overrides: Partial<CorpusResult> = {}
  ): CorpusResult => ({
    id: 1,
    mnemonic: "abcdefghijklmn",
    typeOrdinal: 3,
    bannerType: "SPIGOT_RESOURCE",
    classification,
    metadataKeys: ["resource_id"],
    ...overrides
  });

  it("groups failures by bannerType + classification", () => {
    const results = [
      makeRichResult("RENDER_404"),
      makeRichResult("RENDER_404"),
      makeRichResult("RENDER_500_SERVER_ERROR")
    ];
    const groups = groupFailures(results);
    expect(groups.byBannerTypeAndClassification["SPIGOT_RESOURCE:RENDER_404"]).toBe(2);
    expect(groups.byBannerTypeAndClassification["SPIGOT_RESOURCE:RENDER_500_SERVER_ERROR"]).toBe(1);
  });

  it("excludes PASS_RENDERED from groups", () => {
    const results = [makeRichResult("PASS_RENDERED"), makeRichResult("RENDER_404")];
    const groups = groupFailures(results);
    expect(Object.keys(groups.byBannerTypeAndClassification)).toHaveLength(1);
    expect(groups.byBannerTypeAndClassification["SPIGOT_RESOURCE:RENDER_404"]).toBe(1);
  });

  it("excludes UNSUPPORTED_DISCORD from groups", () => {
    const results = [
      makeRichResult("UNSUPPORTED_DISCORD", { bannerType: "DISCORD_USER" }),
      makeRichResult("RENDER_404")
    ];
    const groups = groupFailures(results);
    expect(Object.keys(groups.byBannerTypeAndClassification)).toHaveLength(1);
  });

  it("groups by httpStatus", () => {
    const results = [
      makeRichResult("RENDER_404", { httpStatus: 404 }),
      makeRichResult("RENDER_404", { httpStatus: 404 }),
      makeRichResult("RENDER_500_SERVER_ERROR", { httpStatus: 500 })
    ];
    const groups = groupFailures(results);
    expect(groups.byHttpStatus["404"]).toBe(2);
    expect(groups.byHttpStatus["500"]).toBe(1);
  });

  it("groups by metadata key set", () => {
    const results = [
      makeRichResult("RENDER_404", { metadataKeys: ["resource_id"] }),
      makeRichResult("RENDER_404", { metadataKeys: ["resource_id"] }),
      makeRichResult("RENDER_404", { metadataKeys: ["resource_id", "extra"] })
    ];
    const groups = groupFailures(results);
    expect(groups.byBannerTypeAndMetadataKeySet["SPIGOT_RESOURCE:{resource_id}"]).toBe(2);
    expect(groups.byBannerTypeAndMetadataKeySet["SPIGOT_RESOURCE:{extra,resource_id}"]).toBe(1);
  });

  it("groups by response body message", () => {
    const results = [
      makeRichResult("RENDER_503_DB_UNAVAILABLE", { responseBodyPreview: '{"error":"DB down"}' }),
      makeRichResult("RENDER_503_DB_UNAVAILABLE", { responseBodyPreview: '{"error":"DB down"}' })
    ];
    const groups = groupFailures(results);
    expect(groups.byResponseBodyMessage['{"error":"DB down"}']).toBe(2);
  });

  it("uses ordinal:N key for null bannerType", () => {
    const result: CorpusResult = {
      id: 1,
      mnemonic: "abcdefghijklmn",
      typeOrdinal: 999,
      bannerType: null,
      classification: "INVALID_JSON"
    };
    const groups = groupFailures([result]);
    expect(groups.byBannerTypeAndClassification["ordinal:999:INVALID_JSON"]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// parseBannerTypeFilter
// ---------------------------------------------------------------------------

describe("parseBannerTypeFilter", () => {
  it("returns BannerType for valid uppercase name", () => {
    expect(parseBannerTypeFilter("SPIGOT_RESOURCE")).toBe("SPIGOT_RESOURCE");
  });

  it("is case-insensitive", () => {
    expect(parseBannerTypeFilter("minecraft_server")).toBe("MINECRAFT_SERVER");
    expect(parseBannerTypeFilter("Modrinth_Resource")).toBe("MODRINTH_RESOURCE");
  });

  it("returns null for unknown type name", () => {
    expect(parseBannerTypeFilter("UNKNOWN_TYPE")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseBannerTypeFilter("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseConcurrency
// ---------------------------------------------------------------------------

describe("parseConcurrency", () => {
  it("returns default when value is undefined", () => {
    expect(parseConcurrency(undefined, 5)).toBe(5);
  });

  it("parses a valid integer string", () => {
    expect(parseConcurrency("10", 5)).toBe(10);
  });

  it("returns default for non-numeric input", () => {
    expect(parseConcurrency("abc", 5)).toBe(5);
  });

  it("returns default for zero", () => {
    expect(parseConcurrency("0", 5)).toBe(5);
  });

  it("returns default for negative", () => {
    expect(parseConcurrency("-1", 5)).toBe(5);
  });

  it("accepts 1 as valid", () => {
    expect(parseConcurrency("1", 5)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// M30: classifyHttpStatus with bannerType
// ---------------------------------------------------------------------------

describe("classifyHttpStatus with bannerType", () => {
  it("MINECRAFT_SERVER + 404 + no body => RENDER_404_UPSTREAM_NOT_FOUND", () => {
    expect(classifyHttpStatus(404, null, "MINECRAFT_SERVER")).toBe("RENDER_404_UPSTREAM_NOT_FOUND");
  });

  it("MINECRAFT_SERVER + 404 + empty body => RENDER_404_UPSTREAM_NOT_FOUND", () => {
    expect(classifyHttpStatus(404, "", "MINECRAFT_SERVER")).toBe("RENDER_404_UPSTREAM_NOT_FOUND");
  });

  it("MINECRAFT_SERVER + 404 + dns hint => RENDER_404_DNS_FAILURE", () => {
    expect(classifyHttpStatus(404, "dns resolution failed", "MINECRAFT_SERVER")).toBe("RENDER_404_DNS_FAILURE");
  });

  it("MINECRAFT_SERVER + 404 + unknown host hint => RENDER_404_DNS_FAILURE", () => {
    expect(classifyHttpStatus(404, "unknown host: play.example.com", "MINECRAFT_SERVER")).toBe("RENDER_404_DNS_FAILURE");
  });

  it("MINECRAFT_SERVER + 404 + connection refused => RENDER_404_CONNECTION_FAILURE", () => {
    expect(classifyHttpStatus(404, "connection refused", "MINECRAFT_SERVER")).toBe("RENDER_404_CONNECTION_FAILURE");
  });

  it("MINECRAFT_SERVER + 404 + timeout => RENDER_404_CONNECTION_FAILURE", () => {
    expect(classifyHttpStatus(404, "request timeout", "MINECRAFT_SERVER")).toBe("RENDER_404_CONNECTION_FAILURE");
  });

  it("MINECRAFT_SERVER + 404 + offline => RENDER_404_SERVER_OFFLINE", () => {
    expect(classifyHttpStatus(404, "server is offline", "MINECRAFT_SERVER")).toBe("RENDER_404_SERVER_OFFLINE");
  });

  it("SPIGOT_RESOURCE + 404 => RENDER_404_RESOURCE_REMOVED", () => {
    expect(classifyHttpStatus(404, null, "SPIGOT_RESOURCE")).toBe("RENDER_404_RESOURCE_REMOVED");
  });

  it("MODRINTH_RESOURCE + 404 => RENDER_404_RESOURCE_REMOVED", () => {
    expect(classifyHttpStatus(404, null, "MODRINTH_RESOURCE")).toBe("RENDER_404_RESOURCE_REMOVED");
  });

  it("HANGAR_RESOURCE + 404 => RENDER_404_RESOURCE_REMOVED", () => {
    expect(classifyHttpStatus(404, null, "HANGAR_RESOURCE")).toBe("RENDER_404_RESOURCE_REMOVED");
  });

  it("null bannerType + 404 => RENDER_404 (fallback)", () => {
    expect(classifyHttpStatus(404, null, null)).toBe("RENDER_404");
  });

  it("bannerType-specific 404 still respects body keyword for missing-upstream hint", () => {
    // "upstream" keyword takes priority over bannerType inference
    expect(classifyHttpStatus(404, "upstream not found", "MINECRAFT_SERVER")).toBe("RENDER_404_MISSING_UPSTREAM");
  });

  it("500 is unaffected by bannerType", () => {
    expect(classifyHttpStatus(500, null, "MINECRAFT_SERVER")).toBe("RENDER_500_SERVER_ERROR");
    expect(classifyHttpStatus(500, null, "SPIGOT_RESOURCE")).toBe("RENDER_500_SERVER_ERROR");
  });

  it("200 with bannerType => PASS_RENDERED", () => {
    expect(classifyHttpStatus(200, null, "MINECRAFT_SERVER")).toBe("PASS_RENDERED");
  });
});

// ---------------------------------------------------------------------------
// M30: parseClassificationFilter
// ---------------------------------------------------------------------------

describe("parseClassificationFilter", () => {
  it("returns valid classification unchanged", () => {
    expect(parseClassificationFilter("RENDER_404")).toBe("RENDER_404");
    expect(parseClassificationFilter("INVALID_JSON")).toBe("INVALID_JSON");
    expect(parseClassificationFilter("PASS_RENDERED")).toBe("PASS_RENDERED");
  });

  it("returns null for unknown value", () => {
    expect(parseClassificationFilter("UNKNOWN_THING")).toBeNull();
    expect(parseClassificationFilter("")).toBeNull();
  });

  it("is case-insensitive (normalizes to uppercase)", () => {
    expect(parseClassificationFilter("render_404")).toBe("RENDER_404");
    expect(parseClassificationFilter("invalid_json")).toBe("INVALID_JSON");
  });

  it("returns new M30 classification values", () => {
    expect(parseClassificationFilter("RENDER_404_UPSTREAM_NOT_FOUND")).toBe("RENDER_404_UPSTREAM_NOT_FOUND");
    expect(parseClassificationFilter("RENDER_404_DNS_FAILURE")).toBe("RENDER_404_DNS_FAILURE");
    expect(parseClassificationFilter("RENDER_404_CONNECTION_FAILURE")).toBe("RENDER_404_CONNECTION_FAILURE");
    expect(parseClassificationFilter("RENDER_404_SERVER_OFFLINE")).toBe("RENDER_404_SERVER_OFFLINE");
    expect(parseClassificationFilter("RENDER_404_RESOURCE_REMOVED")).toBe("RENDER_404_RESOURCE_REMOVED");
  });
});

// ---------------------------------------------------------------------------
// M30: DEAD_UPSTREAM_CLASSIFICATIONS set
// ---------------------------------------------------------------------------

describe("DEAD_UPSTREAM_CLASSIFICATIONS", () => {
  it("includes all dead-upstream classification values", () => {
    expect(DEAD_UPSTREAM_CLASSIFICATIONS.has("RENDER_404_SERVER_OFFLINE")).toBe(true);
    expect(DEAD_UPSTREAM_CLASSIFICATIONS.has("RENDER_404_DNS_FAILURE")).toBe(true);
    expect(DEAD_UPSTREAM_CLASSIFICATIONS.has("RENDER_404_CONNECTION_FAILURE")).toBe(true);
    expect(DEAD_UPSTREAM_CLASSIFICATIONS.has("RENDER_404_UPSTREAM_NOT_FOUND")).toBe(true);
    expect(DEAD_UPSTREAM_CLASSIFICATIONS.has("RENDER_404_RESOURCE_REMOVED")).toBe(true);
  });

  it("does not include non-dead classifications", () => {
    expect(DEAD_UPSTREAM_CLASSIFICATIONS.has("RENDER_404")).toBe(false);
    expect(DEAD_UPSTREAM_CLASSIFICATIONS.has("RENDER_500_SERVER_ERROR")).toBe(false);
    expect(DEAD_UPSTREAM_CLASSIFICATIONS.has("PASS_RENDERED")).toBe(false);
    expect(DEAD_UPSTREAM_CLASSIFICATIONS.has("INVALID_JSON")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// M30: aggregateSummary dead-upstream fields
// ---------------------------------------------------------------------------

const makeDeadResult = (
  classification: CorpusResult["classification"],
  bannerType: CorpusResult["bannerType"] = "MINECRAFT_SERVER"
): CorpusResult => ({
  id: 1,
  mnemonic: "abc",
  typeOrdinal: 7,
  bannerType,
  classification,
  httpStatus: 404
});

describe("aggregateSummary dead-upstream fields", () => {
  it("deadUpstreamCount is 0 when no dead-upstream classifications", () => {
    const results: CorpusResult[] = [
      makeDeadResult("PASS_RENDERED"),
      makeDeadResult("RENDER_404")
    ];
    const s = aggregateSummary(results, 10);
    expect(s.deadUpstreamCount).toBe(0);
    expect(s.actualCompatibilityFailures).toBe(1); // RENDER_404 is a real failure
    expect(s.candidateCompatibleHistoricalFailures).toBe(0);
  });

  it("deadUpstreamCount counts dead-upstream classification rows", () => {
    const results: CorpusResult[] = [
      makeDeadResult("RENDER_404_SERVER_OFFLINE"),
      makeDeadResult("RENDER_404_DNS_FAILURE"),
      makeDeadResult("RENDER_404_RESOURCE_REMOVED", "SPIGOT_RESOURCE"),
      makeDeadResult("RENDER_404"),
      makeDeadResult("PASS_RENDERED")
    ];
    const s = aggregateSummary(results, 10);
    expect(s.deadUpstreamCount).toBe(3);
    expect(s.failCount).toBe(4); // 3 dead + 1 RENDER_404
    expect(s.actualCompatibilityFailures).toBe(1); // only RENDER_404
    expect(s.candidateCompatibleHistoricalFailures).toBe(3);
  });

  it("actualCompatibilityFailures = failCount - deadUpstreamCount", () => {
    const results: CorpusResult[] = [
      makeDeadResult("RENDER_404_UPSTREAM_NOT_FOUND"),
      makeDeadResult("RENDER_404_CONNECTION_FAILURE"),
      makeDeadResult("RENDER_500_SERVER_ERROR")
    ];
    const s = aggregateSummary(results, 10);
    expect(s.deadUpstreamCount).toBe(2);
    expect(s.failCount).toBe(3);
    expect(s.actualCompatibilityFailures).toBe(1);
  });

  it("candidateCompatibleHistoricalFailures equals deadUpstreamCount", () => {
    const results: CorpusResult[] = [
      makeDeadResult("RENDER_404_SERVER_OFFLINE"),
      makeDeadResult("PASS_RENDERED")
    ];
    const s = aggregateSummary(results, 10);
    expect(s.candidateCompatibleHistoricalFailures).toBe(s.deadUpstreamCount);
  });
});

// ---------------------------------------------------------------------------
// M30: runConcurrentQueue
// ---------------------------------------------------------------------------

describe("runConcurrentQueue", () => {
  it("processes all items and returns results in original order", async () => {
    const items = [3, 1, 2];
    const results = await runConcurrentQueue(
      items,
      2,
      async (n) => {
        // Simulate different latencies
        await new Promise((r) => setTimeout(r, n * 5));
        return n * 10;
      }
    );
    expect(results).toEqual([30, 10, 20]);
  });

  it("handles empty array", async () => {
    const results = await runConcurrentQueue([], 3, async (x: number) => x);
    expect(results).toEqual([]);
  });

  it("handles single item", async () => {
    const results = await runConcurrentQueue([42], 3, async (x) => x + 1);
    expect(results).toEqual([43]);
  });

  it("calls onItemDone for each completed item", async () => {
    const done: number[] = [];
    await runConcurrentQueue(
      [1, 2, 3],
      2,
      async (x) => x,
      (index, _result) => { done.push(index); }
    );
    expect(done.sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });

  it("respects concurrency (does not start all at once with concurrency=1)", async () => {
    const order: number[] = [];
    await runConcurrentQueue(
      [1, 2, 3],
      1,
      async (x) => {
        order.push(x);
        return x;
      }
    );
    // With concurrency=1, items run sequentially in order
    expect(order).toEqual([1, 2, 3]);
  });
});
