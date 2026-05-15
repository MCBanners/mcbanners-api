import { Hono } from "hono";
import type { MinecraftStatusAdapter } from "@mcbanners/minecraft-status";
import type { MemoryCache } from "@mcbanners/cache";
import type { SavedBannerRepository } from "@mcbanners/db";
import { CachedMinecraftStatusAdapter } from "./cached-mc-adapter";
import { createMcServerRoute } from "./routes/mc-server";
import { createServerBannerRoute } from "./routes/server-banner";
import { createResourceBannerRoute, type ResourceClients } from "./routes/resource-banner";
import { createSavedBannerRoute, createUnavailableSavedBannerRoute } from "./routes/saved-banner";

/**
 * Optional caches injected into the app for production use.
 * Tests omit this to keep behaviour synchronous and deterministic.
 */
export interface AppCaches {
  /** In-memory cache for Minecraft status responses (TTL 30 s). */
  mcStatus?: MemoryCache;
  /** In-memory cache for rendered banner image Buffers (TTL 60 s). */
  bannerImage?: MemoryCache;
  /** In-memory cache for rendered resource banner image Buffers (TTL 60 s). */
  resourceBannerImage?: MemoryCache;
}

export type { ResourceClients };

export interface AppRepositories {
  savedBanners?: SavedBannerRepository | null;
}

/**
 * Creates the main Hono application with all routes mounted.
 *
 * @param minecraftAdapter - The adapter used to resolve Minecraft server status.
 * @param resourceClients - Map of platform name (uppercase) to ResourceClient.
 * @param caches - Optional in-memory caches. When omitted all requests are
 *   passed through to the adapter and renderer without caching.
 */
export const createApp = (
  minecraftAdapter: MinecraftStatusAdapter,
  resourceClients: ResourceClients,
  caches?: AppCaches,
  repositories?: AppRepositories
): Hono => {
  const app = new Hono();

  // Wrap adapter with cache when provided.
  const mcAdapter: MinecraftStatusAdapter =
    caches?.mcStatus !== undefined
      ? new CachedMinecraftStatusAdapter(minecraftAdapter, caches.mcStatus)
      : minecraftAdapter;

  app.get("/health", (c) =>
    c.json({
      service: "mcbanners-api-next",
      status: "ok"
    })
  );

  app.route("/mc", createMcServerRoute(mcAdapter));

  // Public compatibility route — matches legacy banner-api GET /server/:host/:port/...
  app.route("/banner/server", createServerBannerRoute(mcAdapter, caches?.bannerImage));

  // Internal dev alias (not part of the public API contract)
  app.route("/server", createServerBannerRoute(mcAdapter, caches?.bannerImage));

  app.route(
    "/banner/resource",
    createResourceBannerRoute(resourceClients, caches?.resourceBannerImage)
  );

  if (repositories?.savedBanners === null) {
    app.route("/banner/saved", createUnavailableSavedBannerRoute());
  } else if (repositories?.savedBanners !== undefined) {
    app.route(
      "/banner/saved",
      createSavedBannerRoute(repositories.savedBanners, mcAdapter, resourceClients)
    );
  }

  return app;
};
