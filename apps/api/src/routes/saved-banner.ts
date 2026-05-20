import { Hono, type Context } from "hono";

import {
  buildResourceBannerNodes,
  buildServerBannerNodes,
  buildAuthorBannerNodes,
  buildMemberBannerNodes,
  buildTeamBannerNodes,
  createCanvasSurface,
  encodeJpg,
  encodePng,
  mapHytaleStatusToServerBannerData,
  mapStatusToServerBannerData,
  parseAuthorBannerSettings,
  parseMemberBannerSettings,
  parseResourceBannerSettings,
  parseServerBannerSettings,
  parseTeamBannerSettings,
  AUTHOR_BANNER_HEIGHT,
  AUTHOR_BANNER_WIDTH,
  MEMBER_BANNER_HEIGHT,
  MEMBER_BANNER_WIDTH,
  registerRendererFonts,
  renderNode,
  RESOURCE_BANNER_HEIGHT,
  RESOURCE_BANNER_WIDTH,
  SERVER_BANNER_HEIGHT,
  SERVER_BANNER_WIDTH,
  TEAM_BANNER_HEIGHT,
  TEAM_BANNER_WIDTH,
  parseBannerStyleSettings,
  validateBannerStyleSettings,
  canonicalizeBannerStyleSettings
} from "@mcbanners/banner-renderer";
import type {
  AuthorClient,
  MemberClient,
  ResourceClient,
  TeamClient
} from "@mcbanners/external-clients";
import type { MinecraftStatusAdapter } from "@mcbanners/minecraft-status";
import type { HytaleStatusAdapter } from "@mcbanners/hytale-status";
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
import type { AuthorClients } from "./author-banner";
import type { MemberClients } from "./member-banner";
import type { TeamClients } from "./team-banner";

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

export const supportedSavedBannerTypes = [
  "SPONGE_AUTHOR",
  "SPONGE_RESOURCE",
  "SPIGOT_AUTHOR",
  "SPIGOT_RESOURCE",
  "MINECRAFT_SERVER",
  "CURSEFORGE_AUTHOR",
  "CURSEFORGE_RESOURCE",
  "MODRINTH_AUTHOR",
  "MODRINTH_RESOURCE",
  "BUILTBYBIT_AUTHOR",
  "BUILTBYBIT_RESOURCE",
  "BUILTBYBIT_MEMBER",
  "POLYMART_AUTHOR",
  "POLYMART_RESOURCE",
  "POLYMART_TEAM",
  "HANGAR_AUTHOR",
  "HANGAR_RESOURCE"
] as const satisfies readonly BannerType[];

export const unsupportedSavedBannerTypes = [
  "DISCORD_USER"
] as const satisfies readonly BannerType[];

export const requiredMetadataByBannerType = {
  SPONGE_AUTHOR: ["author_id"],
  SPONGE_RESOURCE: ["resource_id"],
  SPIGOT_AUTHOR: ["author_id"],
  SPIGOT_RESOURCE: ["resource_id"],
  MINECRAFT_SERVER: ["server_host"],
  CURSEFORGE_AUTHOR: ["author_id"],
  CURSEFORGE_RESOURCE: ["resource_id"],
  MODRINTH_AUTHOR: ["author_id"],
  MODRINTH_RESOURCE: ["resource_id"],
  BUILTBYBIT_AUTHOR: ["author_id"],
  BUILTBYBIT_RESOURCE: ["resource_id"],
  BUILTBYBIT_MEMBER: ["member_id"],
  POLYMART_AUTHOR: ["author_id"],
  POLYMART_RESOURCE: ["resource_id"],
  POLYMART_TEAM: ["team_id"],
  HANGAR_AUTHOR: ["author_id"],
  HANGAR_RESOURCE: ["resource_id"],
  DISCORD_USER: ["user_id"]
} as const satisfies Record<BannerType, readonly string[]>;

const supportedSavedBannerTypeSet = new Set<BannerType>(supportedSavedBannerTypes);
const unsupportedSavedBannerTypeSet = new Set<BannerType>(unsupportedSavedBannerTypes);

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

const coerceLegacyStringMap = (value: unknown): SavedBannerJsonMap | null => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries: [string, string][] = [];
  for (const [key, entry] of Object.entries(value)) {
    if (
      entry !== null &&
      typeof entry !== "string" &&
      typeof entry !== "number" &&
      typeof entry !== "boolean"
    ) {
      return null;
    }

    entries.push([key, String(entry)]);
  }

  return Object.freeze(Object.fromEntries(entries) as Record<string, string>);
};

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

  const parsedMetadata = coerceLegacyStringMap(metadata);
  if (parsedMetadata === null || Object.keys(parsedMetadata).length === 0) {
    return null;
  }

  const parsedSettings = settings === undefined ? {} : coerceLegacyStringMap(settings);
  if (parsedSettings === null) {
    return null;
  }

  return {
    type,
    metadata: parsedMetadata,
    settings: parsedSettings
  };
};

const validateSavedBannerMetadata = (
  bannerType: BannerType,
  metadata: SavedBannerJsonMap
): void => {
  for (const key of requiredMetadataByBannerType[bannerType]) {
    if (metadata[key] === undefined || metadata[key] === "") {
      throw new SavedBannerDataError(`Saved ${bannerType} banner is missing ${key}`);
    }
  }
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

const backendForAuthorBannerType = (bannerType: BannerType): ServiceBackend | null => {
  switch (bannerType) {
    case "SPIGOT_AUTHOR":
      return "SPIGOT";
    case "MODRINTH_AUTHOR":
      return "MODRINTH";
    case "CURSEFORGE_AUTHOR":
      return "CURSEFORGE";
    case "HANGAR_AUTHOR":
      return "HANGAR";
    case "SPONGE_AUTHOR":
      return "ORE";
    case "BUILTBYBIT_AUTHOR":
      return "BUILTBYBIT";
    case "POLYMART_AUTHOR":
      return "POLYMART";
    default:
      return null;
  }
};

export class SavedBannerRecallService {
  constructor(
    private readonly minecraftAdapter: MinecraftStatusAdapter,
    private readonly hytaleAdapter: HytaleStatusAdapter,
    private readonly resourceClients: ResourceClients,
    private readonly authorClients: AuthorClients,
    private readonly memberClients: MemberClients,
    private readonly teamClients: TeamClients
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

    if (unsupportedSavedBannerTypeSet.has(bannerType)) {
      throw new UnsupportedSavedBannerTypeError(bannerType);
    }
    if (!supportedSavedBannerTypeSet.has(bannerType)) {
      throw new UnsupportedSavedBannerTypeError(bannerType);
    }

    validateSavedBannerMetadata(bannerType, metadata);

    if (bannerType === "MINECRAFT_SERVER") {
      return await this.renderGameServer(metadata, settings, outputType);
    }

    const backend = backendForResourceBannerType(bannerType);
    if (backend !== null) {
      return await this.renderResource(backend, metadata, settings, outputType);
    }

    const authorBackend = backendForAuthorBannerType(bannerType);
    if (authorBackend !== null) {
      return await this.renderAuthor(authorBackend, metadata, settings, outputType);
    }

    if (bannerType === "BUILTBYBIT_MEMBER") {
      return await this.renderMember(metadata, settings, outputType);
    }

    if (bannerType === "POLYMART_TEAM") {
      return await this.renderTeam(metadata, settings, outputType);
    }

    throw new UnsupportedSavedBannerTypeError(bannerType);
  }

  private async renderGameServer(
    metadata: SavedBannerJsonMap,
    settings: SavedBannerJsonMap,
    outputType: SavedBannerOutputType
  ): Promise<Buffer | null> {
    const host = metadata["server_host"];
    if (host === undefined)
      throw new SavedBannerDataError("Saved Minecraft server banner is missing server_host");

    const parsedPort =
      metadata["server_port"] === undefined ? 25565 : Number.parseInt(metadata["server_port"], 10);
    const port = Number.isFinite(parsedPort) ? parsedPort : 25565;

    const game = metadata["server_game"] ?? "minecraft";
    if (game !== "minecraft" && game !== "hytale") {
      throw new SavedBannerDataError("Saved Minecraft server banner has invalid server_game");
    }

    ensureFonts();
    const style = parseBannerStyleSettings(settings) ?? undefined;
    const data =
      game === "hytale"
        ? await (async () => {
            const status = await this.hytaleAdapter.getStatus(host.toLowerCase(), port);
            return status === null ? null : mapHytaleStatusToServerBannerData(status);
          })()
        : await (async () => {
            const status = await this.minecraftAdapter.getStatus(host.toLowerCase(), port);
            return status === null ? null : mapStatusToServerBannerData(status);
          })();
    if (data === null) return null;
    const nodes = buildServerBannerNodes(data, parseServerBannerSettings(settings), style);
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
    if (resourceId === undefined)
      throw new SavedBannerDataError("Saved resource banner is missing resource_id");

    const client: ResourceClient | undefined = this.resourceClients[backend];
    if (client === undefined) {
      return null;
    }

    const data = await client.getResourceBannerData(resourceId);
    if (data === null) {
      return null;
    }

    ensureFonts();
    const style = parseBannerStyleSettings(settings) ?? undefined;
    const nodes = buildResourceBannerNodes(data, parseResourceBannerSettings(settings), style);
    const surface = createCanvasSurface(RESOURCE_BANNER_WIDTH, RESOURCE_BANNER_HEIGHT);
    for (const node of nodes) {
      await renderNode(surface, node);
    }

    return await encodeSurface(surface, outputType);
  }

  private async renderAuthor(
    backend: ServiceBackend,
    metadata: SavedBannerJsonMap,
    settings: SavedBannerJsonMap,
    outputType: SavedBannerOutputType
  ): Promise<Buffer | null> {
    const authorId = metadata["author_id"];
    if (authorId === undefined)
      throw new SavedBannerDataError("Saved author banner is missing author_id");

    const client: AuthorClient | undefined = this.authorClients[backend];
    if (client === undefined) {
      return null;
    }

    const data = await client.getAuthorBannerData(authorId);
    if (data === null) {
      return null;
    }

    ensureFonts();
    const style = parseBannerStyleSettings(settings) ?? undefined;
    const nodes = buildAuthorBannerNodes(data, parseAuthorBannerSettings(settings), style);
    const surface = createCanvasSurface(AUTHOR_BANNER_WIDTH, AUTHOR_BANNER_HEIGHT);
    for (const node of nodes) {
      await renderNode(surface, node);
    }

    return await encodeSurface(surface, outputType);
  }

  private async renderMember(
    metadata: SavedBannerJsonMap,
    settings: SavedBannerJsonMap,
    outputType: SavedBannerOutputType
  ): Promise<Buffer | null> {
    const memberId = metadata["member_id"];
    if (memberId === undefined)
      throw new SavedBannerDataError("Saved member banner is missing member_id");

    const client: MemberClient | undefined = this.memberClients["BUILTBYBIT"];
    if (client === undefined) {
      return null;
    }

    const data = await client.getMemberBannerData(memberId);
    if (data === null) {
      return null;
    }

    ensureFonts();
    const style = parseBannerStyleSettings(settings) ?? undefined;
    const nodes = buildMemberBannerNodes(data, parseMemberBannerSettings(settings), style);
    const surface = createCanvasSurface(MEMBER_BANNER_WIDTH, MEMBER_BANNER_HEIGHT);
    for (const node of nodes) {
      await renderNode(surface, node);
    }

    return await encodeSurface(surface, outputType);
  }

  private async renderTeam(
    metadata: SavedBannerJsonMap,
    settings: SavedBannerJsonMap,
    outputType: SavedBannerOutputType
  ): Promise<Buffer | null> {
    const teamId = metadata["team_id"];
    if (teamId === undefined)
      throw new SavedBannerDataError("Saved team banner is missing team_id");

    const client: TeamClient | undefined = this.teamClients["POLYMART"];
    if (client === undefined) {
      return null;
    }

    const data = await client.getTeamBannerData(teamId);
    if (data === null) {
      return null;
    }

    ensureFonts();
    const style = parseBannerStyleSettings(settings) ?? undefined;
    const nodes = buildTeamBannerNodes(data, parseTeamBannerSettings(settings), style);
    const surface = createCanvasSurface(TEAM_BANNER_WIDTH, TEAM_BANNER_HEIGHT);
    for (const node of nodes) {
      await renderNode(surface, node);
    }

    return await encodeSurface(surface, outputType);
  }
}

export const createSavedBannerRoute = (
  repository: SavedBannerRepository,
  minecraftAdapter: MinecraftStatusAdapter,
  hytaleAdapter: HytaleStatusAdapter,
  resourceClients: ResourceClients,
  authorClients: AuthorClients = {},
  memberClients: MemberClients = {},
  teamClients: TeamClients = {}
): Hono => {
  const route = new Hono();
  const recall = new SavedBannerRecallService(
    minecraftAdapter,
    hytaleAdapter,
    resourceClients,
    authorClients,
    memberClients,
    teamClients
  );

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

    const styleErrors = validateBannerStyleSettings(parsed.settings);
    if (styleErrors.length > 0) {
      return c.json({ errors: styleErrors }, 400);
    }

    // Merge canonicalized style fields on top of the coerced settings so that
    // existing non-style settings (e.g. reviews__enable, logo_size) are preserved
    // and style fields are stored in canonical form.
    const canonicalStyleFields = canonicalizeBannerStyleSettings(parsed.settings);
    const mergedSettings = { ...parsed.settings, ...canonicalStyleFields };

    const row = await repository.insertSavedBanner({
      bannerType: parsed.type,
      metadata: parsed.metadata,
      settings: mergedSettings,
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

export const createUnavailableSavedBannerRoute = (): Hono => {
  const route = new Hono();
  const unavailable = (c: Context) =>
    c.json({ error: "Saved banner database is not configured" }, 503);

  route.post("/save", unavailable);
  route.get("/:savedBannerFile", unavailable);

  return route;
};
