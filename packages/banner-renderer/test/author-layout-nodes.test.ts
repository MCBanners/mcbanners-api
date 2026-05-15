import { describe, expect, it } from "bun:test";

import {
  buildAuthorBannerNodes,
  DEFAULT_AUTHOR_BANNER_SETTINGS,
  parseAuthorBannerSettings
} from "../src/layouts/author";
import {
  FIXTURE_HANGAR_AUTHOR,
  FIXTURE_MODRINTH_AUTHOR,
  FIXTURE_SPIGOT_AUTHOR
} from "./fixtures/author-fixtures";

describe("Author banner settings", () => {
  it("uses Java AuthorParameters defaults", () => {
    expect(parseAuthorBannerSettings({})).toEqual(DEFAULT_AUTHOR_BANNER_SETTINGS);
  });

  it("parses namespaced text overrides", () => {
    const settings = parseAuthorBannerSettings({
      author_name__display: "Override Author",
      author_name__font_size: "20",
      downloads__enable: "false"
    });

    expect(settings.authorName.display).toBe("Override Author");
    expect(settings.authorName.fontSize).toBe(20);
    expect(settings.downloads.enable).toBe(false);
  });
});

describe("buildAuthorBannerNodes", () => {
  it("builds stable Spigot author nodes", () => {
    expect(
      buildAuthorBannerNodes(FIXTURE_SPIGOT_AUTHOR, parseAuthorBannerSettings({}))
    ).toMatchSnapshot();
  });

  it("uses Modrinth follower wording", () => {
    const nodes = buildAuthorBannerNodes(FIXTURE_MODRINTH_AUTHOR, parseAuthorBannerSettings({}));

    expect(nodes.some((node) => node.type === "text" && node.content === "98K followers")).toBe(
      true
    );
  });

  it("uses Hangar stars and views wording", () => {
    const nodes = buildAuthorBannerNodes(FIXTURE_HANGAR_AUTHOR, parseAuthorBannerSettings({}));

    expect(nodes.some((node) => node.type === "text" && node.content === "410 stars")).toBe(true);
    expect(nodes.some((node) => node.type === "text" && node.content === "120K views")).toBe(true);
  });

  it("uses display overrides and omits disabled text", () => {
    const nodes = buildAuthorBannerNodes(
      FIXTURE_SPIGOT_AUTHOR,
      parseAuthorBannerSettings({
        author_name__display: "Custom Name",
        downloads__enable: "false"
      })
    );

    expect(nodes.some((node) => node.type === "text" && node.content === "Custom Name")).toBe(true);
    expect(nodes.some((node) => node.type === "text" && node.content.includes("downloads"))).toBe(
      false
    );
  });
});
