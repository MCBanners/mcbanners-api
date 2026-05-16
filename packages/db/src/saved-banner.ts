import { createPool } from "mysql2/promise";

import type { Kysely } from "kysely";

import {
  bannerTypeByName,
  bannerTypeOrdinalMap,
  generateMnemonic,
  type BannerType
} from "@mcbanners/domain";

import type { MCBannersDatabase, NewSavedBannerRow, SavedBannerRow } from "./schema";

export { generateMnemonic } from "@mcbanners/domain";

export type SavedBannerJsonMap = Readonly<Record<string, string>>;

export interface InsertSavedBannerInput {
  readonly bannerType: BannerType;
  readonly metadata: SavedBannerJsonMap;
  readonly settings?: SavedBannerJsonMap | null;
  /**
   * Legacy owner UUID. Current product saves are anonymous, so omitted owner is
   * persisted as null.
   */
  readonly owner?: string | null;
  readonly mnemonic?: string;
}

export interface SavedBannerRepository {
  findByMnemonic(mnemonic: string): Promise<SavedBannerRow | null>;
  findAllByOwner(owner: string): Promise<readonly SavedBannerRow[]>;
  insertSavedBanner(input: InsertSavedBannerInput): Promise<SavedBannerRow>;
}

export const encodeBannerTypeOrdinal = (bannerType: BannerType): number =>
  bannerTypeByName[bannerType].ordinal;

export const decodeBannerTypeOrdinal = (ordinal: number): BannerType => {
  const bannerType = bannerTypeOrdinalMap[ordinal];

  if (bannerType === undefined) {
    throw new RangeError(`Unknown legacy BannerType ordinal: ${String(ordinal)}`);
  }

  return bannerType;
};

const savedBannerJsonMapValueError = "Saved banner JSON must be an object with string values";

export const parseSavedBannerJsonMap = (json: string): SavedBannerJsonMap => {
  const parsed: unknown = JSON.parse(json);

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError(savedBannerJsonMapValueError);
  }

  const entries = Object.entries(parsed);
  if (entries.some(([, value]) => typeof value !== "string")) {
    throw new TypeError(savedBannerJsonMapValueError);
  }

  return Object.freeze(Object.fromEntries(entries) as Record<string, string>);
};

export const parseSavedBannerMetadata = parseSavedBannerJsonMap;
export const parseSavedBannerSettings = parseSavedBannerJsonMap;

export const serializeSavedBannerJsonMap = (value: SavedBannerJsonMap): string =>
  JSON.stringify(value);

export const serializeSavedBannerMetadata = serializeSavedBannerJsonMap;
export const serializeSavedBannerSettings = serializeSavedBannerJsonMap;

export const prepareSavedBannerInsert = (input: InsertSavedBannerInput): NewSavedBannerRow => ({
  type: encodeBannerTypeOrdinal(input.bannerType),
  owner: input.owner ?? null,
  mnemonic: input.mnemonic ?? generateMnemonic(),
  metadata: serializeSavedBannerMetadata(input.metadata),
  settings: serializeSavedBannerSettings(input.settings ?? {})
});

const normalizeInsertedId = (insertId: bigint | number | undefined): number => {
  if (insertId === undefined) {
    throw new Error("Saved banner insert did not return an insert id");
  }

  const numericId = typeof insertId === "bigint" ? Number(insertId) : insertId;
  if (!Number.isSafeInteger(numericId)) {
    throw new Error(`Saved banner insert id is not a safe integer: ${String(insertId)}`);
  }

  return numericId;
};

export const createSavedBannerRepository = (
  db: Kysely<MCBannersDatabase>
): SavedBannerRepository => ({
  async findByMnemonic(mnemonic) {
    const row = await db
      .selectFrom("saved_banner")
      .selectAll()
      .where("mnemonic", "=", mnemonic)
      .executeTakeFirst();

    return row ?? null;
  },

  async findAllByOwner(owner) {
    return await db.selectFrom("saved_banner").selectAll().where("owner", "=", owner).execute();
  },

  async insertSavedBanner(input) {
    const insert = prepareSavedBannerInsert(input);
    const result = await db.insertInto("saved_banner").values(insert).executeTakeFirst();
    const id = normalizeInsertedId(result.insertId);

    return {
      id,
      type: insert.type,
      owner: insert.owner ?? null,
      mnemonic: insert.mnemonic,
      metadata: insert.metadata,
      settings: insert.settings
    };
  }
});

/**
 * Read-only corpus query for the saved-banner validator script.
 * Creates a short-lived pool, queries, then destroys it.
 * Only packages/db may import mysql2 directly; scripts should use this helper.
 */
export const readSavedBannerCorpusRows = async (
  databaseUrl: string,
  limit: number | null
): Promise<readonly SavedBannerRow[]> => {
  const pool = createPool(databaseUrl);
  try {
    if (limit !== null) {
      const [rows] = await pool.query(
        "SELECT id, type, mnemonic, metadata, settings FROM saved_banner LIMIT ?",
        [limit]
      );
      return rows as SavedBannerRow[];
    }
    const [rows] = await pool.query(
      "SELECT id, type, mnemonic, metadata, settings FROM saved_banner"
    );
    return rows as SavedBannerRow[];
  } finally {
    await pool.end();
  }
};
