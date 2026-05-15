# 006 Domain Compatibility Ports

Milestone 2 ports compatibility-critical Java domain behavior into `packages/domain`.

## Ported Facts

- `BannerType` is represented as immutable string records plus an ordinal decode map.
- `ServiceBackend`, `BannerOutputFormat`, `BackgroundTemplate`, `FontFace`, `TextAlign`, and `TextTheme` are string-safe union types.
- Legacy output formats remain `png` and `jpg` only.
- Font file names preserve the Java `FontFace.getFileName(boolean bold)` mapping.

## Ported Utilities

- `NumberUtil.abbreviate`
- `StringUtil.cleanupEnumConstant`
- `StringUtil.generateMnemonic`
- `StringUtil.truncateAfter`, approximated with `Intl.Segmenter`

## Ported Settings Primitives

- `namespace__key` construction and lookup.
- Namespace filtering that ignores unrelated query parameters.
- Java-like boolean parsing: only case-insensitive `true` is true.
- Integer, enum, and string parsing with default fallback.

## Boundary Rule

Raw `saved_banner.type` ordinal decoding should happen only at the database boundary. Internal code should use the string union `BannerType`.
