# Contributing

Thanks for improving MCBanners API Next.

## Setup

```powershell
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Fill `.env` with local, non-production values only.

## Checks

Before opening a pull request:

```powershell
bun run public:check
bun run format
bun run check
```

Run the Docker build when changing container, runtime, or deployment behavior:

```powershell
docker build -t mcbanners-api-next:local .
```

## Scope

- Keep public route and query parameter compatibility unless a change is intentional and documented.
- Do not modify the legacy Java repositories from this repo.
- Keep `apps/discord-bot` de-scoped from v1 API work unless a future project task explicitly brings it back.
- Keep `apps/bench-runner` out of the v1 build until benchmark tooling is implemented.

## Data Hygiene

Do not commit secrets, SQL dumps, zip exports, generated output, local logs, raw saved-banner rows, row IDs, mnemonics, or production metadata.
