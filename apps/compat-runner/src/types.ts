export type CompatCaseType = "json" | "image";
export type CompatHttpMethod = "GET";

export interface CompatFixture {
  readonly name: string;
  readonly cases: readonly CompatRouteCase[];
}

export interface CompatRouteCase {
  readonly id: string;
  readonly description?: string;
  readonly enabled: boolean;
  readonly disabledReason?: string;
  readonly type: CompatCaseType;
  readonly method: CompatHttpMethod;
  readonly path: string;
}

export interface CliOptions {
  readonly legacyBaseUrl: string;
  readonly candidateBaseUrl: string;
  readonly fixture: string;
  readonly outputDir: string;
}

export interface FetchedResponse {
  readonly ok: boolean;
  readonly url: string;
  readonly status: number | null;
  readonly contentType: string | null;
  readonly bytes: Uint8Array;
  readonly error?: string;
}

export interface JsonComparison {
  readonly kind: "json";
  readonly bodyShapeEqual: boolean;
  readonly legacyShape?: unknown;
  readonly candidateShape?: unknown;
  readonly parseError?: string;
}

export interface ImageDimensions {
  readonly width: number;
  readonly height: number;
}

export interface ImageSideSummary {
  readonly byteSize: number;
  readonly sha256: string | null;
  readonly dimensions: ImageDimensions | null;
}

export interface ImageComparison {
  readonly kind: "image";
  readonly byteSizeEqual: boolean;
  readonly dimensionsEqual: boolean;
  readonly legacy: ImageSideSummary;
  readonly candidate: ImageSideSummary;
  readonly visualDiff: "not-implemented";
}

export type BodyComparison = JsonComparison | ImageComparison;

export interface CaseComparisonResult {
  readonly id: string;
  readonly description?: string;
  readonly type: CompatCaseType;
  readonly path: string;
  readonly enabled: boolean;
  readonly skipped: boolean;
  readonly passed: boolean;
  readonly failures: readonly string[];
  readonly legacy: FetchedResponse;
  readonly candidate: FetchedResponse;
  readonly comparison?: BodyComparison;
  readonly artifacts: {
    readonly legacy?: string;
    readonly candidate?: string;
  };
}

export interface CompatSummary {
  readonly fixtureName: string;
  readonly generatedAt: string;
  readonly totals: {
    readonly total: number;
    readonly enabled: number;
    readonly skipped: number;
    readonly passed: number;
    readonly failed: number;
  };
  readonly cases: readonly CaseComparisonResult[];
}
