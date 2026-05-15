import { compareFixture } from "./compare";
import { loadCompatFixture } from "./fixture";
import { renderMarkdownSummary, writeReports } from "./report";
import { HELP_TEXT, parseCliOptions } from "./cli";

const sanitizeUrl = (value: string): string => {
  const url = new URL(value);
  url.username = url.username === "" ? "" : "redacted";
  url.password = url.password === "" ? "" : "redacted";

  return url.toString();
};

export const runCli = async (args: readonly string[]): Promise<number> => {
  try {
    const options = parseCliOptions(args);
    if (options === "help") {
      console.log(HELP_TEXT.trimEnd());
      return 0;
    }

    const fixture = await loadCompatFixture(options.fixture);
    const summary = await compareFixture(
      fixture,
      options.legacyBaseUrl,
      options.candidateBaseUrl,
      options.outputDir
    );
    await writeReports(summary, options.outputDir);

    console.log(`Fixture: ${fixture.name}`);
    console.log(`Legacy: ${sanitizeUrl(options.legacyBaseUrl)}`);
    console.log(`Candidate: ${sanitizeUrl(options.candidateBaseUrl)}`);
    console.log(`Report: ${options.outputDir}`);
    console.log(
      `Result: ${String(summary.totals.passed)}/${String(summary.totals.enabled)} enabled cases passed, ${String(summary.totals.skipped)} skipped`
    );
    console.log("");
    console.log(renderMarkdownSummary(summary));

    return summary.totals.failed === 0 ? 0 : 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Compatibility runner failed");
    return 1;
  }
};

if (import.meta.main) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exit(exitCode);
}
