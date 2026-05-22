import { type Dialect, Kysely, type KyselyConfig } from "kysely";

import type { MCBannersDatabase } from "./schema";

export type CreateDbOptions = Omit<KyselyConfig, "dialect"> & {
  readonly dialect: Dialect;
};

export const createDb = (options: CreateDbOptions): Kysely<MCBannersDatabase> =>
  new Kysely<MCBannersDatabase>(options);
