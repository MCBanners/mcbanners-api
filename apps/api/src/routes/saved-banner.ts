import { Hono } from "hono";

import {
  buildResourceBannerNodes,
  buildServerBannerNodes,
  createCanvasSurface,
  encodeJpg,
  encodePng,
  mapStatusToServerBannerData,
  parseResourceBannerSettings,
  parseServerBannerSettings,
  registerRendererFonts,
  renderNode,
  RESOURCE_BANNER_HEIGHT,
  RESOURCE_BANNER_WIDTH,
  SERVER_BANNER_HEIGHT,
  SERVER_BANNER_WIDTH
} from "@mcbanners/banner-renderer";
import type { ResourceClient } from "@mcbanners/external-clients";
import type { MinecraftStatusAdapter } from "@mcbanners/minecraft-status";
import {
  decodeBannerTypeOrdinal,
  parseSavedBannerMetadata,
  parseSavedBannerSettings,
  type SavedBannerJsonMap,
  type SavedBannerRepository,
  type SavedBannerRow
} from "@mcbanners/db";
import { bannerTypeSchema, type BannerType, type ServiceBackend } from "@mcbanners/domain";

import type { ResourceClients } from "./resource-banner";

const SAVED_BANNER_FILENAME_RE = /^([A-Za-z]{14})\.(png|jpg)$/i;

let fontsRegistered = false;
const ensureFonts = (): void => {
  if (!fontsRegistered) {
    registerRendererFonts();
    fontsRegistered = true;
  }
};

type SavedBannerOutputType = "png" | "jpg";

interface SaveBody {
  readonly type: BannerType;
  readonly metadata: SavedBannerJsonMap;
  readonly settings: SavedBannerJsonMap;
}

export class SavedBannerDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SavedBannerDataError";
  }
}

export class UnsupportedSavedBannerTypeError extends Error {
  constructor(readonly bannerType: BannerType) {
    super(`Unsupported saved banner type: ${bannerType}`);
    this.name = "UnsupportedSavedBannerTypeError";
  }
}

const isStringRecord = (value: unknown): value is Record<string, string> =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.values(value).every((entry) => typeof entry === "string");

const parseBannerType = (value: unknown): BannerType | null => {
  if (typeof value === "string") {
    const parsed = bannerTypeSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    try {
      return decodeBannerTypeOrdinal(value);
    } catch {
      return null;
    }
  }

  return null;
};

const parseSaveBody = (body: unknown): SaveBody | null => {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }

  const raw = body as Record<string, unknown>;
  const type = parseBannerType(raw["type"]);
  if (type === null) {
    return null;
  }

  const metadata = raw["metadata"];
  const settings = raw["settings"];

  if (!isStringRecord(metadata) || Object.keys(metadata).length === 0) {
    return null;
  }

  if (settings !== undefined && !isStringRecord(settings)) {
    return null;
  }

  return {
    type,
    metadata,
    settings: settings ?? {}
  };
};

const toSavedBannerResponse = (row: SavedBannerRow): Record<string, unknown> => ({
  id: row.id,
  type: row.type,
  bannerType: decodeBannerTypeOrdinal(row.type),
  owner: row.owner,
  mnemonic: row.mnemonic,
  metadata: row.metadata,
  settings: row.settings
});

const contentTypeFor = (outputType: SavedBannerOutputType): string =>
  outputType === "jpg" ? "image/jpeg" : "image/png";

const encodeSurface = (
  surface: Parameters<typeof encodePng>[0],
  outputType: SavedBannerOutputType
): Promise<Buffer> => (outputType === "jpg" ? encodeJpg(surface) : encodePng(surface));

const backendForResourceBannerType = (bannerType: BannerType): ServiceBackend | null => {
  switch (bannerType) {
    case "SPIGOT_RESOURCE":
      return "SPIGOT";
    case "MODRINTH_RESOURCE":
      return "MODRINTH";
    case "CURSEFORGE_RESOURCE":
      return "CURSEFORGE";
    case "HANGAR_RESOURCE":
      return "HANGAR";
    case "SPONGE_RESOURCE":
      return "ORE";
    case "BUILTBYBIT_RESOURCE":
      return "BUILTBYBIT";
    case "POLYMART_RESOURCE":
      return "POLYMART";
    default:
      return null;
  }
};

export class SavedBannerRecallService {
  constructor(
    private readonly minecraftAdapter: MinecraftStatusAdapter,
    private readonly resourceClients: ResourceClients
  ) {}

  async render(row: SavedBannerRow, outputType: SavedBannerOutputType): Promise<Buffer | null> {
    let bannerType: BannerType;
    let metadata: SavedBannerJsonMap;
    let settings: SavedBannerJsonMap;

    try {
      bannerType = decodeBannerTypeOrdinal(row.type);
      metadata = parseSavedBannerMetadata(row.metadata);
      settings = parseSavedBannerSettings(row.settings);
    } catch (error) {
      throw new SavedBannerDataError(String(error));
    }

    if (bannerType === "MINECRAFT_SERVER") {
      return await this.renderMinecraftServer(metadata, settings, outputType);
    }

    const backend = backendForResourceBannerType(bannerType);
    if (backend !== null) {
      return await this.renderResource(backend, metadata, settings, outputType);
    }

    throw new UnsupportedSavedBannerTypeError(bannerType);
  }

  private async renderMinecraftServer(
    metadata: SavedBannerJsonMap,
    settings: SavedBannerJsonMap,
    outputType: SavedBannerOutputType
  ): Promise<Buffer | null> {
    const host = metadata["server_host"];
    if (host === undefined || host === "") {
      throw new SavedBannerDataError("Saved Minecraft server banner is missing server_host");
    }

    const parsedPort =
      metadata["server_port"] === undefined ? 25565 : Number.parseInt(metadata["server_port"], 10);
    const port = Number.isFinite(parsedPort) ? parsedPort : 25565;
    const status = await this.minecraftAdapter.getStatus(host.toLowerCase(), port);
    if (status === null) {
      return null;
    }

    ensureFonts();
    const data = mapStatusToServerBannerData(status);
    const nodes = buildServerBannerNodes(data, parseServerBannerSettings(settings));
    const surface = createCanvasSurface(SERVER_BANNER_WIDTH, SERVER_BANNER_HEIGHT);
    for (const node of nodes) {
      await renderNode(surface, node);
    }

    return await encodeSurface(surface, outputType);
  }

  private async renderResource(
    backend: ServiceBackend,
    metadata: SavedBannerJsonMap,
    settings: SavedBannerJsonMap,
    outputType: SavedBannerOutputType
  ): Promise<Buffer | null> {
    const resourceId = metadata["resource_id"];
    if (resourceId === undefined || resourceId === "") {
      throw new SavedBannerDataError("Saved resource banner is missing resource_id");
    }

    const client: ResourceClient | undefined = this.resourceClients[backend];
    if (client === undefined) {
      return null;
    }

    const data = await client.getResourceBannerData(resourceId);
    if (data === null) {
      return null;
    }

    ensureFonts();
    const nodes = buildResourceBannerNodes(data, parseResourceBannerSettings(settings));
    const surface = createCanvasSurface(RESOURCE_BANNER_WIDTH, RESOURCE_BANNER_HEIGHT);
    for (const node of nodes) {
      await renderNode(surface, node);
    }

    return await encodeSurface(surface, outputType);
  }
}

export const createSavedBannerRoute = (
  repository: SavedBannerRepository,
  minecraftAdapter: MinecraftStatusAdapter,
  resourceClients: ResourceClients
): Hono => {
  const route = new Hono();
  const recall = new SavedBannerRecallService(minecraftAdapter, resourceClients);

  route.post("/save", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = parseSaveBody(body);
    if (parsed === null) {
      return c.json({ error: "Invalid saved banner body" }, 400);
    }

    const row = await repository.insertSavedBanner({
      bannerType: parsed.type,
      metadata: parsed.metadata,
      settings: parsed.settings,
      owner: null
    });

    return c.json(toSavedBannerResponse(row));
  });

  route.get("/:savedBannerFile", async (c) => {
    const { savedBannerFile } = c.req.param();
    const match = SAVED_BANNER_FILENAME_RE.exec(savedBannerFile);
    if (!match?.[1] || !match[2]) {
      return c.json(
        {
          error: `Unsupported filename: ${savedBannerFile}. Expected {mnemonic}.png or {mnemonic}.jpg.`
        },
        400
      );
    }

    const mnemonic = match[1];
    const outputType = match[2].toLowerCase() as SavedBannerOutputType;
    const row = await repository.findByMnemonic(mnemonic);
    if (row === null) {
      return c.body(null, 404);
    }

    try {
      const buf = await recall.render(row, outputType);
      if (buf === null) {
        return c.body(null, 404);
      }

      return new Response(buf, {
        headers: {
          "Content-Type": contentTypeFor(outputType),
          "Content-Length": String(buf.length),
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
        }
      });
    } catch (error) {
      if (error instanceof UnsupportedSavedBannerTypeError) {
        return c.json({ error: error.message }, 501);
      }
      if (error instanceof SavedBannerDataError || error instanceof RangeError) {
        return c.json({ error: "Stored saved banner data is invalid" }, 500);
      }
      throw error;
    }
  });

  return route;
};
