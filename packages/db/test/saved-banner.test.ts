import { describe, expect, it } from "bun:test";

import {
  decodeBannerTypeOrdinal,
  encodeBannerTypeOrdinal,
  generateMnemonic,
  parseSavedBannerMetadata,
  parseSavedBannerSettings,
  prepareSavedBannerInsert,
  serializeSavedBannerMetadata,
  serializeSavedBannerSettings,
  type InsertSavedBannerInput,
  type SavedBannerRepository,
  type SavedBannerRow
} from "@mcbanners/db";
import { bannerTypeRecords, type BannerType } from "@mcbanners/domain";

class InMemorySavedBannerRepository implements SavedBannerRepository {
  private nextId = 1;
  private readonly rows = new Map<string, SavedBannerRow>();

  findByMnemonic(mnemonic: string): Promise<SavedBannerRow | null> {
    return Promise.resolve(this.rows.get(mnemonic) ?? null);
  }

  findAllByOwner(owner: string): Promise<readonly SavedBannerRow[]> {
    return Promise.resolve([...this.rows.values()].filter((row) => row.owner === owner));
  }

  insertSavedBanner(input: InsertSavedBannerInput): Promise<SavedBannerRow> {
    const insert = prepareSavedBannerInsert(input);
    const row = {
      id: this.nextId,
      type: insert.type,
      owner: insert.owner ?? null,
      mnemonic: insert.mnemonic,
      metadata: insert.metadata,
      settings: insert.settings
    };

    this.nextId += 1;
    this.rows.set(row.mnemonic, row);
    return Promise.resolve(row);
  }
}

describe("BannerType ordinal compatibility", () => {
  it("encodes every legacy BannerType to the Java ordinal", () => {
    for (const record of bannerTypeRecords) {
      expect(encodeBannerTypeOrdinal(record.name)).toBe(record.ordinal);
    }
  });

  it("decodes every legacy Java ordinal to the BannerType string", () => {
    for (const record of bannerTypeRecords) {
      expect(decodeBannerTypeOrdinal(record.ordinal)).toBe(record.name);
    }
  });

  it("throws on invalid ordinals instead of guessing", () => {
    expect(() => decodeBannerTypeOrdinal(-1)).toThrow(RangeError);
    expect(() => decodeBannerTypeOrdinal(999)).toThrow(RangeError);
  });

  it("does not require TypeScript numeric enums for DB-boundary values", () => {
    const bannerType: BannerType = decodeBannerTypeOrdinal(3);

    expect(bannerType).toBe("SPIGOT_RESOURCE");
    expect(typeof bannerType).toBe("string");
  });
});

describe("saved banner JSON compatibility helpers", () => {
  it("serializes metadata and settings as JSON strings", () => {
    const metadata = { resource_id: "12345", author_id: "678" };
    const settings = { background__template: "BLUE_RADIAL" };

    expect(serializeSavedBannerMetadata(metadata)).toBe(
      '{"resource_id":"12345","author_id":"678"}'
    );
    expect(serializeSavedBannerSettings(settings)).toBe('{"background__template":"BLUE_RADIAL"}');
  });

  it("parses metadata and settings JSON strings back to string maps", () => {
    expect(parseSavedBannerMetadata('{"server_host":"example.org","server_port":"25565"}')).toEqual(
      {
        server_host: "example.org",
        server_port: "25565"
      }
    );
    expect(parseSavedBannerSettings('{"server_name__enable":"false"}')).toEqual({
      server_name__enable: "false"
    });
  });

  it("rejects non-object and non-string map values", () => {
    expect(() => parseSavedBannerMetadata("[]")).toThrow(TypeError);
    expect(() => parseSavedBannerSettings('{"resource_id":12345}')).toThrow(TypeError);
  });

  it("prepares anonymous saves with nullable legacy owner", () => {
    const insert = prepareSavedBannerInsert({
      bannerType: "MINECRAFT_SERVER",
      metadata: { server_host: "example.org" },
      settings: null,
      mnemonic: "abcdefghijklmn"
    });

    expect(insert).toEqual({
      type: 4,
      owner: null,
      mnemonic: "abcdefghijklmn",
      metadata: '{"server_host":"example.org"}',
      settings: "{}"
    });
  });

  it("preserves a legacy owner UUID when provided", () => {
    const owner = "00000000-0000-4000-8000-000000000001";
    const insert = prepareSavedBannerInsert({
      bannerType: "SPIGOT_RESOURCE",
      owner,
      metadata: { resource_id: "12345" },
      settings: {},
      mnemonic: "abcdefghijklmn"
    });

    expect(insert.owner).toBe(owner);
  });

  it("generates Java-compatible 14-character alphabetic mnemonics", () => {
    const mnemonic = generateMnemonic();

    expect(mnemonic).toMatch(/^[A-Za-z]{14}$/);
  });
});

describe("SavedBannerRepository behavior with in-memory adapter", () => {
  it("inserts and finds an anonymous saved banner by mnemonic", async () => {
    const repository = new InMemorySavedBannerRepository();

    const inserted = await repository.insertSavedBanner({
      bannerType: "SPIGOT_RESOURCE",
      metadata: { resource_id: "12345" },
      settings: { resource_name__display: "EssentialsX" },
      mnemonic: "abcdefghijklmn"
    });
    const found = await repository.findByMnemonic("abcdefghijklmn");

    expect(inserted.owner).toBeNull();
    expect(found).toEqual(inserted);
    expect(decodeBannerTypeOrdinal(found!.type)).toBe("SPIGOT_RESOURCE");
    expect(parseSavedBannerMetadata(found!.metadata)).toEqual({ resource_id: "12345" });
    expect(parseSavedBannerSettings(found!.settings)).toEqual({
      resource_name__display: "EssentialsX"
    });
  });

  it("returns null for an unknown mnemonic", async () => {
    const repository = new InMemorySavedBannerRepository();

    expect(await repository.findByMnemonic("missingMnemonic")).toBeNull();
  });

  it("can still read legacy owner UUID rows through findAllByOwner", async () => {
    const repository = new InMemorySavedBannerRepository();
    const owner = "00000000-0000-4000-8000-000000000001";

    await repository.insertSavedBanner({
      bannerType: "MINECRAFT_SERVER",
      owner,
      metadata: { server_host: "example.org" },
      settings: {},
      mnemonic: "ownerbannerabcd"
    });
    await repository.insertSavedBanner({
      bannerType: "MINECRAFT_SERVER",
      metadata: { server_host: "anonymous.example" },
      settings: {},
      mnemonic: "anonbannerabcd"
    });

    const owned = await repository.findAllByOwner(owner);

    expect(owned).toHaveLength(1);
    expect(owned[0]?.owner).toBe(owner);
    expect(owned[0]?.mnemonic).toBe("ownerbannerabcd");
  });
});
