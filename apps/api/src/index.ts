import { createApp } from "./app";
import { createFixtureAdapter, LiveMinecraftStatusAdapter } from "@mcbanners/minecraft-status";
import { MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import { MemoryCache } from "@mcbanners/cache";

const isDev = process.env.NODE_ENV !== "production";

const minecraftAdapter = isDev
  ? createFixtureAdapter(MC_STATUS_FIXTURES)
  : new LiveMinecraftStatusAdapter();

const mcStatusCache = new MemoryCache({ ttlMs: 30_000, maxEntries: 500 });
const bannerImageCache = new MemoryCache({ ttlMs: 60_000, maxEntries: 200, maxBytes: 50_000_000 });

const app = createApp(minecraftAdapter, {
  mcStatus: mcStatusCache,
  bannerImage: bannerImageCache
});

export default app;
