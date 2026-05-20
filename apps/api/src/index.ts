import { createApp, type AppMetrics, type AppOptions, type MetricsSnapshot } from "./app";
import { createFixtureAdapter, LiveMinecraftStatusAdapter } from "@mcbanners/minecraft-status";
import { MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import {
  createFixtureHytaleAdapter,
  HYTALE_STATUS_FIXTURES,
  LiveHytaleStatusAdapter
} from "@mcbanners/hytale-status";
import { MemoryCache } from "@mcbanners/cache";
import { loadApiRuntimeConfig } from "@mcbanners/config";
import { logger } from "@mcbanners/logger";
import { validateAssetFiles } from "@mcbanners/banner-renderer/assets";
import {
  checkSavedBannerDb,
  createSavedBannerDb,
  createSavedBannerRepository,
  destroySavedBannerDb,
  type SavedBannerRepository
} from "@mcbanners/db";
import {
  SpigotResourceClient,
  ModrinthResourceClient,
  CurseForgeResourceClient,
  HangarResourceClient,
  OreResourceClient,
  BuiltByBitResourceClient,
  PolymartResourceClient
} from "@mcbanners/external-clients";

const isDev = process.env.NODE_ENV !== "production";
const runtimeConfig = loadApiRuntimeConfig();

try {
  await validateAssetFiles();
} catch (error) {
  logger.fatal({ error }, "Renderer asset validation failed during startup");
  process.exit(1);
}

const minecraftAdapter = isDev
  ? createFixtureAdapter(MC_STATUS_FIXTURES)
  : new LiveMinecraftStatusAdapter();
const hytaleAdapter = isDev
  ? createFixtureHytaleAdapter(HYTALE_STATUS_FIXTURES)
  : new LiveHytaleStatusAdapter();

const { cacheTtl } = runtimeConfig;
const mcStatusCache = new MemoryCache({ ttlMs: cacheTtl.minecraftStatusMs, maxEntries: 500 });
const bannerImageCache = new MemoryCache({
  ttlMs: cacheTtl.serverBannerImageMs,
  maxEntries: 200,
  maxBytes: 50_000_000
});
const resourceDataCache = new MemoryCache({
  ttlMs: cacheTtl.marketplaceResourceMs,
  maxEntries: 500
});
const resourceBannerImageCache = new MemoryCache({
  ttlMs: cacheTtl.resourceBannerImageMs,
  maxEntries: 200,
  maxBytes: 50_000_000
});
const authorDataCache = new MemoryCache({ ttlMs: cacheTtl.marketplaceAuthorMs, maxEntries: 500 });
const authorBannerImageCache = new MemoryCache({
  ttlMs: cacheTtl.authorBannerImageMs,
  maxEntries: 200,
  maxBytes: 50_000_000
});
const memberDataCache = new MemoryCache({ ttlMs: cacheTtl.marketplaceMemberMs, maxEntries: 500 });
const memberBannerImageCache = new MemoryCache({
  ttlMs: cacheTtl.memberBannerImageMs,
  maxEntries: 200,
  maxBytes: 50_000_000
});
const teamDataCache = new MemoryCache({ ttlMs: cacheTtl.marketplaceTeamMs, maxEntries: 500 });
const teamBannerImageCache = new MemoryCache({
  ttlMs: cacheTtl.teamBannerImageMs,
  maxEntries: 200,
  maxBytes: 50_000_000
});

const resourceClients = {
  SPIGOT: new SpigotResourceClient(),
  MODRINTH: new ModrinthResourceClient(),
  CURSEFORGE: new CurseForgeResourceClient(),
  HANGAR: new HangarResourceClient(),
  ORE: new OreResourceClient(),
  BUILTBYBIT: new BuiltByBitResourceClient(
    process.env["BUILTBYBIT_API_KEY"] ? { apiKey: process.env["BUILTBYBIT_API_KEY"] } : {}
  ),
  POLYMART: new PolymartResourceClient()
};

const savedBannerDb = runtimeConfig.savedBannerDb.enabled
  ? createSavedBannerDb(runtimeConfig.savedBannerDb.connection)
  : null;
const savedBannerRepository: SavedBannerRepository | null =
  savedBannerDb === null ? null : createSavedBannerRepository(savedBannerDb);

const startTime = Date.now();

const appMetrics: AppMetrics | undefined = runtimeConfig.metricsEnabled
  ? {
      getSnapshot: (): MetricsSnapshot => ({
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        caches: {
          mcStatus: mcStatusCache.stats(),
          bannerImage: bannerImageCache.stats(),
          resourceData: resourceDataCache.stats(),
          resourceBannerImage: resourceBannerImageCache.stats(),
          authorData: authorDataCache.stats(),
          authorBannerImage: authorBannerImageCache.stats(),
          memberData: memberDataCache.stats(),
          memberBannerImage: memberBannerImageCache.stats(),
          teamData: teamDataCache.stats(),
          teamBannerImage: teamBannerImageCache.stats()
        }
      })
    }
  : undefined;

const appOptions: AppOptions | undefined = runtimeConfig.rateLimit.enabled
  ? {
      hytaleAdapter,
      rateLimit: {
        windowMs: runtimeConfig.rateLimit.windowMs,
        maxRequests: runtimeConfig.rateLimit.maxRequests
      }
    }
  : { hytaleAdapter };

const app = createApp(
  minecraftAdapter,
  resourceClients,
  {
    mcStatus: mcStatusCache,
    bannerImage: bannerImageCache,
    resourceData: resourceDataCache,
    resourceBannerImage: resourceBannerImageCache,
    authorData: authorDataCache,
    authorBannerImage: authorBannerImageCache,
    memberData: memberDataCache,
    memberBannerImage: memberBannerImageCache,
    teamData: teamDataCache,
    teamBannerImage: teamBannerImageCache
  },
  {
    savedBanners: savedBannerRepository
  },
  resourceClients,
  { BUILTBYBIT: resourceClients.BUILTBYBIT },
  { POLYMART: resourceClients.POLYMART },
  {
    rendererAssets: async () => {
      await validateAssetFiles();
    },
    savedBannerDb: {
      enabled: savedBannerDb !== null,
      ...(savedBannerDb === null
        ? {}
        : {
            check: async () => {
              await checkSavedBannerDb(savedBannerDb);
            }
          })
    }
  },
  appMetrics,
  appOptions
);

logger.info(
  {
    port: runtimeConfig.port,
    savedBannerDbEnabled: runtimeConfig.savedBannerDb.enabled,
    rendererAssetsValidated: true,
    savedRouteDbAvailability: savedBannerRepository === null ? "unavailable" : "configured",
    rateLimitEnabled: runtimeConfig.rateLimit.enabled,
    metricsEnabled: runtimeConfig.metricsEnabled
  },
  "API runtime configured"
);

const server = Bun.serve({
  port: runtimeConfig.port,
  fetch: app.fetch
});

const shutdown = async (): Promise<void> => {
  logger.info("Shutdown signal received, stopping server");
  await server.stop(true);
  if (savedBannerDb !== null) {
    await destroySavedBannerDb(savedBannerDb);
  }
  logger.info("Shutdown complete");
};

process.once("SIGINT", () => {
  void shutdown().finally(() => {
    process.exit(0);
  });
});

process.once("SIGTERM", () => {
  void shutdown().finally(() => {
    process.exit(0);
  });
});
