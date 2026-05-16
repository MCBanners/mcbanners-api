import { createApp } from "./app";
import { createFixtureAdapter, LiveMinecraftStatusAdapter } from "@mcbanners/minecraft-status";
import { MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
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

const mcStatusCache = new MemoryCache({ ttlMs: 30_000, maxEntries: 500 });
const bannerImageCache = new MemoryCache({ ttlMs: 60_000, maxEntries: 200, maxBytes: 50_000_000 });
const resourceBannerImageCache = new MemoryCache({
  ttlMs: 60_000,
  maxEntries: 200,
  maxBytes: 50_000_000
});
const authorDataCache = new MemoryCache({ ttlMs: 30_000, maxEntries: 500 });
const authorBannerImageCache = new MemoryCache({
  ttlMs: 60_000,
  maxEntries: 200,
  maxBytes: 50_000_000
});
const memberDataCache = new MemoryCache({ ttlMs: 30_000, maxEntries: 500 });
const memberBannerImageCache = new MemoryCache({
  ttlMs: 60_000,
  maxEntries: 200,
  maxBytes: 50_000_000
});
const teamDataCache = new MemoryCache({ ttlMs: 30_000, maxEntries: 500 });
const teamBannerImageCache = new MemoryCache({
  ttlMs: 60_000,
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

if (savedBannerDb !== null) {
  const shutdown = async (): Promise<void> => {
    await destroySavedBannerDb(savedBannerDb);
  };

  process.once("beforeExit", () => {
    void shutdown();
  });
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
}

const app = createApp(
  minecraftAdapter,
  resourceClients,
  {
    mcStatus: mcStatusCache,
    bannerImage: bannerImageCache,
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
  }
);

logger.info(
  {
    port: runtimeConfig.port,
    savedBannerDbEnabled: runtimeConfig.savedBannerDb.enabled,
    rendererAssetsValidated: true,
    savedRouteDbAvailability: savedBannerRepository === null ? "unavailable" : "configured"
  },
  "API runtime configured"
);

export default {
  port: runtimeConfig.port,
  fetch: app.fetch
};
