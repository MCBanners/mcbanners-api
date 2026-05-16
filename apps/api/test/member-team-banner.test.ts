import { describe, expect, it } from "bun:test";

import type { MemberBannerData, TeamBannerData } from "@mcbanners/banner-renderer";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import { createApp } from "../src/app";

const MEMBER: MemberBannerData = {
  member: {
    name: "DevUser",
    rank: "Premium",
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

class FixtureMemberClient {
  constructor(private readonly data: MemberBannerData | null) {}

  getMemberBannerData(): Promise<MemberBannerData | null> {
    return Promise.resolve(this.data);
  }
}

class FixtureTeamClient {
  constructor(private readonly data: TeamBannerData | null) {}

  getTeamBannerData(): Promise<TeamBannerData | null> {
    return Promise.resolve(this.data);
  }
}

const makeApp = (member: MemberBannerData | null = MEMBER, team: TeamBannerData | null = TEAM) =>
  createApp(
    createFixtureAdapter(MC_STATUS_FIXTURES),
    {},
    undefined,
    undefined,
    undefined,
    { BUILTBYBIT: new FixtureMemberClient(member) },
    { POLYMART: new FixtureTeamClient(team) }
  );

describe("member and team banner routes", () => {
  it("renders BuiltByBit member PNG and JPG banners", async () => {
    const app = makeApp();
    const png = await app.request("/banner/member/builtbybit/99/banner.png");
    const jpg = await app.request("/banner/member/builtbybit/99/banner.jpg");

    expect(png.status).toBe(200);
    expect(png.headers.get("Content-Type")).toBe("image/png");
    expect((await png.arrayBuffer()).byteLength).toBeGreaterThan(0);
    expect(jpg.status).toBe(200);
    expect(jpg.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("renders Polymart team PNG and JPG banners", async () => {
    const app = makeApp();
    const png = await app.request("/banner/team/polymart/789/banner.png");
    const jpg = await app.request("/banner/team/polymart/789/banner.jpg");

    expect(png.status).toBe(200);
    expect(png.headers.get("Content-Type")).toBe("image/png");
    expect(jpg.status).toBe(200);
    expect(jpg.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("supports isValid true and false responses", async () => {
    expect(await (await makeApp().request("/banner/member/builtbybit/99/isValid")).json()).toEqual({
      valid: true
    });
    expect(
      await (await makeApp(null, null).request("/banner/team/polymart/789/isValid")).json()
    ).toEqual({
      valid: false
    });
  });

  it("returns 404 for missing data and 400 for unsupported output", async () => {
    const app = makeApp(null, null);
    expect((await app.request("/banner/member/builtbybit/99/banner.png")).status).toBe(404);
    expect((await app.request("/banner/team/polymart/789/banner.webp")).status).toBe(400);
  });
});
