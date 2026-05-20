import { Hono, type Context } from "hono";
import {
  buildServerBannerNodes,
  mapHytaleStatusToServerBannerData,
  mapStatusToServerBannerData,
  parseServerBannerSettings,
  createCanvasSurface,
  encodePng,
  encodeJpg,
  renderNode,
  registerRendererFonts,
  SERVER_BANNER_WIDTH,
  SERVER_BANNER_HEIGHT,
  validateBannerStyleSettings,
  parseBannerStyleSettings
} from "@mcbanners/banner-renderer";
import type { MinecraftStatusAdapter, MinecraftServerStatus } from "@mcbanners/minecraft-status";
import type { HytaleServerStatus, HytaleStatusAdapter } from "@mcbanners/hytale-status";
import type { MemoryCache } from "@mcbanners/cache";

/** Matches `banner.png` or `banner.jpg` (case-insensitive). */
const BANNER_FILENAME_RE = /^banner\.(png|jpg)$/i;

type ServerBannerGame = "minecraft" | "hytale";

interface ServerBannerRouteOptions {
  readonly minecraftAdapter: MinecraftStatusAdapter;
  readonly hytaleAdapter: HytaleStatusAdapter;
  readonly bannerCache?: MemoryCache | undefined;
}

interface ServerBannerRequest {
  readonly game: ServerBannerGame;
  readonly host: string;
  readonly portStr: string;
}

type ServerBannerContext = Context;

let fontsRegistered = false;
const ensureFonts = (): void => {
  if (!fontsRegistered) {
    registerRendererFonts();
    fontsRegistered = true;
  }
};

const parseExplicitGame = (game: string): ServerBannerGame | null => {
  if (game === "minecraft" || game === "hytale") return game;
  return null;
};

/**
 * Builds a deterministic cache key for a rendered banner.
 *
 * Normalization rules:
 * - `game` is the normalized route game, so legacy and explicit Minecraft share a key
 * - `host` is lowercased because DNS hostnames are case-insensitive
 * - `outputType` is lowercased
 * - Query params are sorted alphabetically
 */
const buildBannerCacheKey = (
  game: ServerBannerGame,
  host: string,
  port: number,
  outputType: string,
  rawQuery: Record<string, string>
): string => {
  const queryKey = Object.entries(rawQuery)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `banner:server:${game}:${host.toLowerCase()}:${String(port)}:${outputType.toLowerCase()}:${queryKey}`;
};

/**
 * Mounts server banner routes:
 *
 * - GET /:host/:port/isValid                       -> legacy Minecraft
 * - GET /:host/:port/banner.:outputType            -> legacy Minecraft
 * - GET /minecraft/:host/:port/isValid             -> explicit Minecraft
 * - GET /minecraft/:host/:port/banner.:outputType  -> explicit Minecraft
 * - GET /hytale/:host/:port/isValid                -> explicit Hytale
 * - GET /hytale/:host/:port/banner.:outputType     -> explicit Hytale
 */
export const createServerBannerRoute = ({
  minecraftAdapter,
  hytaleAdapter,
  bannerCache
}: ServerBannerRouteOptions): Hono => {
  const route = new Hono();

  const resolveStatus = async (
    game: ServerBannerGame,
    host: string,
    port: number
  ): Promise<
    | { readonly game: "minecraft"; readonly status: MinecraftServerStatus | null }
    | { readonly game: "hytale"; readonly status: HytaleServerStatus | null }
  > => {
    if (game === "hytale") {
      return { game, status: await hytaleAdapter.getStatus(host, port) };
    }
    return { game, status: await minecraftAdapter.getStatus(host, port) };
  };

  const handleIsValid = async (c: ServerBannerContext, request: ServerBannerRequest) => {
    const host = request.host.toLowerCase();
    const port = parseInt(request.portStr, 10);
    if (isNaN(port)) {
      return c.json({ valid: false });
    }

    const { status } = await resolveStatus(request.game, host, port);
    return c.json({ valid: status !== null });
  };

  const handleRender = async (c: ServerBannerContext, request: ServerBannerRequest) => {
    const { bannerFile } = c.req.param();
    if (bannerFile === undefined) {
      return c.body(null, 404);
    }
    const host = request.host.toLowerCase();

    const match = BANNER_FILENAME_RE.exec(bannerFile);
    if (!match?.[1]) {
      return c.json(
        { error: `Unsupported filename: ${bannerFile}. Expected banner.png or banner.jpg.` },
        400
      );
    }
    const outputType = match[1].toLowerCase();

    const port = parseInt(request.portStr, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return c.json({ error: "Invalid port" }, 400);
    }

    const resolved = await resolveStatus(request.game, host, port);
    if (resolved.status === null) {
      return c.body(null, 404);
    }
    const bannerData =
      resolved.game === "hytale"
        ? mapHytaleStatusToServerBannerData(resolved.status)
        : mapStatusToServerBannerData(resolved.status);

    ensureFonts();

    const rawQuery = Object.fromEntries(new URL(c.req.url).searchParams.entries());
    const styleErrors = validateBannerStyleSettings(rawQuery);
    if (styleErrors.length > 0) {
      return c.json({ errors: styleErrors }, 400);
    }
    const style = parseBannerStyleSettings(rawQuery) ?? undefined;

    const renderBanner = async (): Promise<Buffer> => {
      const settings = parseServerBannerSettings(rawQuery);
      const nodes = buildServerBannerNodes(bannerData, settings, style);

      const surface = createCanvasSurface(SERVER_BANNER_WIDTH, SERVER_BANNER_HEIGHT);
      for (const node of nodes) {
        await renderNode(surface, node);
      }

      return outputType === "jpg" ? encodeJpg(surface) : encodePng(surface);
    };

    const buf =
      bannerCache !== undefined
        ? await bannerCache.getOrSet<Buffer>(
            buildBannerCacheKey(request.game, host, port, outputType, rawQuery),
            renderBanner,
            { byteEstimate: (b) => b.length }
          )
        : await renderBanner();

    const contentType = outputType === "jpg" ? "image/jpeg" : "image/png";
    return new Response(buf, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buf.length),
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
      }
    });
  };

  route.get("/:game/:host/:port/isValid", async (c) => {
    const { game: rawGame, host, port: portStr } = c.req.param();
    const game = parseExplicitGame(rawGame);
    if (game === null) return c.body(null, 404);
    return handleIsValid(c, { game, host, portStr });
  });

  route.get("/:game/:host/:port/:bannerFile", async (c) => {
    const { game: rawGame, host, port: portStr } = c.req.param();
    const game = parseExplicitGame(rawGame);
    if (game === null) return c.body(null, 404);
    return handleRender(c, { game, host, portStr });
  });

  route.get("/:host/:port/isValid", async (c) => {
    const { host, port: portStr } = c.req.param();
    return handleIsValid(c, { game: "minecraft", host, portStr });
  });

  route.get("/:host/:port/:bannerFile", async (c) => {
    const { host, port: portStr } = c.req.param();
    return handleRender(c, { game: "minecraft", host, portStr });
  });

  return route;
};
