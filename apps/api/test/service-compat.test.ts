import { describe, expect, it } from "bun:test";

import { createApp } from "../src/app";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";

const makeApp = () => createApp(createFixtureAdapter(MC_STATUS_FIXTURES), {});

describe("GET /banner/svc/constants", () => {
  it("returns legacy website constants", async () => {
    const res = await makeApp().request("/banner/svc/constants");
    const body = (await res.json()) as {
      templates: Record<string, string>;
      fonts: Record<string, string>;
      text_alignments: Record<string, string>;
    };

    expect(res.status).toBe(200);
    expect(body.templates.MOONLIGHT_PURPLE).toBe("Moonlight Purple");
    expect(body.fonts.SOURCE_SANS_PRO).toBe("Source Sans Pro");
    expect(body.text_alignments.LEFT).toBe("Left");
  });
});

describe("GET /banner/svc/defaults/:type", () => {
  it("returns all defaults used by the website generator", async () => {
    const res = await makeApp().request("/banner/svc/defaults/all");
    const body = (await res.json()) as Record<string, Record<string, unknown>>;

    expect(res.status).toBe(200);
    expect(body.resource?.background).toEqual({ template: "MOONLIGHT_PURPLE" });
    expect(body.resource?.resource_name).toMatchObject({ x: 104, y: 25 });
    expect(body.author?.author_name).toMatchObject({ font_bold: true });
    expect(body.server?.server_name).toMatchObject({ font_size: 18 });
  });

  it("returns one defaults set by type", async () => {
    const res = await makeApp().request("/banner/svc/defaults/resource");
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.resource_name).toMatchObject({ x: 104, y: 25 });
  });

  it("returns 404 for unknown defaults types", async () => {
    const res = await makeApp().request("/banner/svc/defaults/not-a-type");

    expect(res.status).toBe(404);
  });
});

describe("CORS", () => {
  it("allows browser preflight from the local website", async () => {
    const res = await makeApp().request("/banner/svc/constants", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3001",
        "Access-Control-Request-Method": "GET"
      }
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
