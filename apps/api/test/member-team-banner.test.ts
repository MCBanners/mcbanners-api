import { describe, expect, it } from "bun:test";

import type { MemberBannerData, TeamBannerData } from "@mcbanners/banner-renderer";
import { MemoryCache } from "@mcbanners/cache";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import { type AppCaches, createApp } from "../src/app";

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
  calls = 0;

  constructor(private readonly data: MemberBannerData | null) {}

  getMemberBannerData(): Promise<MemberBannerData | null> {
    this.calls += 1;
    return Promise.resolve(this.data);
  }
}

class FixtureTeamClient {
  calls = 0;

  constructor(private readonly data: TeamBannerData | null) {}

  getTeamBannerData(): Promise<TeamBannerData | null> {
    this.calls += 1;
    return Promise.resolve(this.data);
  }
}

const makeApp = (
  member: MemberBannerData | null = MEMBER,
  team: TeamBannerData | null = TEAM,
  caches?: AppCaches,
  memberClient = new FixtureMemberClient(member),
  teamClient = new FixtureTeamClient(team)
) =>
  createApp(
    createFixtureAdapter(MC_STATUS_FIXTURES),
    {},
    caches,
    undefined,
    undefined,
    { BUILTBYBIT: memberClient },
    { POLYMART: teamClient }
  );

describe("member and team banner routes", () => {
  it("serves warm member and team images before source-cache lookups", async () => {
    const memberClient = new FixtureMemberClient(MEMBER);
    const teamClient = new FixtureTeamClient(TEAM);
    const memberData = new MemoryCache({ ttlMs: 60_000, maxEntries: 50 });
    const memberImage = new MemoryCache({ ttlMs: 60_000, maxEntries: 50 });
    const teamData = new MemoryCache({ ttlMs: 60_000, maxEntries: 50 });
    const teamImage = new MemoryCache({ ttlMs: 60_000, maxEntries: 50 });
    const app = makeApp(
      MEMBER,
      TEAM,
      {
        memberData,
        memberBannerImage: memberImage,
        teamData,
        teamBannerImage: teamImage
      },
      memberClient,
      teamClient
    );

    const memberPath = "/banner/member/builtbybit/99/banner.png";
    const teamPath = "/banner/team/polymart/789/banner.png";
    const firstMember = await app.request(memberPath);
    const firstTeam = await app.request(teamPath);
    const secondMember = await app.request(memberPath);
    const secondTeam = await app.request(teamPath);

    expect(firstMember.status).toBe(200);
    expect(firstTeam.status).toBe(200);
    expect(secondMember.status).toBe(200);
    expect(secondTeam.status).toBe(200);
    expect(memberClient.calls).toBe(1);
    expect(teamClient.calls).toBe(1);
    expect(memberData.stats().hits).toBe(0);
    expect(teamData.stats().hits).toBe(0);
    expect(memberImage.stats().hits).toBe(1);
    expect(teamImage.stats().hits).toBe(1);
  });

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
