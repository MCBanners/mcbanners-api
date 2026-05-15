import { Hono } from "hono";
import type { MinecraftStatusAdapter } from "@mcbanners/minecraft-status";

/**
 * GET /mc/server?host=<host>&port=<port>
 *
 * Returns the raw normalized Minecraft server status as JSON.
 * Mirrors the mc-api GET /server interface for compatibility.
 */
export const createMcServerRoute = (adapter: MinecraftStatusAdapter): Hono => {
  const route = new Hono();

  route.get("/server", async (c) => {
    const host = c.req.query("host");
    const portStr = c.req.query("port");

    if (!host) {
      return c.json({ error: "Missing required query parameter: host" }, 400);
    }

    const port = portStr !== undefined ? parseInt(portStr, 10) : 25565;
    if (isNaN(port) || port < 1 || port > 65535) {
      return c.json({ error: "Invalid port" }, 400);
    }

    const status = await adapter.getStatus(host, port);
    if (status === null) {
      return c.json({ error: "Server not found" }, 404);
    }

    return c.json(status);
  });

  return route;
};
