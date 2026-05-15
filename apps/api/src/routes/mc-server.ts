import { Hono } from "hono";
import type { MinecraftStatusAdapter } from "@mcbanners/minecraft-status";

/**
 * Mounts mc-api-compatible routes under /mc:
 *
 * - GET /server?host=&port=  → normalized MinecraftServerStatus JSON
 * - GET /icon?host=&port=    → raw PNG bytes decoded from iconDataUrl, or 404
 */
export const createMcServerRoute = (adapter: MinecraftStatusAdapter): Hono => {
  const route = new Hono();

  /**
   * GET /mc/server?host=<host>&port=<port>
   *
   * Returns the raw normalized Minecraft server status as JSON.
   * Mirrors the mc-api GET /server interface for compatibility.
   */
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

    return c.json(status, 200, {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60"
    });
  });

  /**
   * GET /mc/icon?host=<host>&port=<port>
   *
   * Returns the server icon as raw PNG bytes decoded from the base64 iconDataUrl.
   * Returns 404 when the server is not found or has no icon.
   *
   * Mirrors the legacy mc-api GET /icon behavior.
   * Note: empty/absent icons return 404 (not 204) for compatibility with clients
   * that expect a PNG or nothing.
   */
  route.get("/icon", async (c) => {
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
      return c.body(null, 404);
    }

    const { iconDataUrl } = status;
    if (iconDataUrl === null) {
      return c.body(null, 404);
    }

    // Strip "data:image/png;base64," prefix and decode to raw bytes.
    const base64 = iconDataUrl.replace(/^data:image\/png;base64,/, "");
    const bytes = Buffer.from(base64, "base64");

    return new Response(bytes, {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600"
      }
    });
  });

  return route;
};
