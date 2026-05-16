FROM oven/bun:1.3.14 AS builder

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile
RUN bun run typecheck
RUN bun run test
RUN bun run build

FROM oven/bun:1.3.14 AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package.json /app/bun.lock /app/bunfig.toml ./

COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/src ./apps/api/src

COPY --from=builder /app/packages/banner-renderer/package.json ./packages/banner-renderer/package.json
COPY --from=builder /app/packages/banner-renderer/src ./packages/banner-renderer/src
COPY --from=builder /app/packages/banner-renderer/assets ./packages/banner-renderer/assets

COPY --from=builder /app/packages/cache/package.json ./packages/cache/package.json
COPY --from=builder /app/packages/cache/src ./packages/cache/src

COPY --from=builder /app/packages/config/package.json ./packages/config/package.json
COPY --from=builder /app/packages/config/src ./packages/config/src

COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/db/src ./packages/db/src

COPY --from=builder /app/packages/domain/package.json ./packages/domain/package.json
COPY --from=builder /app/packages/domain/src ./packages/domain/src

COPY --from=builder /app/packages/external-clients/package.json ./packages/external-clients/package.json
COPY --from=builder /app/packages/external-clients/src ./packages/external-clients/src

COPY --from=builder /app/packages/logger/package.json ./packages/logger/package.json
COPY --from=builder /app/packages/logger/src ./packages/logger/src

COPY --from=builder /app/packages/minecraft-status/package.json ./packages/minecraft-status/package.json
COPY --from=builder /app/packages/minecraft-status/src ./packages/minecraft-status/src

RUN bun install --frozen-lockfile --production
RUN groupadd --system mcbanners \
  && useradd --system --gid mcbanners --home-dir /app --shell /usr/sbin/nologin mcbanners

USER mcbanners

EXPOSE 3000

CMD ["bun", "run", "apps/api/src/index.ts"]
