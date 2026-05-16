import { compareFixture } from "./compare";
import type { FetchLike } from "./compare";
import { loadCompatFixture } from "./fixture";
import { renderMarkdownSummary, writeReports } from "./report";
import { HELP_TEXT, parseCliOptions } from "./cli";

const sanitizeUrl = (value: string): string => {
  const url = new URL(value);
  url.username = url.username === "" ? "" : "redacted";
  url.password = url.password === "" ? "" : "redacted";

  return url.toString();
};

export interface CliConsole {
  readonly log: (...data: unknown[]) => void;
  readonly error: (...data: unknown[]) => void;
}

export const runCli = async (
  args: readonly string[],
  fetchImpl: FetchLike = fetch,
  cliConsole: CliConsole = console
): Promise<number> => {
  try {
    const options = parseCliOptions(args);
    if (options === "help") {
      cliConsole.log(HELP_TEXT.trimEnd());
      return 0;
    }

    const fixture = await loadCompatFixture(options.fixture);
    const summary = await compareFixture(
      fixture,
      options.legacyBaseUrl,
      options.candidateBaseUrl,
      options.outputDir,
      fetchImpl
    );
    await writeReports(summary, options.outputDir);

    cliConsole.log(`Fixture: ${fixture.name}`);
    cliConsole.log(`Legacy: ${sanitizeUrl(options.legacyBaseUrl)}`);
    cliConsole.log(`Candidate: ${sanitizeUrl(options.candidateBaseUrl)}`);
    cliConsole.log(`Report: ${options.outputDir}`);
    cliConsole.log(
      `Result: ${String(summary.totals.passed)}/${String(summary.totals.enabled)} enabled cases passed, ${String(summary.totals.skipped)} skipped`
    );
    cliConsole.log("");
    cliConsole.log(renderMarkdownSummary(summary));

    return summary.totals.failed === 0 ? 0 : 1;
  } catch (error) {
    cliConsole.error(error instanceof Error ? error.message : "Compatibility runner failed");
    return 1;
  }
};

if (import.meta.main) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exit(exitCode);
}
