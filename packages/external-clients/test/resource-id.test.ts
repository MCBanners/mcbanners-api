import { describe, expect, it } from "bun:test";

import { normalizeResourceId, normalizeResourcePlatform } from "../src/resource-id";

describe("normalizeResourcePlatform", () => {
  it("normalizes known platform names case-insensitively", () => {
    expect(normalizeResourcePlatform("spigot")).toBe("SPIGOT");
    expect(normalizeResourcePlatform("CurseForge")).toBe("CURSEFORGE");
    expect(normalizeResourcePlatform("unknown")).toBeNull();
  });
});

describe("normalizeResourceId", () => {
  it("preserves numeric string semantics for numeric-id platforms", () => {
    expect(normalizeResourceId("SPIGOT", "00123")).toBe("00123");
    expect(normalizeResourceId("CURSEFORGE", "00123")).toBe("00123");
    expect(normalizeResourceId("BUILTBYBIT", "00123")).toBe("00123");
    expect(normalizeResourceId("POLYMART", "00123")).toBe("00123");
  });

  it("does not blanket-lowercase numeric-id platform ids", () => {
    expect(normalizeResourceId("spigot", "SomePlugin")).toBe("SomePlugin");
    expect(normalizeResourceId("curseforge", "ABC123")).toBe("ABC123");
  });

  it("lowercases Modrinth ids intentionally", () => {
    expect(normalizeResourceId("MODRINTH", "Sodium")).toBe("sodium");
    expect(normalizeResourceId("modrinth", "TeamProject")).toBe("teamproject");
  });

  it("lowercases Hangar author and slug ids intentionally", () => {
    expect(normalizeResourceId("HANGAR", "PaperMC/Eternal-Light")).toBe("papermc/eternal-light");
  });

  it("lowercases Ore plugin ids to match Java behavior", () => {
    expect(normalizeResourceId("ORE", "Nucleus")).toBe("nucleus");
  });

  it("preserves ids for unknown platforms", () => {
    expect(normalizeResourceId("UNKNOWN", "MixedCase")).toBe("MixedCase");
  });
});
