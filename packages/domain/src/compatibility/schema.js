import { z } from "zod";
export const enumValueSchema = z.object({
    name: z.string().min(1),
    ordinal: z.number().int().nonnegative().optional(),
    alias: z.string().min(1).optional(),
    relatedServiceBackend: z.string().min(1).nullable().optional(),
    textTheme: z.enum(["LIGHT", "DARK"]).optional(),
    fileName: z.string().min(1).optional(),
    regularFileName: z.string().min(1).optional(),
    boldFileName: z.string().min(1).optional()
});
export const routeSchema = z.object({
    method: z.enum(["GET", "POST", "PUT", "DELETE"]),
    publicPath: z.string().startsWith("/"),
    legacySource: z.enum(["banner-api", "mc-api", "discord-api"]),
    behavior: z.string().min(1),
    notes: z.string().min(1).optional()
});
export const settingNamespaceSchema = z.object({
    name: z.string().min(1),
    kind: z.enum(["background", "square-sizeable", "spaceable", "text"]),
    defaults: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
});
export const defaultSetSchema = z.object({
    bannerKind: z.string().min(1),
    namespaces: z.array(settingNamespaceSchema).min(1)
});
export const savedBannerSchemaSchema = z.object({
    table: z.literal("saved_banner"),
    columns: z.array(z.object({
        name: z.string().min(1),
        sqlType: z.string().min(1),
        nullable: z.boolean(),
        notes: z.string().min(1).optional()
    })),
    relatedTables: z.array(z.string()).default([])
});
export const compatibilityManifestSchema = z.object({
    sourceRepos: z.array(z.enum(["banner-api", "mc-api", "discord-api"])).length(3),
    bannerTypes: z.array(enumValueSchema.extend({ ordinal: z.number().int().nonnegative() })).min(1),
    serviceBackends: z.array(enumValueSchema).min(1),
    outputFormats: z.array(enumValueSchema.extend({ alias: z.string().min(1) })).min(1),
    backgroundTemplates: z
        .array(enumValueSchema.extend({ textTheme: z.enum(["LIGHT", "DARK"]) }))
        .min(1),
    fontFaces: z.array(enumValueSchema).min(1),
    textAlignments: z.array(enumValueSchema).min(1),
    textThemes: z.array(enumValueSchema).min(1),
    routes: z.array(routeSchema).min(1),
    savedBannerSchema: savedBannerSchemaSchema,
    parameterDefaults: z.array(defaultSetSchema).min(1),
    mcApi: z.object({
        routes: z.array(routeSchema).min(1),
        responseShape: z.record(z.string(), z.unknown())
    }),
    discordCommands: z.array(z.object({
        command: z.string().min(1),
        behavior: z.string().min(1),
        urlTemplate: z.string().min(1).optional()
    }))
});
