import { Hono } from "hono";
import {
  buildServerBannerNodes,
  mapStatusToServerBannerData,
  parseServerBannerSettings
} from "@mcbanners/banner-renderer";
import {
  createCanvasSurface,
  encodePng,
  encodeJpg,
  renderNode,
  registerRendererFonts
} from "@mcbanners/banner-renderer";
import { SERVER_BANNER_WIDTH, SERVER_BANNER_HEIGHT } from "@mcbanners/banner-renderer";
import type { MinecraftStatusAdapter } from "@mcbanners/minecraft-status";

/** Matches `banner.png` or `banner.jpg` (case-insensitive). */
const BANNER_FILENAME_RE = /^banner\.(png|jpg)$/i;

let fontsRegistered = false;
const ensureFonts = (): void => {
  if (!fontsRegistered) {
    registerRendererFonts();
    fontsRegistered = true;
  }
};

/**
 * Mounts server banner routes:
 *
 * - GET /:host/:port/isValid             → { valid: boolean }
 * - GET /:host/:port/banner.:outputType  → PNG or JPG image
 *
 * Compatible with the legacy banner-api ServerController behavior.
 *
 * Note: The filename-based route /:host/:port/:bannerFile is used instead of
 * /:host/:port/banner.:outputType because Hono does not parse path parameters
 * that follow a literal dot within the same segment.
 */
export const createServerBannerRoute = (adapter: MinecraftStatusAdapter): Hono => {
  const route = new Hono();

  route.get("/:host/:port/isValid", async (c) => {
    const { host, port: portStr } = c.req.param();
    const port = parseInt(portStr, 10);
    if (isNaN(port)) {
      return c.json({ valid: false });
    }
    const status = await adapter.getStatus(host, port);
    return c.json({ valid: status !== null });
  });

  // Handles /banner.png and /banner.jpg — must come after /isValid.
  route.get("/:host/:port/:bannerFile", async (c) => {
    const { host, port: portStr, bannerFile } = c.req.param();

    const match = BANNER_FILENAME_RE.exec(bannerFile);
    if (!match?.[1]) {
      return c.json(
        { error: `Unsupported filename: ${bannerFile}. Expected banner.png or banner.jpg.` },
        400
      );
    }
    const outputType = match[1].toLowerCase(); // "png" or "jpg"

    const port = parseInt(portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return c.json({ error: "Invalid port" }, 400);
    }

    const status = await adapter.getStatus(host, port);
    if (status === null) {
      return c.body(null, 404);
    }

    ensureFonts();

    const data = mapStatusToServerBannerData(status);
    const rawQuery = Object.fromEntries(new URL(c.req.url).searchParams.entries());
    const settings = parseServerBannerSettings(rawQuery);
    const nodes = buildServerBannerNodes(data, settings);

    const surface = createCanvasSurface(SERVER_BANNER_WIDTH, SERVER_BANNER_HEIGHT);
    for (const node of nodes) {
      await renderNode(surface, node);
    }

    if (outputType === "jpg") {
      const buf = await encodeJpg(surface);
      return new Response(buf, {
        headers: { "Content-Type": "image/jpeg", "Content-Length": String(buf.length) }
      });
    }

    const buf = await encodePng(surface);
    return new Response(buf, {
      headers: { "Content-Type": "image/png", "Content-Length": String(buf.length) }
    });
  });

  return route;
};
