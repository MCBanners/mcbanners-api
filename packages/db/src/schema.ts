import type { ColumnType, Generated, Insertable, Selectable } from "kysely";

export interface SavedBannerTable {
  readonly id: Generated<number>;
  readonly type: number;
  readonly owner: ColumnType<string | null, string | null | undefined, string | null>;
  readonly mnemonic: string;
  readonly metadata: string;
  readonly settings: string;
}

export interface MCBannersDatabase {
  readonly saved_banner: SavedBannerTable;
}

export type SavedBannerRow = Selectable<SavedBannerTable>;
export type NewSavedBannerRow = Insertable<SavedBannerTable>;
