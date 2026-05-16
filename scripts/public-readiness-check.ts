#!/usr/bin/env bun

import { readFile } from "node:fs/promises";
import { extname } from "node:path";

interface Finding {
  readonly file: string;
  readonly rule: string;
  readonly detail: string;
}

const textExtensions = new Set([
  "",
  ".cjs",
  ".css",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);

const forbiddenTrackedPaths: readonly { rule: string; pattern: RegExp }[] = [
  { rule: "tracked node_modules", pattern: /(^|\/)node_modules(\/|$)/ },
  { rule: "tracked dist output", pattern: /(^|\/)dist(\/|$)/ },
  { rule: "tracked output artifact", pattern: /(^|\/)output(\/|$)/ },
  { rule: "tracked tsbuildinfo", pattern: /\.tsbuildinfo$/i },
  { rule: "tracked SQL dump", pattern: /\.sql(\.gz)?$/i },
  { rule: "tracked zip archive", pattern: /\.zip$/i },
  { rule: "tracked env file", pattern: /(^|\/)\.env($|\.)/ },
  { rule: "tracked local log", pattern: /(^|\/)logs?\/|\.log$/i }
];

const forbiddenContent: readonly { rule: string; pattern: RegExp }[] = [
  { rule: "local Windows user path", pattern: /[A-Z]:\\Users[\\/]/i },
  {
    rule: "private IPv4 literal",
    pattern:
      /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/
  },
  { rule: "root database credential example", pattern: /mysql:\/\/root:root@/i },
  { rule: "raw saved-banner sample table", pattern: /\|\s*id\s*\|\s*mnemonic\s*\|/i },
  { rule: "saved-banner corpus output artifact", pattern: /saved-banner-corpus-final/i }
];

const allowTrackedPath = (path: string): boolean => path === ".env.example";

const allowContentFinding = (path: string, rule: string): boolean => {
  if (path === "scripts/public-readiness-check.ts") {
    return true;
  }
  if (rule === "private IPv4 literal" && /(^|\/)(test|tests)\//.test(path)) {
    return true;
  }
  return false;
};

const run = async (): Promise<void> => {
  const proc = Bun.spawn(["git", "ls-files", "--cached", "--others", "--exclude-standard"], {
    stdout: "pipe",
    stderr: "pipe"
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ]);

  if (exitCode !== 0) {
    throw new Error(`git ls-files failed: ${stderr.trim()}`);
  }

  const files = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const findings: Finding[] = [];

  for (const file of files) {
    const normalized = file.replaceAll("\\", "/");
    if (!allowTrackedPath(normalized)) {
      for (const { rule, pattern } of forbiddenTrackedPaths) {
        if (pattern.test(normalized)) {
          findings.push({ file, rule, detail: "forbidden tracked path" });
        }
      }
    }

    if (!textExtensions.has(extname(file).toLowerCase())) {
      continue;
    }

    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch {
      continue;
    }

    for (const { rule, pattern } of forbiddenContent) {
      if (pattern.test(text)) {
        if (allowContentFinding(normalized, rule)) {
          continue;
        }
        findings.push({ file, rule, detail: "forbidden content pattern" });
      }
    }
  }

  if (findings.length > 0) {
    console.error("Public-readiness check failed:");
    for (const finding of findings) {
      console.error(`- ${finding.file}: ${finding.rule} (${finding.detail})`);
    }
    process.exit(1);
  }

  console.log(`Public-readiness check passed (${files.length} candidate files scanned).`);
};

await run();
