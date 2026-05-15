# 004 Cutover Plan

## Phase 1: Scaffold and contracts

- Create Bun workspace.
- Extract compatibility manifest.
- Add manifest consistency tests.

## Phase 2: Read-only parity harness

- Add compatibility runner fixtures against the legacy public contract.
- Capture route responses, status codes, content types, and selected image metadata.
- Keep legacy repos read-only.

## Phase 3: Incremental implementation

- Implement `/mc/*` routes first because their response shape is smaller.
- Implement banner settings parser and saved banner DB reads before renderer output.
- Implement renderer package behind fixtures.
- Implement external clients behind stable interfaces.

## Phase 4: Shadow and cutover

- Run next API in shadow mode against selected production-like requests.
- Compare status, headers, JSON shape, and image encodings where practical.
- Cut over route families only after compatibility runner confidence is high.

## Explicit non-goals

- Do not migrate the website in this repo.
- Do not merge the Discord bot into the HTTP API process.
- Do not rewrite saved banner mnemonic semantics.
