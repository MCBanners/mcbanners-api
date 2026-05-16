import { Hono } from "hono";
import type { MemoryCache } from "@mcbanners/cache";
import {
  buildMemberBannerNodes,
  createCanvasSurface,
  encodeJpg,
  encodePng,
  MEMBER_BANNER_HEIGHT,
  MEMBER_BANNER_WIDTH,
  parseMemberBannerSettings,
  registerRendererFonts,
  renderNode
} from "@mcbanners/banner-renderer";
import { normalizeResourceId, type MemberClient } from "@mcbanners/external-clients";
import { extractRouteRemainder, parseResourceRoutePath } from "./resource-route-parser";

const BANNER_FILENAME_RE = /^banner\.(png|jpg)$/i;

export type MemberClients = Record<string, MemberClient>;

let fontsRegistered = false;
const ensureFonts = (): void => {
  if (!fontsRegistered) {
    registerRendererFonts();
    fontsRegistered = true;
  }
};

export const buildMemberBannerCacheKey = (
  platform: string,
  id: string,
  outputType: string,
  rawQuery: Record<string, string>
): string => {
  const queryKey = Object.entries(rawQuery)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  return `banner:member:${platform.toLowerCase()}:${normalizeResourceId(platform, id)}:${outputType.toLowerCase()}:${queryKey}`;
};

export const createMemberBannerRoute = (
  clients: MemberClients,
  memberCache?: MemoryCache,
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
    const getMember = () =>
      client === undefined
        ? Promise.resolve(null)
        : memberCache !== undefined
          ? memberCache.getOrSet(
              `member:${platform.toLowerCase()}:${normalizedId}`,
              () => client.getMemberBannerData(normalizedId),
              { cacheNull: false }
            )
          : client.getMemberBannerData(normalizedId);

    if (action === "isValid") {
      const data = await getMember();
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

    const data = await getMember();
    if (data === null) return c.body(null, 404);

    ensureFonts();
    const outputType = match[1].toLowerCase();
    const rawQuery = Object.fromEntries(new URL(c.req.url).searchParams.entries());
    const renderBanner = async (): Promise<Buffer> => {
      const nodes = buildMemberBannerNodes(data, parseMemberBannerSettings(rawQuery));
      const surface = createCanvasSurface(MEMBER_BANNER_WIDTH, MEMBER_BANNER_HEIGHT);
      for (const node of nodes) await renderNode(surface, node);
      return outputType === "jpg" ? encodeJpg(surface) : encodePng(surface);
    };

    const buf =
      bannerCache !== undefined
        ? await bannerCache.getOrSet(
            buildMemberBannerCacheKey(platform, normalizedId, outputType, rawQuery),
            renderBanner,
            { byteEstimate: (b) => b.length }
          )
        : await renderBanner();

    return new Response(buf, {
      headers: {
        "Content-Type": outputType === "jpg" ? "image/jpeg" : "image/png",
        "Content-Length": String(buf.length),
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
      }
    });
  });

  return route;
};
