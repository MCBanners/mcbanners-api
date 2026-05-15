import type { AuthorBannerData } from "../../src/layouts/author";

export const FIXTURE_SPIGOT_AUTHOR: AuthorBannerData = {
  author: {
    name: "md_5",
    resourceCount: 42,
    logoBase64: null,
    downloadCount: 1_250_000,
    likes: null,
    reviews: 320
  },
  backend: "SPIGOT"
};

export const FIXTURE_MODRINTH_AUTHOR: AuthorBannerData = {
  author: {
    name: "jellysquid3",
    resourceCount: 7,
    logoBase64: null,
    downloadCount: 3_500_000,
    likes: 98_000,
    reviews: null
  },
  backend: "MODRINTH"
};

export const FIXTURE_HANGAR_AUTHOR: AuthorBannerData = {
  author: {
    name: "papermc",
    resourceCount: 3,
    logoBase64: null,
    downloadCount: 50_000,
    likes: 410,
    reviews: 120_000
  },
  backend: "HANGAR"
};
