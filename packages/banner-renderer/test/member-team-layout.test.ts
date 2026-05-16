import { beforeAll, describe, expect, it } from "bun:test";

import {
  buildMemberBannerNodes,
  buildTeamBannerNodes,
  createCanvasSurface,
  DEFAULT_MEMBER_BANNER_SETTINGS,
  DEFAULT_TEAM_BANNER_SETTINGS,
  encodeJpg,
  encodePng,
  MEMBER_BANNER_HEIGHT,
  MEMBER_BANNER_WIDTH,
  parseMemberBannerSettings,
  parseTeamBannerSettings,
  registerRendererFonts,
  renderNode,
  TEAM_BANNER_HEIGHT,
  TEAM_BANNER_WIDTH,
  type MemberBannerData,
  type TeamBannerData
} from "../src";

beforeAll(() => {
  registerRendererFonts();
});

const MEMBER: MemberBannerData = {
  member: {
    name: "DevUser",
    rank: "Supreme",
    joinDate: "5/15/2024",
    logoBase64: null,
    posts: 1250,
    positiveFeedback: 40,
    negativeFeedback: 5
  }
};

const TEAM: TeamBannerData = {
  team: {
    name: "PluginTeam",
    logoBase64: null,
    resourceCount: 12,
    resourceDownloads: 250_000,
    resourceRatings: 3400,
    resourceAverageRating: 4
  }
};

describe("member banner layout", () => {
  it("uses Java MemberParameters defaults", () => {
    expect(parseMemberBannerSettings({})).toEqual(DEFAULT_MEMBER_BANNER_SETTINGS);
  });

  it("builds Java-compatible member nodes", () => {
    expect(buildMemberBannerNodes(MEMBER, DEFAULT_MEMBER_BANNER_SETTINGS)).toMatchSnapshot();
  });

  it("renders deterministic PNG and JPG bytes", async () => {
    const nodes = buildMemberBannerNodes(MEMBER, DEFAULT_MEMBER_BANNER_SETTINGS);
    const pngSurface = createCanvasSurface(MEMBER_BANNER_WIDTH, MEMBER_BANNER_HEIGHT);
    const jpgSurface = createCanvasSurface(MEMBER_BANNER_WIDTH, MEMBER_BANNER_HEIGHT);

    for (const node of nodes) {
      await renderNode(pngSurface, node);
      await renderNode(jpgSurface, node);
    }

    expect((await encodePng(pngSurface)).length).toBeGreaterThan(0);
    expect((await encodeJpg(jpgSurface)).length).toBeGreaterThan(0);
  });
});

describe("team banner layout", () => {
  it("uses Java TeamParameters defaults", () => {
    expect(parseTeamBannerSettings({})).toEqual(DEFAULT_TEAM_BANNER_SETTINGS);
  });

  it("builds Java-compatible team nodes", () => {
    expect(buildTeamBannerNodes(TEAM, DEFAULT_TEAM_BANNER_SETTINGS)).toMatchSnapshot();
  });

  it("renders deterministic PNG and JPG bytes", async () => {
    const nodes = buildTeamBannerNodes(TEAM, DEFAULT_TEAM_BANNER_SETTINGS);
    const pngSurface = createCanvasSurface(TEAM_BANNER_WIDTH, TEAM_BANNER_HEIGHT);
    const jpgSurface = createCanvasSurface(TEAM_BANNER_WIDTH, TEAM_BANNER_HEIGHT);

    for (const node of nodes) {
      await renderNode(pngSurface, node);
      await renderNode(jpgSurface, node);
    }

    expect((await encodePng(pngSurface)).length).toBeGreaterThan(0);
    expect((await encodeJpg(jpgSurface)).length).toBeGreaterThan(0);
  });
});
