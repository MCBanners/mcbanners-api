import { createHash } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { parseImageDimensions } from "./image";
import type {
  BodyComparison,
  CaseComparisonResult,
  CompatFixture,
  CompatRouteCase,
  CompatSummary,
  FetchedResponse,
  ImageSideSummary
} from "./types";

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const EMPTY_RESPONSE: FetchedResponse = {
  ok: false,
  url: "",
  status: null,
  contentType: null,
  bytes: new Uint8Array()
};

export const joinBaseUrlAndPath = (baseUrl: string, path: string): string => {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  return new URL(cleanPath, base).toString();
};

export const normalizeContentType = (contentType: string | null): string | null =>
  contentType?.split(";")[0]?.trim().toLowerCase() ?? null;

export const sha256Hex = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

export const jsonShape = (value: unknown): unknown => {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? [] : [jsonShape(value[0])];
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, jsonShape(entry)])
    );
  }

  return typeof value;
};

const stableJson = (value: unknown): string => JSON.stringify(value);

const fetchRoute = async (
  fetchImpl: FetchLike,
  url: string,
  routeCase: CompatRouteCase
): Promise<FetchedResponse> => {
  try {
    const response = await fetchImpl(url, { method: routeCase.method });
    const bytes = new Uint8Array(await response.arrayBuffer());

    return {
      ok: true,
      url,
      status: response.status,
      contentType: response.headers.get("content-type"),
      bytes
    };
  } catch (error) {
    return {
      ...EMPTY_RESPONSE,
      url,
      error: error instanceof Error ? error.message : "Unknown network error"
    };
  }
};

const responseExtension = (routeCase: CompatRouteCase, response: FetchedResponse): string => {
  if (routeCase.type === "json") {
    return "json";
  }

  const normalized = normalizeContentType(response.contentType);
  if (normalized === "image/png") {
    return "png";
  }
  if (normalized === "image/jpeg") {
    return "jpg";
  }

  return "bin";
};

const writeArtifact = async (
  outputDir: string,
  routeCase: CompatRouteCase,
  side: "legacy" | "candidate",
  response: FetchedResponse
): Promise<string | undefined> => {
  if (response.bytes.length === 0) {
    return undefined;
  }

  const relativePath = join(
    "artifacts",
    routeCase.id,
    `${side}.${responseExtension(routeCase, response)}`
  );
  const absolutePath = join(outputDir, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await Bun.write(absolutePath, response.bytes);

  return relativePath.replaceAll("\\", "/");
};

const compareJsonBodies = (legacy: FetchedResponse, candidate: FetchedResponse): BodyComparison => {
  try {
    const legacyShape = jsonShape(JSON.parse(new TextDecoder().decode(legacy.bytes)));
    const candidateShape = jsonShape(JSON.parse(new TextDecoder().decode(candidate.bytes)));

    return {
      kind: "json",
      bodyShapeEqual: stableJson(legacyShape) === stableJson(candidateShape),
      legacyShape,
      candidateShape
    };
  } catch (error) {
    return {
      kind: "json",
      bodyShapeEqual: false,
      parseError: error instanceof Error ? error.message : "Unable to parse JSON response"
    };
  }
};

const imageSideSummary = (response: FetchedResponse): ImageSideSummary => ({
  byteSize: response.bytes.length,
  sha256: response.bytes.length === 0 ? null : sha256Hex(response.bytes),
  dimensions: parseImageDimensions(response.bytes)
});

const compareImageBodies = (
  legacy: FetchedResponse,
  candidate: FetchedResponse
): BodyComparison => {
  const legacySummary = imageSideSummary(legacy);
  const candidateSummary = imageSideSummary(candidate);

  return {
    kind: "image",
    byteSizeEqual: legacySummary.byteSize === candidateSummary.byteSize,
    dimensionsEqual:
      legacySummary.dimensions !== null &&
      candidateSummary.dimensions !== null &&
      legacySummary.dimensions.width === candidateSummary.dimensions.width &&
      legacySummary.dimensions.height === candidateSummary.dimensions.height,
    legacy: legacySummary,
    candidate: candidateSummary,
    visualDiff: "not-implemented"
  };
};

const buildFailures = (
  routeCase: CompatRouteCase,
  legacy: FetchedResponse,
  candidate: FetchedResponse,
  comparison: BodyComparison
): readonly string[] => {
  const failures: string[] = [];

  if (legacy.error !== undefined) {
    failures.push(`legacy fetch failed: ${legacy.error}`);
  }
  if (candidate.error !== undefined) {
    failures.push(`candidate fetch failed: ${candidate.error}`);
  }
  if (legacy.status !== candidate.status) {
    failures.push(
      `status mismatch: legacy=${String(legacy.status)} candidate=${String(candidate.status)}`
    );
  }
  if (normalizeContentType(legacy.contentType) !== normalizeContentType(candidate.contentType)) {
    failures.push(
      `content-type mismatch: legacy=${String(legacy.contentType)} candidate=${String(candidate.contentType)}`
    );
  }

  if (routeCase.type === "json" && comparison.kind === "json" && !comparison.bodyShapeEqual) {
    failures.push("JSON body shape mismatch");
  }
  if (routeCase.type === "image" && comparison.kind === "image" && !comparison.dimensionsEqual) {
    failures.push("image dimensions mismatch or unavailable");
  }

  return failures;
};

export const compareCase = async (
  routeCase: CompatRouteCase,
  legacyBaseUrl: string,
  candidateBaseUrl: string,
  outputDir: string,
  fetchImpl: FetchLike = fetch
): Promise<CaseComparisonResult> => {
  const legacy = await fetchRoute(
    fetchImpl,
    joinBaseUrlAndPath(legacyBaseUrl, routeCase.path),
    routeCase
  );
  const candidate = await fetchRoute(
    fetchImpl,
    joinBaseUrlAndPath(candidateBaseUrl, routeCase.path),
    routeCase
  );
  const comparison =
    routeCase.type === "json"
      ? compareJsonBodies(legacy, candidate)
      : compareImageBodies(legacy, candidate);
  const failures = buildFailures(routeCase, legacy, candidate, comparison);
  const legacyArtifact = await writeArtifact(outputDir, routeCase, "legacy", legacy);
  const candidateArtifact = await writeArtifact(outputDir, routeCase, "candidate", candidate);

  return {
    id: routeCase.id,
    ...(routeCase.description === undefined ? {} : { description: routeCase.description }),
    type: routeCase.type,
    path: routeCase.path,
    enabled: routeCase.enabled,
    skipped: false,
    passed: failures.length === 0,
    failures,
    legacy,
    candidate,
    comparison,
    artifacts: {
      ...(legacyArtifact === undefined ? {} : { legacy: legacyArtifact }),
      ...(candidateArtifact === undefined ? {} : { candidate: candidateArtifact })
    }
  };
};

const skippedResult = (routeCase: CompatRouteCase): CaseComparisonResult => ({
  id: routeCase.id,
  ...(routeCase.description === undefined ? {} : { description: routeCase.description }),
  type: routeCase.type,
  path: routeCase.path,
  enabled: routeCase.enabled,
  skipped: true,
  passed: true,
  failures: routeCase.disabledReason === undefined ? [] : [routeCase.disabledReason],
  legacy: EMPTY_RESPONSE,
  candidate: EMPTY_RESPONSE,
  artifacts: {}
});

export const compareFixture = async (
  fixture: CompatFixture,
  legacyBaseUrl: string,
  candidateBaseUrl: string,
  outputDir: string,
  fetchImpl: FetchLike = fetch
): Promise<CompatSummary> => {
  const cases: CaseComparisonResult[] = [];
  for (const routeCase of fixture.cases) {
    cases.push(
      routeCase.enabled
        ? await compareCase(routeCase, legacyBaseUrl, candidateBaseUrl, outputDir, fetchImpl)
        : skippedResult(routeCase)
    );
  }

  const enabled = cases.filter((result) => !result.skipped);
  const passed = enabled.filter((result) => result.passed);

  return {
    fixtureName: fixture.name,
    generatedAt: new Date().toISOString(),
    totals: {
      total: cases.length,
      enabled: enabled.length,
      skipped: cases.length - enabled.length,
      passed: passed.length,
      failed: enabled.length - passed.length
    },
    cases
  };
};
