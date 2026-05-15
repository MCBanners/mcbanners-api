import { describe, it, expect } from "bun:test";
import { parseResourceRoutePath, extractRouteRemainder } from "../src/routes/resource-route-parser";

// ---------------------------------------------------------------------------
// parseResourceRoutePath
// ---------------------------------------------------------------------------

describe("parseResourceRoutePath", () => {
  // ---- valid inputs ----

  it("single-segment id with banner.png action", () => {
    expect(parseResourceRoutePath("12345/banner.png")).toEqual({
      id: "12345",
      action: "banner.png"
    });
  });

  it("single-segment id with banner.jpg action", () => {
    expect(parseResourceRoutePath("sodium/banner.jpg")).toEqual({
      id: "sodium",
      action: "banner.jpg"
    });
  });

  it("single-segment id with isValid action", () => {
    expect(parseResourceRoutePath("12345/isValid")).toEqual({
      id: "12345",
      action: "isValid"
    });
  });

  it("two-segment Hangar id with banner.png action", () => {
    expect(parseResourceRoutePath("papermc/eternal-light/banner.png")).toEqual({
      id: "papermc/eternal-light",
      action: "banner.png"
    });
  });

  it("two-segment Hangar id with banner.jpg action", () => {
    expect(parseResourceRoutePath("author/slug/banner.jpg")).toEqual({
      id: "author/slug",
      action: "banner.jpg"
    });
  });

  it("two-segment Hangar id with isValid action", () => {
    expect(parseResourceRoutePath("papermc/eternal-light/isValid")).toEqual({
      id: "papermc/eternal-light",
      action: "isValid"
    });
  });

  it("three-segment id (too-many-slashes) — id captures all but last segment", () => {
    // Hangar ids that somehow have extra slashes still parse safely:
    // the last segment is always the action.
    const result = parseResourceRoutePath("too/many/slashes/banner.png");
    expect(result).toEqual({
      id: "too/many/slashes",
      action: "banner.png"
    });
  });

  it("three-segment id with isValid", () => {
    const result = parseResourceRoutePath("too/many/slashes/isValid");
    expect(result).toEqual({ id: "too/many/slashes", action: "isValid" });
  });

  it("unknown action is returned as-is (caller decides validity)", () => {
    const result = parseResourceRoutePath("12345/banner.webp");
    expect(result).toEqual({ id: "12345", action: "banner.webp" });
  });

  it("unknown action with multi-segment id", () => {
    const result = parseResourceRoutePath("a/b/banner.webp");
    expect(result).toEqual({ id: "a/b", action: "banner.webp" });
  });

  // ---- invalid inputs that return null ----

  it("returns null for empty string", () => {
    expect(parseResourceRoutePath("")).toBeNull();
  });

  it("returns null for single segment with no slash — missing id", () => {
    // "banner.png" alone means there is no id segment
    expect(parseResourceRoutePath("banner.png")).toBeNull();
  });

  it("returns null for bare action with no id — 'isValid' alone", () => {
    expect(parseResourceRoutePath("isValid")).toBeNull();
  });

  it("returns null when id is empty (leading slash → empty id)", () => {
    // remainder starting with "/" → after split, id = ""
    expect(parseResourceRoutePath("/banner.png")).toBeNull();
  });

  it("returns null for trailing slash — empty action", () => {
    expect(parseResourceRoutePath("12345/")).toBeNull();
  });

  it("returns null for double slash only", () => {
    expect(parseResourceRoutePath("/")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractRouteRemainder
// ---------------------------------------------------------------------------

describe("extractRouteRemainder", () => {
  it("extracts remainder after platform for spigot", () => {
    expect(extractRouteRemainder("/banner/resource/spigot/12345/banner.png", "spigot")).toBe(
      "12345/banner.png"
    );
  });

  it("extracts remainder after platform for modrinth", () => {
    expect(extractRouteRemainder("/banner/resource/modrinth/sodium/isValid", "modrinth")).toBe(
      "sodium/isValid"
    );
  });

  it("extracts remainder after platform for Hangar (multi-segment id)", () => {
    expect(
      extractRouteRemainder("/banner/resource/hangar/papermc/eternal-light/banner.png", "hangar")
    ).toBe("papermc/eternal-light/banner.png");
  });

  it("extracts remainder after platform for CurseForge", () => {
    expect(extractRouteRemainder("/banner/resource/curseforge/12345/isValid", "curseforge")).toBe(
      "12345/isValid"
    );
  });

  it("extracts remainder after platform for Ore", () => {
    expect(extractRouteRemainder("/banner/resource/ore/nucleus/banner.png", "ore")).toBe(
      "nucleus/banner.png"
    );
  });

  it("preserves platform case when matching (uppercase platform)", () => {
    expect(extractRouteRemainder("/banner/resource/SPIGOT/12345/banner.png", "SPIGOT")).toBe(
      "12345/banner.png"
    );
  });

  it("mixed case platform is matched case-sensitively", () => {
    expect(extractRouteRemainder("/banner/resource/Spigot/12345/banner.png", "Spigot")).toBe(
      "12345/banner.png"
    );
  });

  it("returns null when platform marker is not found", () => {
    expect(
      extractRouteRemainder("/banner/resource/modrinth/sodium/banner.png", "spigot")
    ).toBeNull();
  });

  it("returns null for empty pathname", () => {
    expect(extractRouteRemainder("", "spigot")).toBeNull();
  });

  it("works when mounted at /server alias", () => {
    // The route is also mounted at /server for dev alias
    expect(extractRouteRemainder("/server/spigot/12345/banner.png", "spigot")).toBe(
      "12345/banner.png"
    );
  });
});

// ---------------------------------------------------------------------------
// Combined: extractRouteRemainder → parseResourceRoutePath pipeline
// ---------------------------------------------------------------------------

describe("combined route parsing pipeline", () => {
  const parse = (pathname: string, platform: string) => {
    const remainder = extractRouteRemainder(pathname, platform);
    if (remainder === null) return null;
    return parseResourceRoutePath(remainder);
  };

  it("spigot single-segment id banner.png", () => {
    expect(parse("/banner/resource/spigot/12345/banner.png", "spigot")).toEqual({
      id: "12345",
      action: "banner.png"
    });
  });

  it("modrinth single-segment id isValid", () => {
    expect(parse("/banner/resource/modrinth/sodium/isValid", "modrinth")).toEqual({
      id: "sodium",
      action: "isValid"
    });
  });

  it("hangar two-segment id banner.jpg", () => {
    expect(parse("/banner/resource/hangar/papermc/eternal-light/banner.jpg", "hangar")).toEqual({
      id: "papermc/eternal-light",
      action: "banner.jpg"
    });
  });

  it("hangar two-segment id isValid", () => {
    expect(parse("/banner/resource/hangar/papermc/eternal-light/isValid", "hangar")).toEqual({
      id: "papermc/eternal-light",
      action: "isValid"
    });
  });

  it("spigot with slash in id — extra slash safely produces long id", () => {
    // /banner/resource/spigot/a/b/banner.png — Spigot doesn't use slash ids,
    // but the parser safely returns id="a/b". The Spigot client will return null.
    expect(parse("/banner/resource/spigot/a/b/banner.png", "spigot")).toEqual({
      id: "a/b",
      action: "banner.png"
    });
  });

  it("hangar too-many-slashes — id captures all intermediate segments", () => {
    // /banner/resource/hangar/too/many/slashes/banner.png
    // The Hangar client will return null for an invalid author/slug/extra path.
    expect(parse("/banner/resource/hangar/too/many/slashes/banner.png", "hangar")).toEqual({
      id: "too/many/slashes",
      action: "banner.png"
    });
  });

  it("missing id — /banner/resource/spigot/banner.png returns null", () => {
    // Only two segments after mount: platform + action, no id.
    expect(parse("/banner/resource/spigot/banner.png", "spigot")).toBeNull();
  });

  it("unknown action is passed through — caller rejects it as 400", () => {
    expect(parse("/banner/resource/spigot/12345/banner.webp", "spigot")).toEqual({
      id: "12345",
      action: "banner.webp"
    });
  });
});
