import {
  buildTeamBannerNodes,
  createCanvasSurface,
  encodeJpg,
  encodePng,
  parseBannerStyleSettings,
  parseTeamBannerSettings,
  registerRendererFonts,
  renderNode,
  TEAM_BANNER_HEIGHT,
  TEAM_BANNER_WIDTH,
  validateBannerStyleSettings
} from "@mcbanners/banner-renderer";
import type { MemoryCache } from "@mcbanners/cache";
import { normalizeResourceId, type TeamClient } from "@mcbanners/external-clients";
import { Hono } from "hono";
import {
  bannerImageResponse,
  getBannerImageRemainingTtlMs,
  getOrRenderBannerImage,
  getSourceWithFreshness,
  readWarmBannerImage
} from "./banner-image-cache";
import { extractRouteRemainder, parseResourceRoutePath } from "./resource-route-parser";

const BANNER_FILENAME_RE = /^banner\.(png|jpg)$/i;

export type TeamClients = Record<string, TeamClient>;

let fontsRegistered = false;
const ensureFonts = (): void => {
  if (!fontsRegistered) {
    registerRendererFonts();
    fontsRegistered = true;
  }
};

export const buildTeamBannerCacheKey = (
  platform: string,
  id: string,
  outputType: string,
  rawQuery: Record<string, string>
): string => {
  const queryKey = Object.entries(rawQuery)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  return `banner:team:${platform.toLowerCase()}:${normalizeResourceId(platform, id)}:${outputType.toLowerCase()}:${queryKey}`;
};

export const createTeamBannerRoute = (
  clients: TeamClients,
  teamCache?: MemoryCache,
  bannerCache?: MemoryCache
): Hono => {
  const route = new Hono();

  route.get("/:platform/*", async (c) => {
    const { platform: rawPlatform } = c.req.param();
    const platform = rawPlatform.toUpperCase();
    const client = clients[platform];
    const pathname = new URL(c.req.url).pathname;
    const remainder = extractRouteRemainder(pathname, rawPlatform);
    if (remainder === null) return c.json({ error: "Not found" }, 404);

    const parts = parseResourceRoutePath(remainder);
    if (parts === null) return c.json({ error: "Not found" }, 404);

    const { id, action } = parts;
    const normalizedId = normalizeResourceId(platform, id);
    const sourceKey = `team:${platform.toLowerCase()}:${normalizedId}`;
    const readSourceFreshness = () => teamCache?.getEntryFreshness(sourceKey);
    const getTeam = () =>
      client === undefined
        ? Promise.resolve(null)
        : getSourceWithFreshness(teamCache, sourceKey, () =>
            client.getTeamBannerData(normalizedId)
          ).then(({ value }) => value);

    if (action === "isValid") {
      const data = await getTeam();
      const res = c.json({ valid: data !== null });
      res.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      return res;
    }

    const match = BANNER_FILENAME_RE.exec(action);
    if (!match?.[1]) {
      return c.json(
        { error: `Unsupported filename: ${action}. Expected banner.png or banner.jpg.` },
        400
      );
    }
    if (client === undefined)
      return c.json({ error: `Unsupported platform: ${rawPlatform}.` }, 404);

    const outputType = match[1].toLowerCase();
    const rawQuery = Object.fromEntries(new URL(c.req.url).searchParams.entries());
    const sourceFreshness = readSourceFreshness();

    if (sourceFreshness !== undefined) {
      ensureFonts();
      const styleErrors = validateBannerStyleSettings(rawQuery);
      if (styleErrors.length > 0) return c.json({ errors: styleErrors }, 400);

      const warm = readWarmBannerImage(
        bannerCache,
        buildTeamBannerCacheKey(platform, normalizedId, outputType, rawQuery),
        sourceFreshness
      );
      if (warm !== undefined) {
        return bannerImageResponse(warm.image, outputType, warm.remainingTtlMs);
      }
    }

    const { value: data, token: sourceToken } =
      client === undefined
        ? { value: null, token: undefined }
        : await getSourceWithFreshness(teamCache, sourceKey, () =>
            client.getTeamBannerData(normalizedId)
          );
    if (data === null) return c.body(null, 404);

    ensureFonts();

    const styleErrors = validateBannerStyleSettings(rawQuery);
    if (styleErrors.length > 0) {
      return c.json({ errors: styleErrors }, 400);
    }
    const style = parseBannerStyleSettings(rawQuery) ?? undefined;

    const renderBanner = async (): Promise<Buffer> => {
      const nodes = buildTeamBannerNodes(data, parseTeamBannerSettings(rawQuery), style);
      const surface = createCanvasSurface(TEAM_BANNER_WIDTH, TEAM_BANNER_HEIGHT);
      for (const node of nodes) await renderNode(surface, node);
      return outputType === "jpg" ? encodeJpg(surface) : encodePng(surface);
    };

    const imageKey = buildTeamBannerCacheKey(platform, normalizedId, outputType, rawQuery);
    const buf = await getOrRenderBannerImage(
      bannerCache,
      imageKey,
      renderBanner,
      sourceToken,
      teamCache === undefined ? undefined : readSourceFreshness
    );
    const currentSource = readSourceFreshness();
    const sourceStillCurrent =
      teamCache === undefined ||
      (sourceToken !== undefined && currentSource?.token === sourceToken);
    if (!sourceStillCurrent) bannerCache?.delete(imageKey);

    return bannerImageResponse(
      buf,
      outputType,
      getBannerImageRemainingTtlMs(bannerCache, imageKey, currentSource?.remainingTtlMs),
      sourceStillCurrent
    );
  });

  return route;
};
