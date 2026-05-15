export declare const compatibilityManifest: {
  readonly sourceRepos: ["banner-api", "mc-api", "discord-api"];
  readonly bannerTypes: [
    {
      readonly name: "SPONGE_AUTHOR";
      readonly ordinal: 0;
      readonly relatedServiceBackend: "ORE";
    },
    {
      readonly name: "SPONGE_RESOURCE";
      readonly ordinal: 1;
      readonly relatedServiceBackend: "ORE";
    },
    {
      readonly name: "SPIGOT_AUTHOR";
      readonly ordinal: 2;
      readonly relatedServiceBackend: "SPIGOT";
    },
    {
      readonly name: "SPIGOT_RESOURCE";
      readonly ordinal: 3;
      readonly relatedServiceBackend: "SPIGOT";
    },
    {
      readonly name: "MINECRAFT_SERVER";
      readonly ordinal: 4;
      readonly relatedServiceBackend: null;
    },
    {
      readonly name: "CURSEFORGE_AUTHOR";
      readonly ordinal: 5;
      readonly relatedServiceBackend: "CURSEFORGE";
    },
    {
      readonly name: "CURSEFORGE_RESOURCE";
      readonly ordinal: 6;
      readonly relatedServiceBackend: "CURSEFORGE";
    },
    {
      readonly name: "MODRINTH_AUTHOR";
      readonly ordinal: 7;
      readonly relatedServiceBackend: "MODRINTH";
    },
    {
      readonly name: "MODRINTH_RESOURCE";
      readonly ordinal: 8;
      readonly relatedServiceBackend: "MODRINTH";
    },
    {
      readonly name: "BUILTBYBIT_AUTHOR";
      readonly ordinal: 9;
      readonly relatedServiceBackend: "BUILTBYBIT";
    },
    {
      readonly name: "BUILTBYBIT_RESOURCE";
      readonly ordinal: 10;
      readonly relatedServiceBackend: "BUILTBYBIT";
    },
    {
      readonly name: "BUILTBYBIT_MEMBER";
      readonly ordinal: 11;
      readonly relatedServiceBackend: "BUILTBYBIT";
    },
    {
      readonly name: "POLYMART_AUTHOR";
      readonly ordinal: 12;
      readonly relatedServiceBackend: "POLYMART";
    },
    {
      readonly name: "POLYMART_RESOURCE";
      readonly ordinal: 13;
      readonly relatedServiceBackend: "POLYMART";
    },
    {
      readonly name: "POLYMART_TEAM";
      readonly ordinal: 14;
      readonly relatedServiceBackend: "POLYMART";
    },
    {
      readonly name: "HANGAR_AUTHOR";
      readonly ordinal: 15;
      readonly relatedServiceBackend: "HANGAR";
    },
    {
      readonly name: "HANGAR_RESOURCE";
      readonly ordinal: 16;
      readonly relatedServiceBackend: "HANGAR";
    },
    {
      readonly name: "DISCORD_USER";
      readonly ordinal: 17;
      readonly relatedServiceBackend: null;
    }
  ];
  readonly serviceBackends: [
    {
      readonly name: "SPIGOT";
    },
    {
      readonly name: "ORE";
    },
    {
      readonly name: "CURSEFORGE";
    },
    {
      readonly name: "MODRINTH";
    },
    {
      readonly name: "BUILTBYBIT";
    },
    {
      readonly name: "POLYMART";
    },
    {
      readonly name: "HANGAR";
    }
  ];
  readonly outputFormats: [
    {
      readonly name: "PNG";
      readonly alias: "png";
    },
    {
      readonly name: "JPEG";
      readonly alias: "jpg";
    }
  ];
  readonly backgroundTemplates: [
    {
      readonly name: "BLUE_RADIAL";
      readonly textTheme: "DARK";
      readonly fileName: "blue_radial.png";
    },
    {
      readonly name: "BURNING_ORANGE";
      readonly textTheme: "LIGHT";
      readonly fileName: "burning_orange.png";
    },
    {
      readonly name: "MANGO";
      readonly textTheme: "DARK";
      readonly fileName: "mango.png";
    },
    {
      readonly name: "MOONLIGHT_PURPLE";
      readonly textTheme: "LIGHT";
      readonly fileName: "moonlight_purple.png";
    },
    {
      readonly name: "ORANGE_RADIAL";
      readonly textTheme: "DARK";
      readonly fileName: "orange_radial.png";
    },
    {
      readonly name: "VELVET";
      readonly textTheme: "DARK";
      readonly fileName: "velvet.png";
    },
    {
      readonly name: "YELLOW";
      readonly textTheme: "DARK";
      readonly fileName: "yellow.png";
    },
    {
      readonly name: "MALACHITE_GREEN";
      readonly textTheme: "DARK";
      readonly fileName: "malachite_green.png";
    },
    {
      readonly name: "DARK_GUNMETAL";
      readonly textTheme: "LIGHT";
      readonly fileName: "dark_gunmetal.png";
    },
    {
      readonly name: "PURPLE_TAUPE";
      readonly textTheme: "LIGHT";
      readonly fileName: "purple_taupe.png";
    },
    {
      readonly name: "LIGHT_MODE";
      readonly textTheme: "DARK";
      readonly fileName: "light_mode.png";
    }
  ];
  readonly fontFaces: [
    {
      readonly name: "MONTSERRAT";
      readonly regularFileName: "MontserratRegular.ttf";
      readonly boldFileName: "MontserratBold.ttf";
    },
    {
      readonly name: "OPEN_SANS";
      readonly regularFileName: "OpenSansRegular.ttf";
      readonly boldFileName: "OpenSansBold.ttf";
    },
    {
      readonly name: "POPPINS";
      readonly regularFileName: "PoppinsRegular.ttf";
      readonly boldFileName: "PoppinsBold.ttf";
    },
    {
      readonly name: "RALEWAY";
      readonly regularFileName: "RalewayRegular.ttf";
      readonly boldFileName: "RalewayBold.ttf";
    },
    {
      readonly name: "SOURCE_SANS_PRO";
      readonly regularFileName: "SourceSansProRegular.ttf";
      readonly boldFileName: "SourceSansProBold.ttf";
    },
    {
      readonly name: "JETBRAINS_MONO";
      readonly regularFileName: "JetbrainsMonoRegular.ttf";
      readonly boldFileName: "JetbrainsMonoBold.ttf";
    },
    {
      readonly name: "INTER";
      readonly regularFileName: "InterRegular.ttf";
      readonly boldFileName: "InterBold.ttf";
    },
    {
      readonly name: "ROBOTO";
      readonly regularFileName: "RobotoRegular.ttf";
      readonly boldFileName: "RobotoBold.ttf";
    }
  ];
  readonly textAlignments: [
    {
      readonly name: "RIGHT";
    },
    {
      readonly name: "CENTER";
    },
    {
      readonly name: "LEFT";
    }
  ];
  readonly textThemes: [
    {
      readonly name: "LIGHT";
    },
    {
      readonly name: "DARK";
    }
  ];
  readonly routes: [
    {
      readonly method: "GET";
      readonly publicPath: "/banner/author/:platform/:id/isValid";
      readonly legacySource: "banner-api";
      readonly behavior: "Validate an author and return { valid: boolean }.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/author/:platform/:id/banner.:outputType";
      readonly legacySource: "banner-api";
      readonly behavior: "Render author banner as png or jpg.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/resource/:platform/:id/isValid";
      readonly legacySource: "banner-api";
      readonly behavior: "Validate a resource and return { valid: boolean }.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/resource/:platform/:id/banner.:outputType";
      readonly legacySource: "banner-api";
      readonly behavior: "Render resource banner as png or jpg.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/server/:host/:port/isValid";
      readonly legacySource: "banner-api";
      readonly behavior: "Validate Minecraft server status for banner rendering.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/server/:host/:port/banner.:outputType";
      readonly legacySource: "banner-api";
      readonly behavior: "Render Minecraft server banner as png or jpg.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/member/builtbybit/:id/isValid";
      readonly legacySource: "banner-api";
      readonly behavior: "Validate BuiltByBit member.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/member/builtbybit/:id/banner.:outputType";
      readonly legacySource: "banner-api";
      readonly behavior: "Render BuiltByBit member banner.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/team/polymart/:id/isValid";
      readonly legacySource: "banner-api";
      readonly behavior: "Validate Polymart team.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/team/polymart/:id/banner.:outputType";
      readonly legacySource: "banner-api";
      readonly behavior: "Render Polymart team banner.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/discord/user/:id/isValid";
      readonly legacySource: "banner-api";
      readonly behavior: "Validate Discord user.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/discord/user/:id/banner.:outputType";
      readonly legacySource: "banner-api";
      readonly behavior: "Render Discord user banner; saved recall marks Discord implementation incomplete.";
    },
    {
      readonly method: "POST";
      readonly publicPath: "/banner/saved/save";
      readonly legacySource: "banner-api";
      readonly behavior: "Save banner type, metadata, settings and return mnemonic-backed saved_banner row.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/saved/:mnemonic.:outputType";
      readonly legacySource: "banner-api";
      readonly behavior: "Recall saved banner by mnemonic and render png or jpg.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/manage_saved/find/all";
      readonly legacySource: "banner-api";
      readonly behavior: "Return authenticated user's saved banners.";
    },
    {
      readonly method: "PUT";
      readonly publicPath: "/banner/manage_saved/update/:id";
      readonly legacySource: "banner-api";
      readonly behavior: "Update authenticated user's saved banner settings.";
    },
    {
      readonly method: "DELETE";
      readonly publicPath: "/banner/manage_saved/delete/:id";
      readonly legacySource: "banner-api";
      readonly behavior: "Delete authenticated user's saved banner.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/svc/constants";
      readonly legacySource: "banner-api";
      readonly behavior: "Return template, font, and text alignment display constants.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/svc/defaults/:type";
      readonly legacySource: "banner-api";
      readonly behavior: "Return namespaced default settings for author/resource/member/team/discord/server/all.";
    },
    {
      readonly method: "GET";
      readonly publicPath: "/banner/svc/template/:template";
      readonly legacySource: "banner-api";
      readonly behavior: "Return template preview image as png.";
    }
  ];
  readonly savedBannerSchema: {
    readonly table: "saved_banner";
    readonly columns: [
      {
        readonly name: "id";
        readonly sqlType: "BIGINT(20) AUTO_INCREMENT";
        readonly nullable: false;
        readonly notes: "Primary key.";
      },
      {
        readonly name: "type";
        readonly sqlType: "INT(5)";
        readonly nullable: false;
        readonly notes: "Java BannerType ordinal.";
      },
      {
        readonly name: "owner";
        readonly sqlType: "BINARY(16)";
        readonly nullable: true;
        readonly notes: "UUID owner when authenticated.";
      },
      {
        readonly name: "mnemonic";
        readonly sqlType: "VARCHAR(14)";
        readonly nullable: false;
        readonly notes: "Unique public recall slug.";
      },
      {
        readonly name: "metadata";
        readonly sqlType: "LONGTEXT";
        readonly nullable: false;
        readonly notes: "JSON object.";
      },
      {
        readonly name: "settings";
        readonly sqlType: "LONGTEXT";
        readonly nullable: false;
        readonly notes: "JSON object of namespace__key values.";
      }
    ];
    readonly relatedTables: [
      "banner_settings legacy id/name/value table still existed in V1 migration"
    ];
  };
  readonly parameterDefaults: [
    {
      readonly bannerKind: "author";
      readonly namespaces: [
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        }
      ];
    },
    {
      readonly bannerKind: "resource";
      readonly namespaces: [
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          readonly name: "stars";
          readonly kind: "spaceable";
          readonly defaults: {
            readonly x: 180;
            readonly y: 51;
            readonly gap: 16;
          };
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        }
      ];
    },
    {
      readonly bannerKind: "server";
      readonly namespaces: [
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        }
      ];
    },
    {
      readonly bannerKind: "member";
      readonly namespaces: [
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        }
      ];
    },
    {
      readonly bannerKind: "team";
      readonly namespaces: [
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        }
      ];
    },
    {
      readonly bannerKind: "discord";
      readonly namespaces: [
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        },
        {
          name: string;
          kind: "background" | "square-sizeable" | "spaceable" | "text";
          defaults: Record<string, string | number | boolean>;
        }
      ];
    }
  ];
  readonly mcApi: {
    readonly routes: [
      {
        readonly method: "GET";
        readonly publicPath: "/mc/server?host=:host&port=:port";
        readonly legacySource: "mc-api";
        readonly behavior: "Return Minecraft server status JSON or 404.";
      },
      {
        readonly method: "GET";
        readonly publicPath: "/mc/icon?host=:host&port=:port";
        readonly legacySource: "mc-api";
        readonly behavior: "Return decoded server icon png or 404.";
      }
    ];
    readonly responseShape: {
      readonly host: "string";
      readonly port: "number";
      readonly version: "string";
      readonly players: {
        readonly online: "number";
        readonly max: "number";
      };
      readonly motd: {
        readonly raw: "string";
        readonly colorless: "string";
        readonly formatted: "string";
      };
      readonly icon: "base64 string without data:image/png prefix";
    };
  };
  readonly discordCommands: [
    {
      readonly command: "/banner create type platform id template";
      readonly behavior: "Builds a banner URL and replies with it only when the API returns HTTP 200.";
      readonly urlTemplate: "https://api.mcbanners.com/banner/{type}/{platform}/{id}/banner.png?template={TEMPLATE}";
    },
    {
      readonly command: "/server icon host [port]";
      readonly behavior: "Defers, calls /mc/icon with default port 25565, replies with URL on 200 or 'Server not found!'.";
      readonly urlTemplate: "https://api.mcbanners.com/mc/icon?host={host}&port={port|25565}";
    },
    {
      readonly command: "/server info host [port]";
      readonly behavior: "Defers, calls /mc/server with default port 25565, sends an embed with host/version/players/MOTD and icon thumbnail.";
      readonly urlTemplate: "https://api.mcbanners.com/mc/server?host={host}&port={port|25565}";
    }
  ];
};
//# sourceMappingURL=manifest.d.ts.map
