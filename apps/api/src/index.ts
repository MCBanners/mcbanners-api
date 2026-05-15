import { createApp } from "./app";
import { createFixtureAdapter, LiveMinecraftStatusAdapter } from "@mcbanners/minecraft-status";
import { MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import { MemoryCache } from "@mcbanners/cache";
import { loadApiRuntimeConfig } from "@mcbanners/config";
import {
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
    authorBannerImage: authorBannerImageCache
  },
  {
    savedBanners: savedBannerRepository
  },
  resourceClients
);

export default app;
