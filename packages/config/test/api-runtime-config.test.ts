import { describe, expect, it } from "bun:test";

import { loadApiRuntimeConfig } from "@mcbanners/config";

describe("API runtime database config", () => {
  it("disables saved banner DB when no DB config is present", () => {
    expect(loadApiRuntimeConfig({})).toEqual({
      port: 3000,
      savedBannerDb: {
        enabled: false,
        reason: "missing-config"
      },
      rateLimit: {
        enabled: false,
        windowMs: 60000,
        maxRequests: 300
      },
      metricsEnabled: false
    });
  });

  it("reads the API port from PORT", () => {
    expect(loadApiRuntimeConfig({ PORT: "8080" }).port).toBe(8080);
  });

  it("explicitly disables saved banner DB", () => {
    expect(
      loadApiRuntimeConfig({
        SAVED_BANNER_DB_ENABLED: "false",
        DATABASE_URL: "mysql://user:pass@example.test:3306/mcbanners"
      }).savedBannerDb
    ).toEqual({
      enabled: false,
      reason: "disabled"
    });
  });

  it("enables saved banner DB from DATABASE_URL", () => {
    expect(
      loadApiRuntimeConfig({
        DATABASE_URL: "mysql://user:pass@example.test:3306/mcbanners",
        DB_SSL: "true",
        DB_POOL_CONNECTION_LIMIT: "5"
      }).savedBannerDb
    ).toEqual({
      enabled: true,
      connection: {
        databaseUrl: "mysql://user:pass@example.test:3306/mcbanners",
        port: 3306,
        ssl: true,
        connectionLimit: 5
      }
    });
  });

  it("enables saved banner DB from discrete env vars", () => {
    expect(
      loadApiRuntimeConfig({
        DB_HOST: "127.0.0.1",
        DB_PORT: "3307",
        DB_USER: "mcbanners",
        DB_PASSWORD: "secret",
        DB_NAME: "mcbanners_test"
      }).savedBannerDb
    ).toEqual({
      enabled: true,
      connection: {
        host: "127.0.0.1",
        port: 3307,
        user: "mcbanners",
        password: "secret",
        database: "mcbanners_test",
        ssl: false,
        connectionLimit: 10
      }
    });
  });

  it("throws when DB is enabled with incomplete discrete config", () => {
    expect(() =>
      loadApiRuntimeConfig({
        SAVED_BANNER_DB_ENABLED: "true",
        DB_HOST: "127.0.0.1",
        DB_USER: "mcbanners"
      })
    ).toThrow("DB_NAME");
  });
});
