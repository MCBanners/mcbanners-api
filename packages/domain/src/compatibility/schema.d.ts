import { z } from "zod";
export declare const enumValueSchema: z.ZodObject<
  {
    name: z.ZodString;
    ordinal: z.ZodOptional<z.ZodNumber>;
    alias: z.ZodOptional<z.ZodString>;
    relatedServiceBackend: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    textTheme: z.ZodOptional<
      z.ZodEnum<{
        LIGHT: "LIGHT";
        DARK: "DARK";
      }>
    >;
    fileName: z.ZodOptional<z.ZodString>;
    regularFileName: z.ZodOptional<z.ZodString>;
    boldFileName: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export declare const routeSchema: z.ZodObject<
  {
    method: z.ZodEnum<{
      GET: "GET";
      POST: "POST";
      PUT: "PUT";
      DELETE: "DELETE";
    }>;
    publicPath: z.ZodString;
    legacySource: z.ZodEnum<{
      "banner-api": "banner-api";
      "mc-api": "mc-api";
      "discord-api": "discord-api";
    }>;
    behavior: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
export declare const settingNamespaceSchema: z.ZodObject<
  {
    name: z.ZodString;
    kind: z.ZodEnum<{
      background: "background";
      "square-sizeable": "square-sizeable";
      spaceable: "spaceable";
      text: "text";
    }>;
    defaults: z.ZodRecord<
      z.ZodString,
      z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>
    >;
  },
  z.core.$strip
>;
export declare const defaultSetSchema: z.ZodObject<
  {
    bannerKind: z.ZodString;
    namespaces: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          kind: z.ZodEnum<{
            background: "background";
            "square-sizeable": "square-sizeable";
            spaceable: "spaceable";
            text: "text";
          }>;
          defaults: z.ZodRecord<
            z.ZodString,
            z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>
          >;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export declare const savedBannerSchemaSchema: z.ZodObject<
  {
    table: z.ZodLiteral<"saved_banner">;
    columns: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          sqlType: z.ZodString;
          nullable: z.ZodBoolean;
          notes: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    relatedTables: z.ZodDefault<z.ZodArray<z.ZodString>>;
  },
  z.core.$strip
>;
export declare const compatibilityManifestSchema: z.ZodObject<
  {
    sourceRepos: z.ZodArray<
      z.ZodEnum<{
        "banner-api": "banner-api";
        "mc-api": "mc-api";
        "discord-api": "discord-api";
      }>
    >;
    bannerTypes: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          alias: z.ZodOptional<z.ZodString>;
          relatedServiceBackend: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          textTheme: z.ZodOptional<
            z.ZodEnum<{
              LIGHT: "LIGHT";
              DARK: "DARK";
            }>
          >;
          fileName: z.ZodOptional<z.ZodString>;
          regularFileName: z.ZodOptional<z.ZodString>;
          boldFileName: z.ZodOptional<z.ZodString>;
          ordinal: z.ZodNumber;
        },
        z.core.$strip
      >
    >;
    serviceBackends: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          ordinal: z.ZodOptional<z.ZodNumber>;
          alias: z.ZodOptional<z.ZodString>;
          relatedServiceBackend: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          textTheme: z.ZodOptional<
            z.ZodEnum<{
              LIGHT: "LIGHT";
              DARK: "DARK";
            }>
          >;
          fileName: z.ZodOptional<z.ZodString>;
          regularFileName: z.ZodOptional<z.ZodString>;
          boldFileName: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    outputFormats: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          ordinal: z.ZodOptional<z.ZodNumber>;
          relatedServiceBackend: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          textTheme: z.ZodOptional<
            z.ZodEnum<{
              LIGHT: "LIGHT";
              DARK: "DARK";
            }>
          >;
          fileName: z.ZodOptional<z.ZodString>;
          regularFileName: z.ZodOptional<z.ZodString>;
          boldFileName: z.ZodOptional<z.ZodString>;
          alias: z.ZodString;
        },
        z.core.$strip
      >
    >;
    backgroundTemplates: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          ordinal: z.ZodOptional<z.ZodNumber>;
          alias: z.ZodOptional<z.ZodString>;
          relatedServiceBackend: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          fileName: z.ZodOptional<z.ZodString>;
          regularFileName: z.ZodOptional<z.ZodString>;
          boldFileName: z.ZodOptional<z.ZodString>;
          textTheme: z.ZodEnum<{
            LIGHT: "LIGHT";
            DARK: "DARK";
          }>;
        },
        z.core.$strip
      >
    >;
    fontFaces: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          ordinal: z.ZodOptional<z.ZodNumber>;
          alias: z.ZodOptional<z.ZodString>;
          relatedServiceBackend: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          textTheme: z.ZodOptional<
            z.ZodEnum<{
              LIGHT: "LIGHT";
              DARK: "DARK";
            }>
          >;
          fileName: z.ZodOptional<z.ZodString>;
          regularFileName: z.ZodOptional<z.ZodString>;
          boldFileName: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    textAlignments: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          ordinal: z.ZodOptional<z.ZodNumber>;
          alias: z.ZodOptional<z.ZodString>;
          relatedServiceBackend: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          textTheme: z.ZodOptional<
            z.ZodEnum<{
              LIGHT: "LIGHT";
              DARK: "DARK";
            }>
          >;
          fileName: z.ZodOptional<z.ZodString>;
          regularFileName: z.ZodOptional<z.ZodString>;
          boldFileName: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    textThemes: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          ordinal: z.ZodOptional<z.ZodNumber>;
          alias: z.ZodOptional<z.ZodString>;
          relatedServiceBackend: z.ZodOptional<z.ZodNullable<z.ZodString>>;
          textTheme: z.ZodOptional<
            z.ZodEnum<{
              LIGHT: "LIGHT";
              DARK: "DARK";
            }>
          >;
          fileName: z.ZodOptional<z.ZodString>;
          regularFileName: z.ZodOptional<z.ZodString>;
          boldFileName: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    routes: z.ZodArray<
      z.ZodObject<
        {
          method: z.ZodEnum<{
            GET: "GET";
            POST: "POST";
            PUT: "PUT";
            DELETE: "DELETE";
          }>;
          publicPath: z.ZodString;
          legacySource: z.ZodEnum<{
            "banner-api": "banner-api";
            "mc-api": "mc-api";
            "discord-api": "discord-api";
          }>;
          behavior: z.ZodString;
          notes: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    savedBannerSchema: z.ZodObject<
      {
        table: z.ZodLiteral<"saved_banner">;
        columns: z.ZodArray<
          z.ZodObject<
            {
              name: z.ZodString;
              sqlType: z.ZodString;
              nullable: z.ZodBoolean;
              notes: z.ZodOptional<z.ZodString>;
            },
            z.core.$strip
          >
        >;
        relatedTables: z.ZodDefault<z.ZodArray<z.ZodString>>;
      },
      z.core.$strip
    >;
    parameterDefaults: z.ZodArray<
      z.ZodObject<
        {
          bannerKind: z.ZodString;
          namespaces: z.ZodArray<
            z.ZodObject<
              {
                name: z.ZodString;
                kind: z.ZodEnum<{
                  background: "background";
                  "square-sizeable": "square-sizeable";
                  spaceable: "spaceable";
                  text: "text";
                }>;
                defaults: z.ZodRecord<
                  z.ZodString,
                  z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>
                >;
              },
              z.core.$strip
            >
          >;
        },
        z.core.$strip
      >
    >;
    mcApi: z.ZodObject<
      {
        routes: z.ZodArray<
          z.ZodObject<
            {
              method: z.ZodEnum<{
                GET: "GET";
                POST: "POST";
                PUT: "PUT";
                DELETE: "DELETE";
              }>;
              publicPath: z.ZodString;
              legacySource: z.ZodEnum<{
                "banner-api": "banner-api";
                "mc-api": "mc-api";
                "discord-api": "discord-api";
              }>;
              behavior: z.ZodString;
              notes: z.ZodOptional<z.ZodString>;
            },
            z.core.$strip
          >
        >;
        responseShape: z.ZodRecord<z.ZodString, z.ZodUnknown>;
      },
      z.core.$strip
    >;
    discordCommands: z.ZodArray<
      z.ZodObject<
        {
          command: z.ZodString;
          behavior: z.ZodString;
          urlTemplate: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
  },
  z.core.$strip
>;
export type CompatibilityManifest = z.infer<typeof compatibilityManifestSchema>;
export type SettingNamespace = z.infer<typeof settingNamespaceSchema>;
//# sourceMappingURL=schema.d.ts.map
