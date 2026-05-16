import { Hono } from "hono";
import type { MinecraftStatusAdapter } from "@mcbanners/minecraft-status";
import type { MemoryCache } from "@mcbanners/cache";
import type { SavedBannerRepository } from "@mcbanners/db";
import { validateAssetFiles } from "@mcbanners/banner-renderer/assets";
import { CachedMinecraftStatusAdapter } from "./cached-mc-adapter";
import { createMcServerRoute } from "./routes/mc-server";
import { createServerBannerRoute } from "./routes/server-banner";
import { createResourceBannerRoute, type ResourceClients } from "./routes/resource-banner";
import { createAuthorBannerRoute, type AuthorClients } from "./routes/author-banner";
import { createMemberBannerRoute, type MemberClients } from "./routes/member-banner";
import { createTeamBannerRoute, type TeamClients } from "./routes/team-banner";
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
  /** In-memory cache for author lookup responses (TTL 30 s). */
  authorData?: MemoryCache;
  /** In-memory cache for rendered author banner image Buffers (TTL 60 s). */
  authorBannerImage?: MemoryCache;
  /** In-memory cache for BuiltByBit member lookup responses (TTL 30 s). */
  memberData?: MemoryCache;
  /** In-memory cache for rendered member banner image Buffers (TTL 60 s). */
  memberBannerImage?: MemoryCache;
  /** In-memory cache for Polymart team lookup responses (TTL 30 s). */
  teamData?: MemoryCache;
  /** In-memory cache for rendered team banner image Buffers (TTL 60 s). */
  teamBannerImage?: MemoryCache;
}

export type { ResourceClients };
export type { AuthorClients };
export type { MemberClients };
export type { TeamClients };

export interface AppRepositories {
  savedBanners?: SavedBannerRepository | null;
}

export interface AppReadiness {
  rendererAssets?: () => Promise<void>;
  savedBannerDb?: {
    readonly enabled: boolean;
    readonly check?: () => Promise<void>;
  };
}

interface ReadinessCheckStatus {
  readonly status: "ok" | "disabled" | "unavailable";
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
  repositories?: AppRepositories,
  authorClients?: AuthorClients,
  memberClients?: MemberClients,
  teamClients?: TeamClients,
  readiness?: AppReadiness
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

  app.get("/ready", async (c) => {
    const checks: {
      rendererAssets: ReadinessCheckStatus;
      savedBannerDb: ReadinessCheckStatus;
    } = {
      rendererAssets: { status: "ok" },
      savedBannerDb:
        readiness?.savedBannerDb?.enabled === true ? { status: "ok" } : { status: "disabled" }
    };

    try {
      if (readiness?.rendererAssets !== undefined) {
        await readiness.rendererAssets();
      } else {
        await validateAssetFiles();
      }
    } catch {
      checks.rendererAssets = { status: "unavailable" };
    }

    if (readiness?.savedBannerDb?.enabled === true) {
      try {
        await readiness.savedBannerDb.check?.();
      } catch {
        checks.savedBannerDb = { status: "unavailable" };
      }
    }

    const ready = Object.values(checks).every((check) => check.status !== "unavailable");

    return c.json(
      {
        service: "mcbanners-api-next",
        status: ready ? "ready" : "not-ready",
        checks
      },
      ready ? 200 : 503
    );
  });

  app.route("/mc", createMcServerRoute(mcAdapter));

  // Public compatibility route — matches legacy banner-api GET /server/:host/:port/...
  app.route("/banner/server", createServerBannerRoute(mcAdapter, caches?.bannerImage));

  // Internal dev alias (not part of the public API contract)
  app.route("/server", createServerBannerRoute(mcAdapter, caches?.bannerImage));

  app.route(
    "/banner/resource",
    createResourceBannerRoute(resourceClients, caches?.resourceBannerImage)
  );

  app.route(
    "/banner/author",
    createAuthorBannerRoute(authorClients ?? {}, caches?.authorData, caches?.authorBannerImage)
  );

  app.route(
    "/banner/member",
    createMemberBannerRoute(memberClients ?? {}, caches?.memberData, caches?.memberBannerImage)
  );

  app.route(
    "/banner/team",
    createTeamBannerRoute(teamClients ?? {}, caches?.teamData, caches?.teamBannerImage)
  );

  if (repositories?.savedBanners === null) {
    app.route("/banner/saved", createUnavailableSavedBannerRoute());
  } else if (repositories?.savedBanners !== undefined) {
    app.route(
      "/banner/saved",
      createSavedBannerRoute(
        repositories.savedBanners,
        mcAdapter,
        resourceClients,
        authorClients ?? {},
        memberClients ?? {},
        teamClients ?? {}
      )
    );
  }

  return app;
};
