# 001 Compatibility Contract

## Public route families

The next API must preserve the public path families currently used through `api.mcbanners.com`:

- `/banner/author/:platform/:id/isValid`
- `/banner/author/:platform/:id/banner.:outputType`
- `/banner/resource/:platform/:id/isValid`
- `/banner/resource/:platform/:id/banner.:outputType`
- `/banner/server/:host/:port/isValid`
- `/banner/server/:host/:port/banner.:outputType`
- `/banner/member/builtbybit/:id/isValid`
- `/banner/member/builtbybit/:id/banner.:outputType`
- `/banner/team/polymart/:id/isValid`
- `/banner/team/polymart/:id/banner.:outputType`
- `/banner/discord/user/:id/isValid`
- `/banner/discord/user/:id/banner.:outputType`
- `/banner/saved/save`
- `/banner/saved/:mnemonic.:outputType`
- `/banner/manage_saved/find/all`
- `/banner/manage_saved/update/:id`
- `/banner/manage_saved/delete/:id`
- `/banner/svc/constants`
- `/banner/svc/defaults/:type`
- `/banner/svc/template/:template`
- `/mc/server?host=:host&port=:port`
- `/mc/icon?host=:host&port=:port`

The manifest in `packages/domain/src/compatibility/manifest.ts` is the source of truth for this milestone.

## Enum boundaries

`BannerType` ordinal order is persisted in `saved_banner.type` and must not be reordered. New values must be appended only after a migration decision.

`BannerOutputFormat` accepts:

- `png` mapped to `PNG`
- `jpg` mapped to `JPEG`

## Settings boundary

Legacy settings are read by namespace and key, joined with `__`. Example: `author_name__font_size`.

Any new parser must keep these namespaces and keys valid, including defaults for:

- global: `background`, `logo`
- author: `author_name`, `resource_count`, `likes`, `downloads`, `reviews`
- resource: `resource_name`, `author_name`, `reviews`, `updated`, `stars`, `downloads`, `price`
- server: `server_name`, `version`, `motd`, `players`
- member: `member_name`, `rank`, `joined`, `posts`, `likes`
- team: `team_name`, `resource_count`, `downloads`, `ratings`
- discord: `discord_name`, `id`, `status`, `activity`, `created`

## Saved banners

The legacy `saved_banner` table contains:

- `id BIGINT(20) AUTO_INCREMENT`
- `type INT(5)` containing the Java `BannerType` ordinal
- `owner BINARY(16)` nullable UUID
- `mnemonic VARCHAR(14)` unique recall token
- `metadata LONGTEXT` JSON object
- `settings LONGTEXT` JSON object

Saved recall reconstructs upstream metadata by keys such as `author_id`, `resource_id`, `server_host`, `server_port`, `member_id`, and `team_id`.
