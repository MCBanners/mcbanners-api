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
});
