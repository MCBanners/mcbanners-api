import { createApp } from "./app";
import { createFixtureAdapter, LiveMinecraftStatusAdapter } from "@mcbanners/minecraft-status";
import { MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import { MemoryCache } from "@mcbanners/cache";
import { SpigotResourceClient, ModrinthResourceClient } from "@mcbanners/external-clients";

const isDev = process.env.NODE_ENV !== "production";

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

const resourceClients = {
  SPIGOT: new SpigotResourceClient(),
  MODRINTH: new ModrinthResourceClient()
};

const app = createApp(minecraftAdapter, resourceClients, {
  mcStatus: mcStatusCache,
  bannerImage: bannerImageCache,
  resourceBannerImage: resourceBannerImageCache
});

export default app;
