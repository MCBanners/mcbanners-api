import { MysqlDialect, type Dialect, type Kysely } from "kysely";
import { createPool, type PoolOptions } from "mysql2";

import type { MariaDbConnectionConfig } from "@mcbanners/config";

import { createDb } from "./db";
import type { MCBannersDatabase } from "./schema";

const buildPoolOptions = (config: MariaDbConnectionConfig): PoolOptions | string => {
  if (config.databaseUrl !== undefined) {
    return config.databaseUrl;
  }

  const options: PoolOptions = {
    port: config.port,
    connectionLimit: config.connectionLimit,
    waitForConnections: true
  };

  if (config.host !== undefined) {
    options.host = config.host;
  }
  if (config.user !== undefined) {
    options.user = config.user;
  }
  if (config.password !== undefined) {
    options.password = config.password;
  }
  if (config.database !== undefined) {
    options.database = config.database;
  }
  if (config.ssl) {
    options.ssl = {};
  }

  return options;
};

export const createMariaDbDialect = (config: MariaDbConnectionConfig): Dialect => {
  const poolOptions = buildPoolOptions(config);

  return new MysqlDialect({
    pool: typeof poolOptions === "string" ? createPool(poolOptions) : createPool(poolOptions)
  });
};

export const createSavedBannerDb = (config: MariaDbConnectionConfig): Kysely<MCBannersDatabase> =>
  createDb({
    dialect: createMariaDbDialect(config)
  });

export const destroySavedBannerDb = async (db: Kysely<MCBannersDatabase>): Promise<void> => {
  await db.destroy();
};
