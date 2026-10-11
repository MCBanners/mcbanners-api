import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { loadImage } from "@napi-rs/canvas";
import type { AuthorBannerData } from "../src/layouts/author/author-banner-data";
import { DEFAULT_AUTHOR_BANNER_SETTINGS } from "../src/layouts/author/author-banner-defaults";
import { buildAuthorBannerNodes } from "../src/layouts/author/author-banner-layout";
import type { MemberBannerData } from "../src/layouts/member/member-banner-data";
import { DEFAULT_MEMBER_BANNER_SETTINGS } from "../src/layouts/member/member-banner-defaults";
import { buildMemberBannerNodes } from "../src/layouts/member/member-banner-layout";
import type { ResourceBannerData } from "../src/layouts/resource/resource-banner-data";
import { DEFAULT_RESOURCE_BANNER_SETTINGS } from "../src/layouts/resource/resource-banner-defaults";
import { buildResourceBannerNodes } from "../src/layouts/resource/resource-banner-layout";
import type { ServerBannerData } from "../src/layouts/server/server-banner-data";
import { DEFAULT_SERVER_BANNER_SETTINGS } from "../src/layouts/server/server-banner-defaults";
import { buildServerBannerNodes } from "../src/layouts/server/server-banner-layout";
import type { TeamBannerData } from "../src/layouts/team/team-banner-data";
import { DEFAULT_TEAM_BANNER_SETTINGS } from "../src/layouts/team/team-banner-defaults";
import { buildTeamBannerNodes } from "../src/layouts/team/team-banner-layout";
import type { RenderNode } from "../src/nodes/render-node";
import { renderNode } from "../src/renderer/dispatch";
import { encodeJpg, encodePng } from "../src/renderer/encode";
import { registerRendererFonts } from "../src/renderer/font-registry";
import { createCanvasSurface } from "../src/renderer/surface";
import type { RenderSurface } from "../src/types/render-surface";

type BannerType = "server" | "resource" | "author" | "member" | "team";
type Stage =
  | "layout"
  | "surface"
  | "imageNodes"
  | "spriteNodes"
  | "textNodes"
  | "wrappedTextNodes"
  | "fillNodes"
  | "measureText"
  | "drawImage"
  | "fillText"
  | "fillRect"
  | "pngEncode"
  | "jpegEncode";

interface StageTotal {
  wallMs: number;
  cpuMs: number;
  calls: number;
}

const bannerType = process.argv[2] as BannerType | undefined;
if (!bannerType || !["server", "resource", "author", "member", "team"].includes(bannerType)) {
  throw new Error(
    "Usage: bun run packages/banner-renderer/bench/render-profile.ts <server|resource|author|member|team>"
  );
}

const warmRenders = Number(process.env.RENDER_BENCH_ITERATIONS ?? 40);
const logoBase64 = (
  await readFile(new URL("../assets/sprites/default_spigot_res_logo.png", import.meta.url))
).toString("base64");
const metrics = new Map<Stage, StageTotal>();
const nativeCalls = { measureText: 0, drawImage: 0, fillText: 0, fillRect: 0 };

const record = (stage: Stage, wallMs: number, cpuStart: NodeJS.CpuUsage): void => {
  const cpu = process.cpuUsage(cpuStart);
  const total = metrics.get(stage) ?? { wallMs: 0, cpuMs: 0, calls: 0 };
  total.wallMs += wallMs;
  total.cpuMs += (cpu.user + cpu.system) / 1000;
  total.calls += 1;
  metrics.set(stage, total);
};

const time = async <T>(stage: Stage, action: () => T | Promise<T>): Promise<T> => {
  const cpuStart = process.cpuUsage();
  const started = performance.now();
  const result = await action();
  record(stage, performance.now() - started, cpuStart);
  return result;
};

const makeDataAndNodes = (): { width: number; height: number; nodes: readonly RenderNode[] } => {
  switch (bannerType) {
    case "server": {
      const data: ServerBannerData = {
        name: "Example Network",
        version: "1.21.4",
        motd: "Welcome to our survival world with quests, events, and friendly players!",
        onlinePlayers: 12_345,
        maxPlayers: 50_000,
        iconBase64: logoBase64
      };
      return {
        width: 300,
        height: 100,
        nodes: buildServerBannerNodes(data, DEFAULT_SERVER_BANNER_SETTINGS)
      };
    }
    case "resource": {
      const data: ResourceBannerData = {
        resource: {
          name: "Example Resource Management and Gameplay Extension",
          logoBase64,
          downloadCount: 1_250_000,
          lastUpdated: "2025-08-20T12:00:00Z",
          rating: { count: 4320, average: 4.5 },
          price: null
        },
        author: { name: "ExampleAuthor" },
        backend: "SPIGOT"
      };
      return {
        width: 300,
        height: 100,
        nodes: buildResourceBannerNodes(data, DEFAULT_RESOURCE_BANNER_SETTINGS)
      };
    }
    case "author": {
      const data: AuthorBannerData = {
        author: {
          name: "ExampleAuthor",
          resourceCount: 42,
          logoBase64,
          downloadCount: 1_250_000,
          likes: 12_500,
          reviews: 320
        },
        backend: "SPIGOT"
      };
      return {
        width: 300,
        height: 100,
        nodes: buildAuthorBannerNodes(data, DEFAULT_AUTHOR_BANNER_SETTINGS)
      };
    }
    case "member": {
      const data: MemberBannerData = {
        member: {
          name: "ExampleMember",
          rank: "Administrator",
          joinDate: "2020-01-15",
          logoBase64,
          posts: 1234,
          positiveFeedback: 987,
          negativeFeedback: 12
        }
      };
      return {
        width: 300,
        height: 100,
        nodes: buildMemberBannerNodes(data, DEFAULT_MEMBER_BANNER_SETTINGS)
      };
    }
    case "team": {
      const data: TeamBannerData = {
        team: {
          name: "Example Team",
          logoBase64,
          resourceCount: 28,
          resourceDownloads: 5_500_000,
          resourceRatings: 1850,
          resourceAverageRating: 4.7
        }
      };
      return {
        width: 300,
        height: 100,
        nodes: buildTeamBannerNodes(data, DEFAULT_TEAM_BANNER_SETTINGS)
      };
    }
  }
};

const createProfileSurface = (width: number, height: number): RenderSurface => {
  const surface = createCanvasSurface(width, height);
  const context = new Proxy(surface.context, {
    get(target, property) {
      const value = Reflect.get(target, property, target) as unknown;
      if (
        typeof value !== "function" ||
        (property !== "measureText" &&
          property !== "drawImage" &&
          property !== "fillText" &&
          property !== "fillRect")
      ) {
        return typeof value === "function" ? value.bind(target) : value;
      }

      return (...args: unknown[]) => {
        nativeCalls[property] += 1;
        const cpuStart = process.cpuUsage();
        const started = performance.now();
        const result = Reflect.apply(value, target, args);
        record(property, performance.now() - started, cpuStart);
        return result;
      };
    },
    set(target, property, value) {
      return Reflect.set(target, property, value, target);
    }
  });
  return { ...surface, context };
};

const render = async (): Promise<{ png: Buffer; jpeg: Buffer }> => {
  const data = await time("layout", makeDataAndNodes);
  const surface = await time("surface", () => createProfileSurface(data.width, data.height));
  for (const node of data.nodes) {
    const stage: Stage =
      node.type === "image"
        ? "imageNodes"
        : node.type === "sprite"
          ? "spriteNodes"
          : node.type === "wrapped-text"
            ? "wrappedTextNodes"
            : node.type === "text"
              ? "textNodes"
              : "fillNodes";
    await time(stage, () => renderNode(surface, node));
  }
  const png = await time("pngEncode", () => encodePng(surface));
  const jpeg = await time("jpegEncode", () => encodeJpg(surface));
  return { png, jpeg };
};

const renderVariant = async (useInlineCache: boolean, format: "png" | "jpeg"): Promise<Buffer> => {
  const data = makeDataAndNodes();
  const surface = createCanvasSurface(data.width, data.height);
  for (const node of data.nodes) {
    if (!useInlineCache && node.type === "image" && node.imageData !== undefined) {
      const image = await loadImage(Buffer.from(node.imageData, "base64"));
      surface.context.drawImage(image, node.x, node.y, node.width, node.height);
    } else {
      await renderNode(surface, node);
    }
  }
  return format === "png" ? encodePng(surface) : encodeJpg(surface);
};

const compareInlineCache = async (format: "png" | "jpeg") => {
  await renderVariant(true, format);
  const totals = {
    before: { wallMs: 0, cpuMs: 0, heapDeltaBytes: 0, rssDeltaBytes: 0 },
    after: { wallMs: 0, cpuMs: 0, heapDeltaBytes: 0, rssDeltaBytes: 0 }
  };
  let beforeOutput = Buffer.alloc(0);
  let afterOutput = Buffer.alloc(0);

  for (let i = 0; i < warmRenders; i += 1) {
    const order = i % 2 === 0 ? ([false, true] as const) : ([true, false] as const);
    for (const useInlineCache of order) {
      const label = useInlineCache ? "after" : "before";
      const memoryBefore = process.memoryUsage();
      const cpuStart = process.cpuUsage();
      const started = performance.now();
      const output = await renderVariant(useInlineCache, format);
      totals[label].wallMs += performance.now() - started;
      const cpu = process.cpuUsage(cpuStart);
      totals[label].cpuMs += (cpu.user + cpu.system) / 1000;
      totals[label].heapDeltaBytes += process.memoryUsage().heapUsed - memoryBefore.heapUsed;
      totals[label].rssDeltaBytes += process.memoryUsage().rss - memoryBefore.rss;
      if (useInlineCache) afterOutput = output;
      else beforeOutput = output;
    }
  }

  const summarizeVariant = (label: "before" | "after") => ({
    wallMsPerRender: Number((totals[label].wallMs / warmRenders).toFixed(3)),
    cpuMsPerRender: Number((totals[label].cpuMs / warmRenders).toFixed(3)),
    meanHeapDeltaBytes: Math.round(totals[label].heapDeltaBytes / warmRenders),
    meanRssDeltaBytes: Math.round(totals[label].rssDeltaBytes / warmRenders)
  });

  return {
    format,
    rendersPerVariant: warmRenders,
    before: summarizeVariant("before"),
    after: summarizeVariant("after"),
    outputMatches: beforeOutput.equals(afterOutput),
    outputSha256: createHash("sha256").update(afterOutput).digest("hex")
  };
};

registerRendererFonts();
const coldMemoryBefore = process.memoryUsage();
const coldOutput = await render();
const coldMetrics = Object.fromEntries(metrics);
const coldMemoryAfter = process.memoryUsage();
metrics.clear();
const warmMemoryBefore = process.memoryUsage();
const warmCpuStart = process.cpuUsage();
const warmStart = performance.now();
let output = coldOutput;
for (let i = 0; i < warmRenders; i += 1) output = await render();
const warmWallMs = performance.now() - warmStart;
const warmCpu = process.cpuUsage(warmCpuStart);
const warmMetrics = Object.fromEntries(metrics);

const probeNode: RenderNode = {
  type: "image",
  x: 0,
  y: 0,
  width: 96,
  height: 96,
  imageData: logoBase64
};
const directProbeSurface = createCanvasSurface(96, 96);
const cachedProbeSurface = createCanvasSurface(96, 96);
await renderNode(cachedProbeSurface, probeNode);
const measureProbe = async (cached: boolean) => {
  const memoryBefore = process.memoryUsage();
  const cpuStart = process.cpuUsage();
  const started = performance.now();
  for (let i = 0; i < warmRenders; i += 1) {
    if (cached) {
      await renderNode(cachedProbeSurface, probeNode);
    } else {
      const image = await loadImage(Buffer.from(logoBase64, "base64"));
      directProbeSurface.context.drawImage(image, 0, 0, 96, 96);
    }
  }
  const wallMs = performance.now() - started;
  const cpu = process.cpuUsage(cpuStart);
  const memoryAfter = process.memoryUsage();
  return {
    wallMsPerImage: Number((wallMs / warmRenders).toFixed(4)),
    cpuMsPerImage: Number(((cpu.user + cpu.system) / 1000 / warmRenders).toFixed(4)),
    heapDeltaBytes: memoryAfter.heapUsed - memoryBefore.heapUsed,
    rssDeltaBytes: memoryAfter.rss - memoryBefore.rss
  };
};
const directImageProbe = await measureProbe(false);
const cachedImageProbe = await measureProbe(true);
const inlineCacheComparison = {
  png: await compareInlineCache("png"),
  jpeg: await compareInlineCache("jpeg")
};

const summarize = (value: StageTotal | undefined, count = 1) =>
  value === undefined
    ? { wallMs: 0, cpuMs: 0, calls: 0 }
    : {
        wallMs: Number((value.wallMs / count).toFixed(3)),
        cpuMs: Number((value.cpuMs / count).toFixed(3)),
        calls: value.calls
      };

console.log(
  JSON.stringify(
    {
      bannerType,
      format: "PNG and JPEG per render",
      warmRenders,
      outputSha256: {
        png: createHash("sha256").update(output.png).digest("hex"),
        jpeg: createHash("sha256").update(output.jpeg).digest("hex")
      },
      cold: {
        stages: Object.fromEntries(
          Object.entries(coldMetrics).map(([name, value]) => [name, summarize(value as StageTotal)])
        ),
        memory: {
          heapDeltaBytes: coldMemoryAfter.heapUsed - coldMemoryBefore.heapUsed,
          rssDeltaBytes: coldMemoryAfter.rss - coldMemoryBefore.rss
        }
      },
      warm: {
        wallMsPerRender: Number((warmWallMs / warmRenders).toFixed(3)),
        cpuMsPerRender: Number(((warmCpu.user + warmCpu.system) / 1000 / warmRenders).toFixed(3)),
        stages: Object.fromEntries(
          Object.entries(warmMetrics).map(([name, value]) => [
            name,
            summarize(value as StageTotal, warmRenders)
          ])
        ),
        memoryDeltaBytes: {
          heap: process.memoryUsage().heapUsed - warmMemoryBefore.heapUsed,
          rss: process.memoryUsage().rss - warmMemoryBefore.rss
        }
      },
      inlineImageProbe: {
        iterations: warmRenders,
        uncachedDecodeAndDraw: directImageProbe,
        cachedLookupAndDraw: cachedImageProbe
      },
      inlineCacheComparison,
      nativeCallCounts: nativeCalls,
      finalMemory: process.memoryUsage()
    },
    null,
    2
  )
);
