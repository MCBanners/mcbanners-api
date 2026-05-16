# Security Policy

## Reporting Vulnerabilities

Please report suspected vulnerabilities privately to the project maintainers. Do not open a public issue with exploit details, secrets, private hostnames, raw database rows, saved-banner mnemonics, or production logs.

Include:

- A clear description of the issue.
- A minimal reproduction using non-sensitive data.
- Affected routes or packages.
- Any relevant version or commit information.

The maintainers will acknowledge the report, investigate, and coordinate a fix before public disclosure when appropriate.

## Sensitive Data

Never commit:

- `.env` files or real database URLs.
- API keys, tokens, or passwords.
- SQL dumps, zip exports, generated output directories, or local logs.
- Raw saved-banner corpus rows, row IDs, mnemonics, or production metadata.
