import { beforeAll, describe, expect, it } from "bun:test";

import { createApp, type ResourceClients } from "../src/app";
import {
  createFixtureAdapter,
  MC_STATUS_FIXTURES,
  type MinecraftStatusAdapter
} from "@mcbanners/minecraft-status";
import {
  createFixtureHytaleAdapter,
  HYTALE_STATUS_FIXTURES,
  type HytaleStatusAdapter
} from "@mcbanners/hytale-status";
import {
  registerRendererFonts,
  type MemberBannerData,
  type ResourceBannerData,
  type TeamBannerData
} from "@mcbanners/banner-renderer";
import {
  decodeBannerTypeOrdinal,
  prepareSavedBannerInsert,
  type InsertSavedBannerInput,
  type SavedBannerRepository,
  type SavedBannerRow
} from "@mcbanners/db";
import type { AuthorBannerData } from "@mcbanners/banner-renderer";

beforeAll(() => {
  registerRendererFonts();
});

const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const FIXTURE_SPIGOT_RESOURCE: ResourceBannerData = {
  resource: {
    name: "EssentialsX",
    logoBase64: TINY_PNG_B64,
    downloadCount: 1_250_000,
    lastUpdated: null,
    rating: { count: 4320, average: 4.5 },
    price: null
  },
  author: { name: "md_5" },
  backend: "SPIGOT"
};

const FIXTURE_MODRINTH_RESOURCE: ResourceBannerData = {
  resource: {
    name: "Sodium",
    logoBase64: TINY_PNG_B64,
    downloadCount: 3_500_000,
    lastUpdated: "2024-07-01T00:00:00Z",
    rating: { count: 0, average: null },
    price: null
  },
  author: { name: "jellysquid3" },
  backend: "MODRINTH"
};

const FIXTURE_SPIGOT_AUTHOR: AuthorBannerData = {
  author: {
    name: "md_5",
    resourceCount: 42,
    logoBase64: null,
    downloadCount: 1_250_000,
    likes: null,
    reviews: 320
  },
  backend: "SPIGOT"
};

const FIXTURE_BUILTBYBIT_MEMBER: MemberBannerData = {
  member: {
    name: "DevUser",
    rank: "Premium",
    joinDate: "5/15/2024",
    logoBase64: null,
    posts: 1250,
    positiveFeedback: 40,
    negativeFeedback: 5
  }
};

const FIXTURE_POLYMART_TEAM: TeamBannerData = {
  team: {
    name: "PluginTeam",
    logoBase64: null,
    resourceCount: 12,
    resourceDownloads: 250_000,
    resourceRatings: 3400,
    resourceAverageRating: 4
  }
};

class FixtureResourceClient {
  constructor(private readonly data: ResourceBannerData | null) {}

  getResourceBannerData(): Promise<ResourceBannerData | null> {
    return Promise.resolve(this.data);
  }
}

class FixtureAuthorClient {
  constructor(private readonly data: AuthorBannerData | null) {}

  getAuthorBannerData(): Promise<AuthorBannerData | null> {
    return Promise.resolve(this.data);
  }
}

class FixtureMemberClient {
  constructor(private readonly data: MemberBannerData | null) {}

  getMemberBannerData(): Promise<MemberBannerData | null> {
    return Promise.resolve(this.data);
  }
}

class FixtureTeamClient {
  constructor(private readonly data: TeamBannerData | null) {}

  getTeamBannerData(): Promise<TeamBannerData | null> {
    return Promise.resolve(this.data);
  }
}

class InMemorySavedBannerRepository implements SavedBannerRepository {
  private nextId = 1;
  readonly inserted: SavedBannerRow[] = [];
  private readonly rows = new Map<string, SavedBannerRow>();

  constructor(rows: readonly SavedBannerRow[] = []) {
    for (const row of rows) {
      this.rows.set(row.mnemonic, row);
      this.nextId = Math.max(this.nextId, row.id + 1);
    }
  }

  findByMnemonic(mnemonic: string): Promise<SavedBannerRow | null> {
    return Promise.resolve(this.rows.get(mnemonic) ?? null);
  }

  findAllByOwner(owner: string): Promise<readonly SavedBannerRow[]> {
    return Promise.resolve([...this.rows.values()].filter((row) => row.owner === owner));
  }

  insertSavedBanner(input: InsertSavedBannerInput): Promise<SavedBannerRow> {
    const insert = prepareSavedBannerInsert(input);
    const row: SavedBannerRow = {
      id: this.nextId,
      type: insert.type,
      owner: insert.owner ?? null,
      mnemonic: insert.mnemonic,
      metadata: insert.metadata,
      settings: insert.settings
    };

    this.nextId += 1;
    this.inserted.push(row);
    this.rows.set(row.mnemonic, row);
    return Promise.resolve(row);
  }
}

const makeSavedApp = (
  repository = new InMemorySavedBannerRepository(),
  resourceClients: ResourceClients = {
    SPIGOT: new FixtureResourceClient(FIXTURE_SPIGOT_RESOURCE),
    MODRINTH: new FixtureResourceClient(FIXTURE_MODRINTH_RESOURCE)
  },
  minecraftAdapter: MinecraftStatusAdapter = createFixtureAdapter(MC_STATUS_FIXTURES),
  authorClients = { SPIGOT: new FixtureAuthorClient(FIXTURE_SPIGOT_AUTHOR) },
  memberClients = { BUILTBYBIT: new FixtureMemberClient(FIXTURE_BUILTBYBIT_MEMBER) },
  teamClients = { POLYMART: new FixtureTeamClient(FIXTURE_POLYMART_TEAM) },
  hytaleAdapter: HytaleStatusAdapter = createFixtureHytaleAdapter(HYTALE_STATUS_FIXTURES)
) =>
  createApp(
    minecraftAdapter,
    resourceClients,
    undefined,
    { savedBanners: repository },
    authorClients,
    memberClients,
    teamClients,
    undefined,
    undefined,
    { hytaleAdapter }
  );

const savedRow = (
  overrides: Partial<SavedBannerRow> & Pick<SavedBannerRow, "mnemonic">
): SavedBannerRow => ({
  id: 1,
  type: 4,
  owner: null,
  metadata: '{"server_host":"mc.hypixel.net","server_port":"25565"}',
  settings: "{}",
  ...overrides
});

describe("POST /banner/saved/save", () => {
  it("returns 503 when the runtime exposes saved routes without a repository", async () => {
    const app = createApp(createFixtureAdapter(MC_STATUS_FIXTURES), {}, undefined, {
      savedBanners: null
    });
    const res = await app.request("/banner/saved/save", {
      method: "POST",
      body: JSON.stringify({
        type: "MINECRAFT_SERVER",
        metadata: { server_host: "mc.hypixel.net" }
      }),
      headers: { "Content-Type": "application/json" }
    });

    expect(res.status).toBe(503);
  });

  it("saves an anonymous banner and returns a legacy-compatible row shape", async () => {
    const repository = new InMemorySavedBannerRepository();
    const app = makeSavedApp(repository);
    const res = await app.request("/banner/saved/save", {
      method: "POST",
      body: JSON.stringify({
        type: "SPIGOT_RESOURCE",
        metadata: { resource_id: "12345" },
        settings: { resource_name__display: "EssentialsX" }
      }),
      headers: { "Content-Type": "application/json" }
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as SavedBannerRow & { bannerType: string };

    expect(body.id).toBe(1);
    expect(body.type).toBe(3);
    expect(body.bannerType).toBe("SPIGOT_RESOURCE");
    expect(body.owner).toBeNull();
    expect(body.mnemonic).toMatch(/^[A-Za-z]{14}$/);
    expect(body.metadata).toBe('{"resource_id":"12345"}');
    expect(body.settings).toBe('{"resource_name__display":"EssentialsX"}');
    expect(repository.inserted[0]?.owner).toBeNull();
  });

  it("coerces numeric metadata values to strings for legacy DB storage", async () => {
    const repository = new InMemorySavedBannerRepository();
    const app = makeSavedApp(repository);
    const res = await app.request("/banner/saved/save", {
      method: "POST",
      body: JSON.stringify({
        type: "MINECRAFT_SERVER",
        metadata: { server_host: "mc.hypixel.net", server_port: 25565 },
        settings: {}
      }),
      headers: { "Content-Type": "application/json" }
    });

    expect(res.status).toBe(200);
    expect(repository.inserted[0]?.metadata).toBe(
      '{"server_host":"mc.hypixel.net","server_port":"25565"}'
    );
  });

  it("coerces numeric, boolean, and null settings values to strings", async () => {
    const repository = new InMemorySavedBannerRepository();
    const app = makeSavedApp(repository);
    const res = await app.request("/banner/saved/save", {
      method: "POST",
      body: JSON.stringify({
        type: "SPIGOT_RESOURCE",
        metadata: { resource_id: "12345" },
        settings: {
          reviews__enable: false,
          author_name__font_size: 18,
          author_name__display: null
        }
      }),
      headers: { "Content-Type": "application/json" }
    });

    expect(res.status).toBe(200);
    expect(repository.inserted[0]?.settings).toBe(
      '{"reviews__enable":"false","author_name__font_size":"18","author_name__display":"null"}'
    );
  });

  it("accepts compatible numeric BannerType ordinals", async () => {
    const repository = new InMemorySavedBannerRepository();
    const app = makeSavedApp(repository);
    const res = await app.request("/banner/saved/save", {
      method: "POST",
      body: JSON.stringify({
        type: 4,
        metadata: { server_host: "mc.hypixel.net" },
        settings: {}
      }),
      headers: { "Content-Type": "application/json" }
    });

    expect(res.status).toBe(200);
    expect(decodeBannerTypeOrdinal(repository.inserted[0]!.type)).toBe("MINECRAFT_SERVER");
  });

  it("returns 400 when metadata is missing or empty", async () => {
    const app = makeSavedApp();

    const missing = await app.request("/banner/saved/save", {
      method: "POST",
      body: JSON.stringify({ type: "SPIGOT_RESOURCE", settings: {} }),
      headers: { "Content-Type": "application/json" }
    });
    const empty = await app.request("/banner/saved/save", {
      method: "POST",
      body: JSON.stringify({ type: "SPIGOT_RESOURCE", metadata: {}, settings: {} }),
      headers: { "Content-Type": "application/json" }
    });

    expect(missing.status).toBe(400);
    expect(empty.status).toBe(400);
  });

  it("returns 400 for nested metadata or settings values", async () => {
    const app = makeSavedApp();

    const nestedMetadata = await app.request("/banner/saved/save", {
      method: "POST",
      body: JSON.stringify({
        type: "SPIGOT_RESOURCE",
        metadata: { resource_id: { value: "12345" } },
        settings: {}
      }),
      headers: { "Content-Type": "application/json" }
    });
    const nestedSettings = await app.request("/banner/saved/save", {
      method: "POST",
      body: JSON.stringify({
        type: "SPIGOT_RESOURCE",
        metadata: { resource_id: "12345" },
        settings: { author_name__display: ["EssentialsX"] }
      }),
      headers: { "Content-Type": "application/json" }
    });

    expect(nestedMetadata.status).toBe(400);
    expect(nestedSettings.status).toBe(400);
  });

  it("defaults missing settings to an empty JSON object", async () => {
    const repository = new InMemorySavedBannerRepository();
    const app = makeSavedApp(repository);
    const res = await app.request("/banner/saved/save", {
      method: "POST",
      body: JSON.stringify({
        type: "MINECRAFT_SERVER",
        metadata: { server_host: "mc.hypixel.net" }
      }),
      headers: { "Content-Type": "application/json" }
    });

    expect(res.status).toBe(200);
    expect(repository.inserted[0]?.settings).toBe("{}");
  });

  it("returns 400 for invalid banner type", async () => {
    const app = makeSavedApp();
    const res = await app.request("/banner/saved/save", {
      method: "POST",
      body: JSON.stringify({
        type: "NOT_A_BANNER",
        metadata: { resource_id: "12345" },
        settings: {}
      }),
      headers: { "Content-Type": "application/json" }
    });

    expect(res.status).toBe(400);
  });

  it("recalls a banner saved with primitive metadata after values are stringified", async () => {
    const repository = new InMemorySavedBannerRepository();
    const app = makeSavedApp(repository);
    const save = await app.request("/banner/saved/save", {
      method: "POST",
      body: JSON.stringify({
        type: "MINECRAFT_SERVER",
        metadata: { server_host: "mc.hypixel.net", server_port: 25565 },
        settings: { server_version__enable: true }
      }),
      headers: { "Content-Type": "application/json" }
    });

    expect(save.status).toBe(200);
    const row = repository.inserted[0]!;
    const recall = await app.request(`/banner/saved/${row.mnemonic}.png`);

    expect(recall.status).toBe(200);
    expect(recall.headers.get("Content-Type")).toBe("image/png");
  });
});

describe("GET /banner/saved/:mnemonic.:outputType", () => {
  it("returns 503 for recall when the runtime exposes saved routes without a repository", async () => {
    const app = createApp(createFixtureAdapter(MC_STATUS_FIXTURES), {}, undefined, {
      savedBanners: null
    });
    const res = await app.request("/banner/saved/abcdefghijklmn.png");

    expect(res.status).toBe(503);
  });

  it("returns 404 for a missing mnemonic", async () => {
    const res = await makeSavedApp().request("/banner/saved/abcdefghijklmn.png");

    expect(res.status).toBe(404);
  });

  it("returns a safe 500 for an invalid stored ordinal", async () => {
    const repository = new InMemorySavedBannerRepository([
      savedRow({ mnemonic: "abcdefghijklmn", type: 999 })
    ]);
    const res = await makeSavedApp(repository).request("/banner/saved/abcdefghijklmn.png");

    expect(res.status).toBe(500);
  });

  it("returns a safe 500 for invalid stored JSON", async () => {
    const repository = new InMemorySavedBannerRepository([
      savedRow({ mnemonic: "abcdefghijklmn", metadata: "not json" })
    ]);
    const res = await makeSavedApp(repository).request("/banner/saved/abcdefghijklmn.png");

    expect(res.status).toBe(500);
  });

  it("recalls a Minecraft server saved banner as PNG", async () => {
    const repository = new InMemorySavedBannerRepository([
      savedRow({ mnemonic: "abcdefghijklmn" })
    ]);
    const res = await makeSavedApp(repository).request("/banner/saved/abcdefghijklmn.png");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("recalls a Minecraft server saved banner as JPG", async () => {
    const repository = new InMemorySavedBannerRepository([
      savedRow({ mnemonic: "abcdefghijklmn" })
    ]);
    const res = await makeSavedApp(repository).request("/banner/saved/abcdefghijklmn.jpg");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("defaults missing server_game metadata to Minecraft for saved server banners", async () => {
    let minecraftCalls = 0;
    let hytaleCalls = 0;
    const minecraftAdapter: MinecraftStatusAdapter = {
      getStatus: (host, port) => {
        minecraftCalls += 1;
        return createFixtureAdapter(MC_STATUS_FIXTURES).getStatus(host, port);
      }
    };
    const hytaleAdapter: HytaleStatusAdapter = {
      getStatus: () => {
        hytaleCalls += 1;
        return Promise.resolve(null);
      }
    };
    const repository = new InMemorySavedBannerRepository([
      savedRow({ mnemonic: "abcdefghijklmn" })
    ]);

    const res = await makeSavedApp(
      repository,
      undefined,
      minecraftAdapter,
      undefined,
      undefined,
      undefined,
      hytaleAdapter
    ).request("/banner/saved/abcdefghijklmn.png");

    expect(res.status).toBe(200);
    expect(minecraftCalls).toBe(1);
    expect(hytaleCalls).toBe(0);
  });

  it("recalls a Hytale server saved banner through MINECRAFT_SERVER metadata", async () => {
    const repository = new InMemorySavedBannerRepository([
      savedRow({
        mnemonic: "abcdefghijklmn",
        metadata:
          '{"server_host":"play.hytale.example","server_port":"5520","server_game":"hytale"}'
      })
    ]);
    const res = await makeSavedApp(repository).request("/banner/saved/abcdefghijklmn.png");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect((await res.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("recalls a Spigot resource saved banner", async () => {
    const repository = new InMemorySavedBannerRepository([
      savedRow({
        mnemonic: "abcdefghijklmn",
        type: 3,
        metadata: '{"resource_id":"12345"}'
      })
    ]);
    const res = await makeSavedApp(repository).request("/banner/saved/abcdefghijklmn.png");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("recalls a Modrinth resource saved banner", async () => {
    const repository = new InMemorySavedBannerRepository([
      savedRow({
        mnemonic: "abcdefghijklmn",
        type: 8,
        metadata: '{"resource_id":"sodium"}'
      })
    ]);
    const res = await makeSavedApp(repository).request("/banner/saved/abcdefghijklmn.jpg");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("recalls a Spigot author saved banner", async () => {
    const repository = new InMemorySavedBannerRepository([
      savedRow({
        mnemonic: "abcdefghijklmn",
        type: 2,
        metadata: '{"author_id":"1"}'
      })
    ]);
    const res = await makeSavedApp(repository).request("/banner/saved/abcdefghijklmn.png");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("recalls a BuiltByBit member saved banner", async () => {
    const repository = new InMemorySavedBannerRepository([
      savedRow({
        mnemonic: "abcdefghijklmn",
        type: 11,
        metadata: '{"member_id":"99"}'
      })
    ]);
    const res = await makeSavedApp(repository).request("/banner/saved/abcdefghijklmn.png");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("recalls a Polymart team saved banner", async () => {
    const repository = new InMemorySavedBannerRepository([
      savedRow({
        mnemonic: "abcdefghijklmn",
        type: 14,
        metadata: '{"team_id":"789"}'
      })
    ]);
    const res = await makeSavedApp(repository).request("/banner/saved/abcdefghijklmn.jpg");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns a safe 500 when member or team saved metadata is missing", async () => {
    const missingMember = new InMemorySavedBannerRepository([
      savedRow({ mnemonic: "abcdefghijklmn", type: 11, metadata: "{}" })
    ]);
    const missingTeam = new InMemorySavedBannerRepository([
      savedRow({ mnemonic: "abcdefghijklmz", type: 14, metadata: "{}" })
    ]);

    expect(
      (await makeSavedApp(missingMember).request("/banner/saved/abcdefghijklmn.png")).status
    ).toBe(500);
    expect(
      (await makeSavedApp(missingTeam).request("/banner/saved/abcdefghijklmz.png")).status
    ).toBe(500);
  });

  it("returns 400 for unsupported output format", async () => {
    const repository = new InMemorySavedBannerRepository([
      savedRow({ mnemonic: "abcdefghijklmn" })
    ]);
    const res = await makeSavedApp(repository).request("/banner/saved/abcdefghijklmn.webp");

    expect(res.status).toBe(400);
  });

  it("returns 501 for unsupported saved banner types", async () => {
    const repository = new InMemorySavedBannerRepository([
      savedRow({
        mnemonic: "abcdefghijklmn",
        type: 17,
        metadata: '{"user_id":"1"}'
      })
    ]);
    const res = await makeSavedApp(repository).request("/banner/saved/abcdefghijklmn.png");
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(501);
    expect(body.error).toContain("DISCORD_USER");
  });
});
