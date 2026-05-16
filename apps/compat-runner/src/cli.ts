import { resolve } from "node:path";

import type { CliOptions } from "./types";

export const HELP_TEXT = `MCBanners compatibility runner

Usage:
  bun run compat:compare -- --legacy-base-url <url> --candidate-base-url <url> --fixture <path> --output-dir <path>

Options:
  --legacy-base-url      Base URL for the legacy Java API
  --candidate-base-url   Base URL for the new Bun API
  --fixture              JSON fixture file containing route cases
  --output-dir           Directory for reports and downloaded artifacts
  --help                 Show this help text
`;

const readOption = (args: readonly string[], name: string): string | undefined => {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }

  return value;
};

const requireOption = (args: readonly string[], name: string): string => {
  const value = readOption(args, name);
  if (value === undefined) {
    throw new Error(`Missing required option ${name}`);
  }

  return value;
};

const assertUrl = (value: string, name: string): string => {
  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
};

export const parseCliOptions = (args: readonly string[]): CliOptions | "help" => {
  if (args.includes("--help") || args.includes("-h")) {
    return "help";
  }

  return {
    legacyBaseUrl: assertUrl(requireOption(args, "--legacy-base-url"), "--legacy-base-url"),
    candidateBaseUrl: assertUrl(
      requireOption(args, "--candidate-base-url"),
      "--candidate-base-url"
    ),
    fixture: resolve(process.cwd(), requireOption(args, "--fixture")),
    outputDir: resolve(process.cwd(), requireOption(args, "--output-dir"))
  };
};
