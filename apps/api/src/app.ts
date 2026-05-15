import { Hono } from "hono";
import type { MinecraftStatusAdapter } from "@mcbanners/minecraft-status";
import { createMcServerRoute } from "./routes/mc-server";
import { createServerBannerRoute } from "./routes/server-banner";

/**
 * Creates the main Hono application with all routes mounted.
 *
 * @param minecraftAdapter - The adapter used to resolve Minecraft server status.
 *   Pass a FixtureMinecraftStatusAdapter for local dev/tests, or a live HTTP
 *   adapter for production.
 */
export const createApp = (minecraftAdapter: MinecraftStatusAdapter): Hono => {
  const app = new Hono();

  app.get("/health", (c) =>
    c.json({
      service: "mcbanners-api-next",
      status: "ok"
    })
  );

  app.route("/mc", createMcServerRoute(minecraftAdapter));
  app.route("/server", createServerBannerRoute(minecraftAdapter));

  return app;
};
