import { describe, expect, it } from "bun:test";

import { parseCompatFixture } from "../src/fixture";

describe("parseCompatFixture", () => {
  it("parses enabled and disabled route cases", () => {
    const fixture = parseCompatFixture({
      name: "compat",
      cases: [
        {
          id: "json-case",
          enabled: true,
          type: "json",
          method: "GET",
          path: "/mc/server?host=example.org"
        },
        {
          id: "saved-placeholder",
          enabled: false,
          disabledReason: "requires shared DB fixture",
          type: "image",
          method: "GET",
          path: "/banner/saved/abcdefghijklmn.png"
        }
      ]
    });

    expect(fixture.name).toBe("compat");
    expect(fixture.cases).toHaveLength(2);
    expect(fixture.cases[1]?.enabled).toBe(false);
  });

  it("rejects duplicate case ids", () => {
    expect(() =>
      parseCompatFixture({
        name: "compat",
        cases: [
          { id: "duplicate", enabled: true, type: "json", method: "GET", path: "/a" },
          { id: "duplicate", enabled: true, type: "json", method: "GET", path: "/b" }
        ]
      })
    ).toThrow("Duplicate");
  });

  it("parses expectedLegacyFailure reason", () => {
    const fixture = parseCompatFixture({
      name: "compat",
      cases: [
        {
          id: "known-failure",
          enabled: true,
          type: "json",
          method: "GET",
          path: "/mc/server?host=mc.hypixel.net",
          expectedLegacyFailure: { reason: "Legacy returns 400" }
        }
      ]
    });

    expect(fixture.cases[0]?.expectedLegacyFailure?.reason).toBe("Legacy returns 400");
  });

  it("ignores malformed expectedLegacyFailure (missing reason)", () => {
    const fixture = parseCompatFixture({
      name: "compat",
      cases: [
        {
          id: "bad-failure",
          enabled: true,
          type: "json",
          method: "GET",
          path: "/mc/server?host=example.org",
          expectedLegacyFailure: { notReason: 123 }
        }
      ]
    });

    expect(fixture.cases[0]?.expectedLegacyFailure).toBeUndefined();
  });
});
