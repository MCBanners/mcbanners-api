import {
  buildResourceBannerNodes,
  createCanvasSurface,
  encodeJpg,
  encodePng,
  parseBannerStyleSettings,
  parseResourceBannerSettings,
  RESOURCE_BANNER_HEIGHT,
  RESOURCE_BANNER_WIDTH,
  registerRendererFonts,
  renderNode,
  validateBannerStyleSettings
} from "@mcbanners/banner-renderer";
import type { MemoryCache } from "@mcbanners/cache";
import { normalizeResourceId, type ResourceClient } from "@mcbanners/external-clients";
import { Hono } from "hono";
import {
  bannerImageResponse,
  getOrRenderBannerImage,
  getSourceWithFreshness,
  readWarmBannerImage
} from "./banner-image-cache";
import { extractRouteRemainder, parseResourceRoutePath } from "./resource-route-parser";

/** Matches `banner.png` or `banner.jpg` (case-insensitive). */
const BANNER_FILENAME_RE = /^banner\.(png|jpg)$/i;

const buildBannerCacheKey = (
  platform: string,
  id: string,
  outputType: string,
  rawQuery: Record<string, string>
): string => {
  const queryKey = Object.entries(rawQuery)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `banner:resource:${platform.toLowerCase()}:${normalizeResourceId(platform, id)}:${outputType.toLowerCase()}:${queryKey}`;
};

export type ResourceClients = Record<string, ResourceClient>;

let fontsRegistered = false;
const ensureFonts = (): void => {
  if (!fontsRegistered) {
    registerRendererFonts();
    fontsRegistered = true;
  }
};

export const createResourceBannerRoute = (
  clients: ResourceClients,
  bannerCache?: MemoryCache,
  dataCache?: MemoryCache
): Hono => {
  const route = new Hono();

  const fetchResourceData = (client: ResourceClient, platform: string, normalizedId: string) => {
    return getSourceWithFreshness(
      dataCache,
      `resource:${platform.toLowerCase()}:${normalizedId}`,
      () => client.getResourceBannerData(normalizedId)
    ).then(({ value }) => value);
  };

  /**
   * Unified wildcard handler for both `isValid` and `banner.(png|jpg)`.
   *
   * Supports single-segment IDs (Spigot, Modrinth, CurseForge, Ore) and
   * multi-segment IDs (Hangar `author/slug`). The last path segment is always
   * the action; everything before it is the resource ID.
   */
  route.get("/:platform/*", async (c) => {
    const { platform: rawPlatform } = c.req.param();
    const platform = rawPlatform.toUpperCase();
    const client = clients[platform];

    // Extract the sub-path after the platform segment from the full URL.
    const pathname = new URL(c.req.url).pathname;
    const remainder = extractRouteRemainder(pathname, rawPlatform);
    if (remainder === null) {
      return c.json({ error: "Not found" }, 404);
    }

    const parts = parseResourceRoutePath(remainder);
    if (parts === null) {
      return c.json({ error: "Not found" }, 404);
    }
    const { id, action } = parts;

    // ---- isValid ----
    if (action === "isValid") {
      if (client === undefined) {
        return c.json({ valid: false });
      }
      const normalizedId = normalizeResourceId(platform, id);
      const data = await fetchResourceData(client, platform, normalizedId);
      const res = c.json({ valid: data !== null });
      res.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      return res;
    }

    // ---- banner image ----
    const match = BANNER_FILENAME_RE.exec(action);
    if (!match?.[1]) {
      return c.json(
        { error: `Unsupported filename: ${action}. Expected banner.png or banner.jpg.` },
        400
      );
    }

    if (client === undefined) {
      return c.json({ error: `Unsupported platform: ${rawPlatform}.` }, 404);
    }

    const outputType = match[1].toLowerCase();
    const normalizedId = normalizeResourceId(platform, id);
    const rawQuery = Object.fromEntries(new URL(c.req.url).searchParams.entries());
    const sourceKey = `resource:${platform.toLowerCase()}:${normalizedId}`;
    const readSourceFreshness = () => dataCache?.getEntryFreshness(sourceKey);
    const sourceFreshness = readSourceFreshness();

    if (sourceFreshness !== undefined) {
      ensureFonts();
      const styleErrors = validateBannerStyleSettings(rawQuery);
      if (styleErrors.length > 0) return c.json({ errors: styleErrors }, 400);

      const warm = readWarmBannerImage(
        bannerCache,
        buildBannerCacheKey(platform, normalizedId, outputType, rawQuery),
        sourceFreshness
      );
      if (warm !== undefined) {
        return bannerImageResponse(warm.image, outputType, warm.remainingTtlMs);
      }
    }

    const { value: data, token: sourceToken } = await getSourceWithFreshness(
      dataCache,
      sourceKey,
      () => client.getResourceBannerData(normalizedId)
    );
    if (data === null) return c.body(null, 404);

    ensureFonts();

    const styleErrors = validateBannerStyleSettings(rawQuery);
    if (styleErrors.length > 0) {
      return c.json({ errors: styleErrors }, 400);
    }
    const style = parseBannerStyleSettings(rawQuery) ?? undefined;

    const renderBanner = async (): Promise<Buffer> => {
      const settings = parseResourceBannerSettings(rawQuery);
      const nodes = buildResourceBannerNodes(data, settings, style);
      const surface = createCanvasSurface(RESOURCE_BANNER_WIDTH, RESOURCE_BANNER_HEIGHT);
      for (const node of nodes) {
        await renderNode(surface, node);
      }
      return outputType === "jpg" ? encodeJpg(surface) : encodePng(surface);
    };

    const imageKey = buildBannerCacheKey(platform, normalizedId, outputType, rawQuery);
    const buf = await getOrRenderBannerImage(
      bannerCache,
      imageKey,
      renderBanner,
      sourceToken,
      dataCache === undefined ? undefined : readSourceFreshness
    );
    const currentSource = readSourceFreshness();
    const sourceStillCurrent =
      dataCache === undefined ||
      (sourceToken !== undefined && currentSource?.token === sourceToken);
    if (!sourceStillCurrent) bannerCache?.delete(imageKey);

    return bannerImageResponse(buf, outputType, currentSource?.remainingTtlMs, sourceStillCurrent);
  });

  return route;
};
