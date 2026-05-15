const background = {
    name: "background",
    kind: "background",
    defaults: { template: "MOONLIGHT_PURPLE" }
};
const logo = {
    name: "logo",
    kind: "square-sizeable",
    defaults: { x: 12, y: 0, size: 80 }
};
const textDefaults = {
    font_size: 14,
    font_bold: false,
    font_face: "SOURCE_SANS_PRO",
    text_align: "LEFT",
    display: "",
    enable: true,
    max_chars: 9999
};
const text = (name, overrides) => ({
    name,
    kind: "text",
    defaults: { x: 0, y: 0, ...textDefaults, ...overrides }
});
const base = [background, logo];
export const compatibilityManifest = {
    sourceRepos: ["banner-api", "mc-api", "discord-api"],
    bannerTypes: [
        { name: "SPONGE_AUTHOR", ordinal: 0, relatedServiceBackend: "ORE" },
        { name: "SPONGE_RESOURCE", ordinal: 1, relatedServiceBackend: "ORE" },
        { name: "SPIGOT_AUTHOR", ordinal: 2, relatedServiceBackend: "SPIGOT" },
        { name: "SPIGOT_RESOURCE", ordinal: 3, relatedServiceBackend: "SPIGOT" },
        { name: "MINECRAFT_SERVER", ordinal: 4, relatedServiceBackend: null },
        { name: "CURSEFORGE_AUTHOR", ordinal: 5, relatedServiceBackend: "CURSEFORGE" },
        { name: "CURSEFORGE_RESOURCE", ordinal: 6, relatedServiceBackend: "CURSEFORGE" },
        { name: "MODRINTH_AUTHOR", ordinal: 7, relatedServiceBackend: "MODRINTH" },
        { name: "MODRINTH_RESOURCE", ordinal: 8, relatedServiceBackend: "MODRINTH" },
        { name: "BUILTBYBIT_AUTHOR", ordinal: 9, relatedServiceBackend: "BUILTBYBIT" },
        { name: "BUILTBYBIT_RESOURCE", ordinal: 10, relatedServiceBackend: "BUILTBYBIT" },
        { name: "BUILTBYBIT_MEMBER", ordinal: 11, relatedServiceBackend: "BUILTBYBIT" },
        { name: "POLYMART_AUTHOR", ordinal: 12, relatedServiceBackend: "POLYMART" },
        { name: "POLYMART_RESOURCE", ordinal: 13, relatedServiceBackend: "POLYMART" },
        { name: "POLYMART_TEAM", ordinal: 14, relatedServiceBackend: "POLYMART" },
        { name: "HANGAR_AUTHOR", ordinal: 15, relatedServiceBackend: "HANGAR" },
        { name: "HANGAR_RESOURCE", ordinal: 16, relatedServiceBackend: "HANGAR" },
        { name: "DISCORD_USER", ordinal: 17, relatedServiceBackend: null }
    ],
    serviceBackends: [
        { name: "SPIGOT" },
        { name: "ORE" },
        { name: "CURSEFORGE" },
        { name: "MODRINTH" },
        { name: "BUILTBYBIT" },
        { name: "POLYMART" },
        { name: "HANGAR" }
    ],
    outputFormats: [
        { name: "PNG", alias: "png" },
        { name: "JPEG", alias: "jpg" }
    ],
    backgroundTemplates: [
        { name: "BLUE_RADIAL", textTheme: "DARK", fileName: "blue_radial.png" },
        { name: "BURNING_ORANGE", textTheme: "LIGHT", fileName: "burning_orange.png" },
        { name: "MANGO", textTheme: "DARK", fileName: "mango.png" },
        { name: "MOONLIGHT_PURPLE", textTheme: "LIGHT", fileName: "moonlight_purple.png" },
        { name: "ORANGE_RADIAL", textTheme: "DARK", fileName: "orange_radial.png" },
        { name: "VELVET", textTheme: "DARK", fileName: "velvet.png" },
        { name: "YELLOW", textTheme: "DARK", fileName: "yellow.png" },
        { name: "MALACHITE_GREEN", textTheme: "DARK", fileName: "malachite_green.png" },
        { name: "DARK_GUNMETAL", textTheme: "LIGHT", fileName: "dark_gunmetal.png" },
        { name: "PURPLE_TAUPE", textTheme: "LIGHT", fileName: "purple_taupe.png" },
        { name: "LIGHT_MODE", textTheme: "DARK", fileName: "light_mode.png" }
    ],
    fontFaces: [
        {
            name: "MONTSERRAT",
            regularFileName: "MontserratRegular.ttf",
            boldFileName: "MontserratBold.ttf"
        },
        {
            name: "OPEN_SANS",
            regularFileName: "OpenSansRegular.ttf",
            boldFileName: "OpenSansBold.ttf"
        },
        { name: "POPPINS", regularFileName: "PoppinsRegular.ttf", boldFileName: "PoppinsBold.ttf" },
        { name: "RALEWAY", regularFileName: "RalewayRegular.ttf", boldFileName: "RalewayBold.ttf" },
        {
            name: "SOURCE_SANS_PRO",
            regularFileName: "SourceSansProRegular.ttf",
            boldFileName: "SourceSansProBold.ttf"
        },
        {
            name: "JETBRAINS_MONO",
            regularFileName: "JetbrainsMonoRegular.ttf",
            boldFileName: "JetbrainsMonoBold.ttf"
        },
        { name: "INTER", regularFileName: "InterRegular.ttf", boldFileName: "InterBold.ttf" },
        { name: "ROBOTO", regularFileName: "RobotoRegular.ttf", boldFileName: "RobotoBold.ttf" }
    ],
    textAlignments: [{ name: "RIGHT" }, { name: "CENTER" }, { name: "LEFT" }],
    textThemes: [{ name: "LIGHT" }, { name: "DARK" }],
    routes: [
        {
            method: "GET",
            publicPath: "/banner/author/:platform/:id/isValid",
            legacySource: "banner-api",
            behavior: "Validate an author and return { valid: boolean }."
        },
        {
            method: "GET",
            publicPath: "/banner/author/:platform/:id/banner.:outputType",
            legacySource: "banner-api",
            behavior: "Render author banner as png or jpg."
        },
        {
            method: "GET",
            publicPath: "/banner/resource/:platform/:id/isValid",
            legacySource: "banner-api",
            behavior: "Validate a resource and return { valid: boolean }."
        },
        {
            method: "GET",
            publicPath: "/banner/resource/:platform/:id/banner.:outputType",
            legacySource: "banner-api",
            behavior: "Render resource banner as png or jpg."
        },
        {
            method: "GET",
            publicPath: "/banner/server/:host/:port/isValid",
            legacySource: "banner-api",
            behavior: "Validate Minecraft server status for banner rendering."
        },
        {
            method: "GET",
            publicPath: "/banner/server/:host/:port/banner.:outputType",
            legacySource: "banner-api",
            behavior: "Render Minecraft server banner as png or jpg."
        },
        {
            method: "GET",
            publicPath: "/banner/member/builtbybit/:id/isValid",
            legacySource: "banner-api",
            behavior: "Validate BuiltByBit member."
        },
        {
            method: "GET",
            publicPath: "/banner/member/builtbybit/:id/banner.:outputType",
            legacySource: "banner-api",
            behavior: "Render BuiltByBit member banner."
        },
        {
            method: "GET",
            publicPath: "/banner/team/polymart/:id/isValid",
            legacySource: "banner-api",
            behavior: "Validate Polymart team."
        },
        {
            method: "GET",
            publicPath: "/banner/team/polymart/:id/banner.:outputType",
            legacySource: "banner-api",
            behavior: "Render Polymart team banner."
        },
        {
            method: "GET",
            publicPath: "/banner/discord/user/:id/isValid",
            legacySource: "banner-api",
            behavior: "Validate Discord user."
        },
        {
            method: "GET",
            publicPath: "/banner/discord/user/:id/banner.:outputType",
            legacySource: "banner-api",
            behavior: "Render Discord user banner; saved recall marks Discord implementation incomplete."
        },
        {
            method: "POST",
            publicPath: "/banner/saved/save",
            legacySource: "banner-api",
            behavior: "Save banner type, metadata, settings and return mnemonic-backed saved_banner row."
        },
        {
            method: "GET",
            publicPath: "/banner/saved/:mnemonic.:outputType",
            legacySource: "banner-api",
            behavior: "Recall saved banner by mnemonic and render png or jpg."
        },
        {
            method: "GET",
            publicPath: "/banner/manage_saved/find/all",
            legacySource: "banner-api",
            behavior: "Return authenticated user's saved banners."
        },
        {
            method: "PUT",
            publicPath: "/banner/manage_saved/update/:id",
            legacySource: "banner-api",
            behavior: "Update authenticated user's saved banner settings."
        },
        {
            method: "DELETE",
            publicPath: "/banner/manage_saved/delete/:id",
            legacySource: "banner-api",
            behavior: "Delete authenticated user's saved banner."
        },
        {
            method: "GET",
            publicPath: "/banner/svc/constants",
            legacySource: "banner-api",
            behavior: "Return template, font, and text alignment display constants."
        },
        {
            method: "GET",
            publicPath: "/banner/svc/defaults/:type",
            legacySource: "banner-api",
            behavior: "Return namespaced default settings for author/resource/member/team/discord/server/all."
        },
        {
            method: "GET",
            publicPath: "/banner/svc/template/:template",
            legacySource: "banner-api",
            behavior: "Return template preview image as png."
        }
    ],
    savedBannerSchema: {
        table: "saved_banner",
        columns: [
            { name: "id", sqlType: "BIGINT(20) AUTO_INCREMENT", nullable: false, notes: "Primary key." },
            { name: "type", sqlType: "INT(5)", nullable: false, notes: "Java BannerType ordinal." },
            {
                name: "owner",
                sqlType: "BINARY(16)",
                nullable: true,
                notes: "UUID owner when authenticated."
            },
            {
                name: "mnemonic",
                sqlType: "VARCHAR(14)",
                nullable: false,
                notes: "Unique public recall slug."
            },
            { name: "metadata", sqlType: "LONGTEXT", nullable: false, notes: "JSON object." },
            {
                name: "settings",
                sqlType: "LONGTEXT",
                nullable: false,
                notes: "JSON object of namespace__key values."
            }
        ],
        relatedTables: ["banner_settings legacy id/name/value table still existed in V1 migration"]
    },
    parameterDefaults: [
        {
            bannerKind: "author",
            namespaces: [
                ...base,
                text("author_name", { x: 104, y: 22, font_size: 18, font_bold: true }),
                text("resource_count", { x: 104, y: 38 }),
                text("likes", { x: 104, y: 55 }),
                text("downloads", { x: 104, y: 72 }),
                text("reviews", { x: 104, y: 89 })
            ]
        },
        {
            bannerKind: "resource",
            namespaces: [
                ...base,
                text("resource_name", { x: 104, y: 25, font_size: 18, font_bold: true }),
                text("author_name", { x: 104, y: 42 }),
                text("reviews", { x: 104, y: 62 }),
                text("updated", { x: 104, y: 62 }),
                { name: "stars", kind: "spaceable", defaults: { x: 180, y: 51, gap: 16.0 } },
                text("downloads", { x: 104, y: 83 }),
                text("price", { x: 210, y: 83, font_bold: true })
            ]
        },
        {
            bannerKind: "server",
            namespaces: [
                ...base,
                text("server_name", { x: 104, y: 22, font_size: 18, font_bold: true }),
                text("version", { x: 104, y: 38 }),
                text("motd", { x: 104, y: 55 }),
                text("players", { x: 104, y: 85 })
            ]
        },
        {
            bannerKind: "member",
            namespaces: [
                ...base,
                text("member_name", { x: 104, y: 22, font_size: 18, font_bold: true }),
                text("rank", { x: 104, y: 37 }),
                text("joined", { x: 104, y: 55 }),
                text("posts", { x: 104, y: 72 }),
                text("likes", { x: 104, y: 89 })
            ]
        },
        {
            bannerKind: "team",
            namespaces: [
                ...base,
                text("team_name", { x: 104, y: 22, font_size: 18, font_bold: true }),
                text("resource_count", { x: 104, y: 38 }),
                text("downloads", { x: 104, y: 72 }),
                text("ratings", { x: 104, y: 89 })
            ]
        },
        {
            bannerKind: "discord",
            namespaces: [
                ...base,
                text("discord_name", { x: 104, y: 22, font_size: 18, font_bold: true }),
                text("id", { x: 104, y: 38 }),
                text("status", { x: 104, y: 55 }),
                text("activity", { x: 104, y: 72 }),
                text("created", { x: 104, y: 89 })
            ]
        }
    ],
    mcApi: {
        routes: [
            {
                method: "GET",
                publicPath: "/mc/server?host=:host&port=:port",
                legacySource: "mc-api",
                behavior: "Return Minecraft server status JSON or 404."
            },
            {
                method: "GET",
                publicPath: "/mc/icon?host=:host&port=:port",
                legacySource: "mc-api",
                behavior: "Return decoded server icon png or 404."
            }
        ],
        responseShape: {
            host: "string",
            port: "number",
            version: "string",
            players: { online: "number", max: "number" },
            motd: { raw: "string", colorless: "string", formatted: "string" },
            icon: "base64 string without data:image/png prefix"
        }
    },
    discordCommands: [
        {
            command: "/banner create type platform id template",
            behavior: "Builds a banner URL and replies with it only when the API returns HTTP 200.",
            urlTemplate: "https://api.mcbanners.com/banner/{type}/{platform}/{id}/banner.png?template={TEMPLATE}"
        },
        {
            command: "/server icon host [port]",
            behavior: "Defers, calls /mc/icon with default port 25565, replies with URL on 200 or 'Server not found!'.",
            urlTemplate: "https://api.mcbanners.com/mc/icon?host={host}&port={port|25565}"
        },
        {
            command: "/server info host [port]",
            behavior: "Defers, calls /mc/server with default port 25565, sends an embed with host/version/players/MOTD and icon thumbnail.",
            urlTemplate: "https://api.mcbanners.com/mc/server?host={host}&port={port|25565}"
        }
    ]
};
