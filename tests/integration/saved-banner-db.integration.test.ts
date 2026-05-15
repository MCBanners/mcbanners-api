import { afterAll, beforeAll, describe, expect, it } from "bun:test";

import { loadApiRuntimeConfig } from "@mcbanners/config";
import {
  createSavedBannerDb,
  createSavedBannerRepository,
  destroySavedBannerDb,
  type SavedBannerRepository
} from "@mcbanners/db";
import type { Kysely } from "kysely";
import type { MCBannersDatabase } from "@mcbanners/db";

const databaseUrl = process.env.DATABASE_URL;
const integrationEnabled = process.env.SAVED_BANNER_DB_INTEGRATION === "1";

const isSafeTestDatabase = (url: string | undefined): boolean => {
  if (url === undefined) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return /test/i.test(parsed.pathname);
  } catch {
    return false;
  }
};

const shouldRun = integrationEnabled && isSafeTestDatabase(databaseUrl);
const describeIntegration = shouldRun ? describe : describe.skip;

describeIntegration("saved_banner MariaDB repository integration", () => {
  let db: Kysely<MCBannersDatabase> | undefined;
  let repository: SavedBannerRepository | undefined;

  beforeAll(async () => {
    const config = loadApiRuntimeConfig(process.env);
    if (!config.savedBannerDb.enabled) {
      throw new Error("Saved banner DB integration requested without DB config");
    }

    db = createSavedBannerDb(config.savedBannerDb.connection);
    repository = createSavedBannerRepository(db);

    await db.schema
      .createTable("saved_banner")
      .ifNotExists()
      .addColumn("id", "integer", (column) => column.autoIncrement().primaryKey())
      .addColumn("type", "integer", (column) => column.notNull())
      .addColumn("owner", "varchar(36)")
      .addColumn("mnemonic", "varchar(14)", (column) => column.notNull().unique())
      .addColumn("metadata", "text", (column) => column.notNull())
      .addColumn("settings", "text", (column) => column.notNull())
      .execute();
  });

  afterAll(async () => {
    if (db !== undefined) {
      await db.deleteFrom("saved_banner").where("mnemonic", "=", "dbintegrationa").execute();
      await destroySavedBannerDb(db);
    }
  });

  it("inserts and reads a saved banner through the MariaDB repository", async () => {
    if (db === undefined || repository === undefined) {
      throw new Error("Integration DB was not initialized");
    }

    await db.deleteFrom("saved_banner").where("mnemonic", "=", "dbintegrationa").execute();

    const inserted = await repository.insertSavedBanner({
      bannerType: "MINECRAFT_SERVER",
      metadata: { server_host: "mc.hypixel.net" },
      settings: {},
      mnemonic: "dbintegrationa"
    });
    const found = await repository.findByMnemonic("dbintegrationa");

    expect(inserted.owner).toBeNull();
    expect(found?.mnemonic).toBe("dbintegrationa");
    expect(found?.metadata).toBe('{"server_host":"mc.hypixel.net"}');
    expect(found?.settings).toBe("{}");
  });
});
