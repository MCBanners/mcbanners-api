# 005 Dependency Policy

## Bun Version Pinning

The root `packageManager` field pins the local Bun version used for this workspace. Update it only after confirming the installed Bun version with:

```powershell
bun --version
```

## Lockfile Policy

`bun.lock` is required and must be reviewed with every dependency change. Normal installs should use:

```powershell
bun install --frozen-lockfile
```

The workspace `bunfig.toml` enables frozen lockfile installs by default and disables dependency lifecycle scripts unless a dependency is explicitly trusted.

## Update Process

Use this sequence for planned updates:

```powershell
bun outdated
bun update --latest
bun install --frozen-lockfile
bun pm audit
```

If `bun pm audit` is not available in the installed Bun version, run `bun pm scan`. If no scanner is configured, document that warning instead of bypassing lockfile review.

Keep TypeScript on the latest stable `5.9.x` release unless TypeScript 6 is clearly supported by the compiler, ESLint parser, and workspace checks.

## Supply-Chain Cautions

Recent npm supply-chain incidents affected popular tooling packages. Do not add dependencies for convenience when a small local implementation or existing dependency is enough. Review package major bumps deliberately, especially packages that run lifecycle scripts, publish binaries, or participate in lint/build/test execution.

## Minimal Dependency Preference

Prefer:

- Bun and TypeScript built-ins.
- Existing workspace dependencies.
- Small, well-maintained packages with clear ownership.

Avoid:

- Convenience wrappers around standard APIs.
- Large framework additions during compatibility extraction.
- Packages that require trusted lifecycle scripts unless there is a documented reason.
