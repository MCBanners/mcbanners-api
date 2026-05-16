import { describe, expect, it } from "bun:test";

import { bannerTypeRecords, bannerTypeValues } from "@mcbanners/domain";
import { compatibilityManifest } from "@mcbanners/domain/compatibility";
import {
  requiredMetadataByBannerType,
  supportedSavedBannerTypes,
  unsupportedSavedBannerTypes
} from "../src/routes/saved-banner";

describe("saved BannerType coverage", () => {
  it("keeps BannerType ordinal order in sync with the compatibility manifest", () => {
    expect(compatibilityManifest.bannerTypes.map((record) => record.name)).toEqual(
      bannerTypeRecords.map((record) => record.name)
    );
    expect(compatibilityManifest.bannerTypes.map((record) => record.ordinal)).toEqual(
      bannerTypeRecords.map((record) => record.ordinal)
    );
  });

  it("has explicit saved recall coverage for every legacy BannerType", () => {
    const covered = new Set([...supportedSavedBannerTypes, ...unsupportedSavedBannerTypes]);

    expect([...covered].sort()).toEqual([...bannerTypeValues].sort());
    expect(unsupportedSavedBannerTypes).toEqual(["DISCORD_USER"]);
    expect(supportedSavedBannerTypes).not.toContain("DISCORD_USER");
  });

  it("requires metadata for every BannerType in exact ordinal order", () => {
    expect(Object.keys(requiredMetadataByBannerType)).toEqual(bannerTypeValues);
    expect(bannerTypeRecords.map((record) => requiredMetadataByBannerType[record.name])).toEqual([
      ["author_id"],
      ["resource_id"],
      ["author_id"],
      ["resource_id"],
      ["server_host"],
      ["author_id"],
      ["resource_id"],
      ["author_id"],
      ["resource_id"],
      ["author_id"],
      ["resource_id"],
      ["member_id"],
      ["author_id"],
      ["resource_id"],
      ["team_id"],
      ["author_id"],
      ["resource_id"],
      ["user_id"]
    ]);
  });
});
