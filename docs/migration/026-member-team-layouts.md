# 026 - Member And Team Layouts

## Java Sources Referenced

- `MemberLayout.java`
- `MemberParameters.java`
- `TeamLayout.java`
- `TeamParameters.java`
- `MemberController.java`
- `TeamController.java`
- `MemberService.java`
- `TeamService.java`
- `BuiltByBitClient.java`
- `PolymartClient.java`
- `BuiltByBitMemberDeserializer.java`
- `PolymartAuthorDeserializer.java`
- `SavedController.java`
- `BannerType.java`
- `Sprite.java`
- `LogoComponent.java`

## Route Decision

Legacy exposes direct public routes:

- `GET /member/builtbybit/{id}/isValid`
- `GET /member/builtbybit/{id}/banner.{png|jpg}`
- `GET /team/polymart/{id}/isValid`
- `GET /team/polymart/{id}/banner.{png|jpg}`

The next API implements these under the compatibility banner namespace:

- `GET /banner/member/builtbybit/:id/isValid`
- `GET /banner/member/builtbybit/:id/banner.png`
- `GET /banner/member/builtbybit/:id/banner.jpg`
- `GET /banner/team/polymart/:id/isValid`
- `GET /banner/team/polymart/:id/banner.png`
- `GET /banner/team/polymart/:id/banner.jpg`

No Discord routes, auth/JWT, or additional member/team platforms are added.

## Member Behavior

BuiltByBit member banners render:

- global background from `background__template`
- member avatar, falling back to `DEFAULT_AUTHOR_LOGO`
- `member_name`
- `rank`
- `joined`
- `posts`
- `likes` as net feedback

Java defaults are preserved:

| Namespace     | x   | y   | Notes           |
| ------------- | --- | --- | --------------- |
| `logo`        | 12  |     | size `80`       |
| `member_name` | 104 | 22  | size `18`, bold |
| `rank`        | 104 | 37  | text namespace  |
| `joined`      | 104 | 55  | text namespace  |
| `posts`       | 104 | 72  | text namespace  |
| `likes`       | 104 | 89  | text namespace  |

Rank mapping follows Java order: `ultimate`, then `supreme`, then `premium`,
else an empty string. Join dates are formatted as UTC `M/dd/yyyy`.

## Team Behavior

Polymart team banners render:

- global background from `background__template`
- team profile picture, falling back to `DEFAULT_POLYMART_RES_LOGO`
- `team_name`
- `resource_count`
- `downloads`
- `ratings`

Java defaults are preserved:

| Namespace        | x   | y   | Notes           |
| ---------------- | --- | --- | --------------- |
| `logo`           | 12  |     | size `80`       |
| `team_name`      | 104 | 22  | size `18`, bold |
| `resource_count` | 104 | 38  | text namespace  |
| `downloads`      | 104 | 72  | text namespace  |
| `ratings`        | 104 | 89  | text namespace  |

## Saved Recall

Saved recall now supports the remaining non-Discord legacy saved types:

- `BUILTBYBIT_MEMBER`, using metadata key `member_id`
- `POLYMART_TEAM`, using metadata key `team_id`

Missing required metadata is treated as corrupt stored data and returns the
same safe `500` behavior used for other invalid saved rows.

## Known Java Differences

- Direct routes are mounted under `/banner/member` and `/banner/team` to match
  the next API's existing banner route namespace.
- BuiltByBit and Polymart live shapes are covered by deterministic fixtures;
  final cutover should still run live compatibility checks through the compat
  runner.
