import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import type { CaseComparisonResult, CompatSummary, ImageComparison } from "./types";

const statusIcon = (result: CaseComparisonResult): string => {
  if (result.skipped) {
    return "SKIP";
  }
  if (result.knownLegacyFailureOutcome !== undefined) {
    switch (result.knownLegacyFailureOutcome) {
      case "candidate_improvement":
        return "CANDIDATE_IMPROVEMENT";
      case "both_failing":
        return "KNOWN_LEGACY_FAILURE_ALSO_BROKEN";
      case "legacy_unexpectedly_passed":
        return "LEGACY_UNEXPECTEDLY_PASSED";
      case "regression":
        return "REGRESSION";
    }
  }

  return result.passed ? "PASS" : "FAIL";
};

const imageDetails = (comparison: ImageComparison): string[] => {
  const legacyDimensions =
    comparison.legacy.dimensions === null
      ? "unknown"
      : `${String(comparison.legacy.dimensions.width)}x${String(comparison.legacy.dimensions.height)}`;
  const candidateDimensions =
    comparison.candidate.dimensions === null
      ? "unknown"
      : `${String(comparison.candidate.dimensions.width)}x${String(comparison.candidate.dimensions.height)}`;

  return [
    `Legacy bytes/hash: ${String(comparison.legacy.byteSize)} / ${comparison.legacy.sha256 ?? "n/a"}`,
    `Candidate bytes/hash: ${String(comparison.candidate.byteSize)} / ${comparison.candidate.sha256 ?? "n/a"}`,
    `Dimensions: legacy=${legacyDimensions}, candidate=${candidateDimensions}`,
    "Visual diff: not implemented yet"
  ];
};

export const renderMarkdownSummary = (summary: CompatSummary): string => {
  const lines = [
    `# Compatibility Report - ${summary.fixtureName}`,
    "",
    `Generated: ${summary.generatedAt}`,
    "",
    `Total: ${String(summary.totals.total)}`,
    `Enabled: ${String(summary.totals.enabled)}`,
    `Skipped: ${String(summary.totals.skipped)}`,
    `Passed: ${String(summary.totals.passed)}`,
    `Failed: ${String(summary.totals.failed)}`,
    `Candidate improvements: ${String(summary.totals.candidateImprovements)}`,
    ""
  ];

  const renderCase = (result: CaseComparisonResult): void => {
    lines.push(`### ${statusIcon(result)} ${result.id}`);
    lines.push("");
    lines.push(`Path: \`${result.path}\``);
    lines.push(`Type: \`${result.type}\``);
    lines.push(
      `Legacy status/content-type: ${String(result.legacy.status)} / ${String(result.legacy.contentType)}`
    );
    lines.push(
      `Candidate status/content-type: ${String(result.candidate.status)} / ${String(result.candidate.contentType)}`
    );

    if (result.skipped && result.skipReason !== undefined) {
      lines.push("");
      lines.push(`Skip reason: ${result.skipReason}`);
    }

    if (result.knownLegacyFailureOutcome !== undefined) {
      lines.push("");
      lines.push(`Known legacy failure outcome: \`${result.knownLegacyFailureOutcome}\``);
    }

    if (result.failures.length > 0) {
      lines.push("");
      lines.push("Failures:");
      for (const failure of result.failures) {
        lines.push(`- ${failure}`);
      }
    }

    if (result.comparison?.kind === "image") {
      lines.push("");
      for (const detail of imageDetails(result.comparison)) {
        lines.push(`- ${detail}`);
      }
    }

    if (result.artifacts.legacy !== undefined || result.artifacts.candidate !== undefined) {
      lines.push("");
      lines.push(
        `Artifacts: legacy=${result.artifacts.legacy ?? "n/a"}, candidate=${result.artifacts.candidate ?? "n/a"}`
      );
    }

    lines.push("");
  };

  const normalPass = summary.cases.filter(
    (c) => !c.skipped && c.knownLegacyFailureOutcome === undefined && c.passed
  );
  const normalFail = summary.cases.filter(
    (c) => !c.skipped && c.knownLegacyFailureOutcome === undefined && !c.passed
  );
  const skipped = summary.cases.filter((c) => c.skipped);
  const knownLegacy = summary.cases.filter((c) => c.knownLegacyFailureOutcome !== undefined);

  if (normalPass.length > 0) {
    lines.push("## PASS");
    lines.push("");
    for (const result of normalPass) renderCase(result);
  }

  if (normalFail.length > 0) {
    lines.push("## FAIL");
    lines.push("");
    for (const result of normalFail) renderCase(result);
  }

  if (skipped.length > 0) {
    lines.push("## SKIP");
    lines.push("");
    for (const result of skipped) renderCase(result);
  }

  if (knownLegacy.length > 0) {
    lines.push("## KNOWN LEGACY FAILURE CASES");
    lines.push("");
    for (const result of knownLegacy) renderCase(result);
  }

  return `${lines.join("\n").trimEnd()}\n`;
};

export const writeReports = async (summary: CompatSummary, outputDir: string): Promise<void> => {
  await mkdir(outputDir, { recursive: true });
  await Bun.write(join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));
  await Bun.write(join(outputDir, "summary.md"), renderMarkdownSummary(summary));
};
