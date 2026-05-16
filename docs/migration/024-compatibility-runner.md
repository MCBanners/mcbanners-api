# 024 - Compatibility Runner

## Purpose

`apps/compat-runner` compares selected legacy Java API routes against the new
Bun API. It is a manual migration tool, not part of normal tests, because it
requires both servers to be running.

## Command

```powershell
bun run compat:compare -- --legacy-base-url http://localhost:8080 --candidate-base-url http://localhost:3000 --fixture test/fixtures/compat/routes.json --output-dir apps/compat-runner/output/local
```

Help:

```powershell
bun run compat:compare:help
```

## Fixture Format

Fixtures are JSON files with a name and route cases:

```json
{
  "name": "initial-public-route-compatibility",
  "cases": [
    {
      "id": "mc-server-hypixel-json",
      "description": "Minecraft server status JSON shape",
      "enabled": true,
      "type": "json",
      "method": "GET",
      "path": "/mc/server?host=mc.hypixel.net",
      "expectedLegacyFailure": {
        "reason": "Legacy Java production returns 400 for this route"
      }
    }
  ]
}
```

Supported case types:

- `json`: compares status code, normalized content type, and JSON body shape.
- `image`: compares status code, normalized content type, and image dimensions.
  It also records byte size and SHA-256 for both sides.

Disabled cases are reported as skipped. Saved-banner examples should stay
disabled until the same mnemonic exists in both legacy and candidate databases.

### expectedLegacyFailure

An optional field marking that the legacy API is known to fail on this route in
production. When present, the runner applies a 4-case decision matrix instead of
the normal pass/fail:

| Legacy | Candidate | Outcome | Exit |
|--------|-----------|---------|------|
| fails  | passes    | `candidate_improvement` — reported as CANDIDATE_IMPROVEMENT | 0 |
| fails  | fails     | `both_failing` — reported as KNOWN_LEGACY_FAILURE_ALSO_BROKEN | 1 |
| passes | passes    | `legacy_unexpectedly_passed` — reported with a warning | 0 |
| passes | fails     | `regression` — reported as REGRESSION | 1 |

"Fails" means a network error, a null status, or an HTTP status ≥ 400.

This allows compat-runner to track routes where legacy Java has known production
failures without polluting the normal FAIL section.

## Known-Good Live Fixture IDs

- Spigot resource `9089` is EssentialsX. Legacy Java production returns
  `image/png` for `/banner/resource/spigot/9089/banner.png`, so this is the
  preferred Spigot resource fixture for compat-runner and local release smoke.

## Reports

The runner writes:

- `summary.json`: machine-readable comparison result.
- `summary.md`: human-readable summary with grouped sections.
- `artifacts/<case-id>/legacy.*`: downloaded legacy response body.
- `artifacts/<case-id>/candidate.*`: downloaded candidate response body.

The default output location should be under `apps/compat-runner/output/` or
`compat-output/`; both are ignored by git.

The markdown summary groups cases into sections:

- **PASS** — normal cases that matched
- **FAIL** — normal cases that did not match
- **SKIP** — disabled cases
- **KNOWN LEGACY FAILURE CASES** — cases with `expectedLegacyFailure` set,
  showing `candidate_improvement`, `both_failing`, `legacy_unexpectedly_passed`,
  or `regression` outcomes

The `summary.json` totals include a `candidateImprovements` count.

## Pass And Fail Rules

JSON cases pass when:

- status codes match,
- normalized content types match,
- both bodies parse as JSON,
- body shape matches after values are reduced to JSON types.

Image cases pass when:

- status codes match,
- normalized content types match,
- dimensions can be read and match.

Image byte sizes and SHA-256 hashes are recorded but are not pass/fail criteria.
The Java renderer and the Bun renderer are expected to produce different bytes,
especially as font rasterization, antialiasing, and encoder behavior differ.

## Current Limitations

- Full pixel visual diff is a placeholder.
- Only `GET` cases are supported.
- The runner does not start either server.
- Network failures are captured as failed cases instead of throwing the whole
  run away.
- Secrets in base URLs are redacted in console output, but fixtures should still
  avoid embedding credentials.
