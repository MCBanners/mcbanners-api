import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().trim().min(1).optional(),
  DATABASE_URL: z.string().trim().min(1).optional(),
  DB_HOST: z.string().trim().min(1).optional(),
  DB_PORT: z.string().trim().min(1).optional(),
  DB_USER: z.string().trim().min(1).optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().trim().min(1).optional(),
  DB_SSL: z.string().trim().min(1).optional(),
  DB_POOL_CONNECTION_LIMIT: z.string().trim().min(1).optional(),
  SAVED_BANNER_DB_ENABLED: z.string().trim().min(1).optional(),
  RATE_LIMIT_ENABLED: z.string().trim().min(1).optional(),
  RATE_LIMIT_WINDOW_MS: z.string().trim().min(1).optional(),
  RATE_LIMIT_MAX_REQUESTS: z.string().trim().min(1).optional(),
  METRICS_ENABLED: z.string().trim().min(1).optional(),
  CACHE_MINECRAFT_STATUS_TTL_MS: z.string().trim().min(1).optional(),
  CACHE_RENDERED_SERVER_BANNER_TTL_MS: z.string().trim().min(1).optional(),
  CACHE_RENDERED_RESOURCE_BANNER_TTL_MS: z.string().trim().min(1).optional(),
  CACHE_MARKETPLACE_AUTHOR_TTL_MS: z.string().trim().min(1).optional(),
  CACHE_RENDERED_AUTHOR_BANNER_TTL_MS: z.string().trim().min(1).optional(),
  CACHE_MARKETPLACE_MEMBER_TTL_MS: z.string().trim().min(1).optional(),
  CACHE_RENDERED_MEMBER_BANNER_TTL_MS: z.string().trim().min(1).optional(),
  CACHE_MARKETPLACE_TEAM_TTL_MS: z.string().trim().min(1).optional(),
  CACHE_RENDERED_TEAM_BANNER_TTL_MS: z.string().trim().min(1).optional()
});

export interface MariaDbConnectionConfig {
  readonly databaseUrl?: string;
  readonly host?: string;
  readonly port: number;
  readonly user?: string;
  readonly password?: string;
  readonly database?: string;
  readonly ssl: boolean;
  readonly connectionLimit: number;
}

export type SavedBannerDbConfig =
  | {
      readonly enabled: false;
      readonly reason: "disabled" | "missing-config";
    }
  | {
      readonly enabled: true;
      readonly connection: MariaDbConnectionConfig;
    };

export interface RateLimitConfig {
  readonly enabled: boolean;
  readonly windowMs: number;
  readonly maxRequests: number;
}

export interface CacheTtlConfig {
  /** Minecraft server status data cache TTL (default 30 s). */
  readonly minecraftStatusMs: number;
  /** Rendered server banner image cache TTL (default 60 s). */
  readonly serverBannerImageMs: number;
  /** Rendered resource banner image cache TTL (default 300 s). */
  readonly resourceBannerImageMs: number;
  /** Marketplace author data cache TTL (default 900 s). */
  readonly marketplaceAuthorMs: number;
  /** Rendered author banner image cache TTL (default 300 s). */
  readonly authorBannerImageMs: number;
  /** Marketplace member data cache TTL (default 900 s). */
  readonly marketplaceMemberMs: number;
  /** Rendered member banner image cache TTL (default 300 s). */
  readonly memberBannerImageMs: number;
  /** Marketplace team data cache TTL (default 900 s). */
  readonly marketplaceTeamMs: number;
  /** Rendered team banner image cache TTL (default 300 s). */
  readonly teamBannerImageMs: number;
}

export interface ApiRuntimeConfig {
  readonly port: number;
  readonly savedBannerDb: SavedBannerDbConfig;
  readonly rateLimit: RateLimitConfig;
  readonly metricsEnabled: boolean;
  readonly cacheTtl: CacheTtlConfig;
}

const parseBooleanFlag = (value: string | undefined): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Expected a boolean-like value, received "${value}"`);
};

const parsePositiveInteger = (
  value: string | undefined,
  defaultValue: number,
  name: string
): number => {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
};

const buildSavedBannerDbConfig = (env: z.infer<typeof envSchema>): SavedBannerDbConfig => {
  const explicitEnabled = parseBooleanFlag(env.SAVED_BANNER_DB_ENABLED);

  if (explicitEnabled === false) {
    return { enabled: false, reason: "disabled" };
  }

  const hasDatabaseUrl = env.DATABASE_URL !== undefined;
  const hasDiscreteConfig =
    env.DB_HOST !== undefined ||
    env.DB_USER !== undefined ||
    env.DB_PASSWORD !== undefined ||
    env.DB_NAME !== undefined;
  const shouldEnable = explicitEnabled === true || hasDatabaseUrl || hasDiscreteConfig;

  if (!shouldEnable) {
    return { enabled: false, reason: "missing-config" };
  }

  const ssl = parseBooleanFlag(env.DB_SSL) ?? false;
  const connectionLimit = parsePositiveInteger(
    env.DB_POOL_CONNECTION_LIMIT,
    10,
    "DB_POOL_CONNECTION_LIMIT"
  );

  const databaseUrl = env.DATABASE_URL;
  if (databaseUrl !== undefined) {
    return {
      enabled: true,
      connection: {
        databaseUrl,
        port: parsePositiveInteger(env.DB_PORT, 3306, "DB_PORT"),
        ssl,
        connectionLimit
      }
    };
  }

  const host = env.DB_HOST;
  const user = env.DB_USER;
  const database = env.DB_NAME;
  const missing = [
    ["DB_HOST", host],
    ["DB_USER", user],
    ["DB_NAME", database]
  ].flatMap(([name, value]) => (value === undefined ? [name] : []));

  if (missing.length > 0) {
    throw new Error(`Saved banner DB is enabled but missing ${missing.join(", ")}`);
  }

  if (host === undefined || user === undefined || database === undefined) {
    throw new Error("Saved banner DB config unexpectedly failed validation");
  }

  return {
    enabled: true,
    connection: {
      host,
      port: parsePositiveInteger(env.DB_PORT, 3306, "DB_PORT"),
      user,
      ...(env.DB_PASSWORD === undefined ? {} : { password: env.DB_PASSWORD }),
      database,
      ssl,
      connectionLimit
    }
  };
};

export const loadApiRuntimeConfig = (
  env: Record<string, string | undefined> = process.env
): ApiRuntimeConfig => {
  const parsed = envSchema.parse(env);

  return {
    port: parsePositiveInteger(parsed.PORT, 3000, "PORT"),
    savedBannerDb: buildSavedBannerDbConfig(parsed),
    rateLimit: {
      enabled: parseBooleanFlag(parsed.RATE_LIMIT_ENABLED) ?? false,
      windowMs: parsePositiveInteger(parsed.RATE_LIMIT_WINDOW_MS, 60000, "RATE_LIMIT_WINDOW_MS"),
      maxRequests: parsePositiveInteger(
        parsed.RATE_LIMIT_MAX_REQUESTS,
        300,
        "RATE_LIMIT_MAX_REQUESTS"
      )
    },
    metricsEnabled: parseBooleanFlag(parsed.METRICS_ENABLED) ?? false,
    cacheTtl: {
      minecraftStatusMs: parsePositiveInteger(
        parsed.CACHE_MINECRAFT_STATUS_TTL_MS,
        30_000,
        "CACHE_MINECRAFT_STATUS_TTL_MS"
      ),
      serverBannerImageMs: parsePositiveInteger(
        parsed.CACHE_RENDERED_SERVER_BANNER_TTL_MS,
        60_000,
        "CACHE_RENDERED_SERVER_BANNER_TTL_MS"
      ),
      resourceBannerImageMs: parsePositiveInteger(
        parsed.CACHE_RENDERED_RESOURCE_BANNER_TTL_MS,
        300_000,
        "CACHE_RENDERED_RESOURCE_BANNER_TTL_MS"
      ),
      marketplaceAuthorMs: parsePositiveInteger(
        parsed.CACHE_MARKETPLACE_AUTHOR_TTL_MS,
        900_000,
        "CACHE_MARKETPLACE_AUTHOR_TTL_MS"
      ),
      authorBannerImageMs: parsePositiveInteger(
        parsed.CACHE_RENDERED_AUTHOR_BANNER_TTL_MS,
        300_000,
        "CACHE_RENDERED_AUTHOR_BANNER_TTL_MS"
      ),
      marketplaceMemberMs: parsePositiveInteger(
        parsed.CACHE_MARKETPLACE_MEMBER_TTL_MS,
        900_000,
        "CACHE_MARKETPLACE_MEMBER_TTL_MS"
      ),
      memberBannerImageMs: parsePositiveInteger(
        parsed.CACHE_RENDERED_MEMBER_BANNER_TTL_MS,
        300_000,
        "CACHE_RENDERED_MEMBER_BANNER_TTL_MS"
      ),
      marketplaceTeamMs: parsePositiveInteger(
        parsed.CACHE_MARKETPLACE_TEAM_TTL_MS,
        900_000,
        "CACHE_MARKETPLACE_TEAM_TTL_MS"
      ),
      teamBannerImageMs: parsePositiveInteger(
        parsed.CACHE_RENDERED_TEAM_BANNER_TTL_MS,
        300_000,
        "CACHE_RENDERED_TEAM_BANNER_TTL_MS"
      )
    }
  };
};
