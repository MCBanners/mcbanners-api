import type { ResourceBannerData } from "@mcbanners/banner-renderer";
import { MemoryCache } from "@mcbanners/cache";
import { logger } from "@mcbanners/logger";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";
import { createApp } from "../src/app";
import type { ResourceClients } from "../src/routes/resource-banner";

logger.level = "silent";

const fixture: ResourceBannerData = {
  resource: {
    name: "Benchmark Resource",
    logoBase64: null,
    downloadCount: 125_000,
    lastUpdated: null,
    rating: { count: 100, average: 4.5 },
    price: null
  },
  author: { name: "Benchmark Author" },
  backend: "SPIGOT"
};

let upstreamCalls = 0;
const clients: ResourceClients = {
  SPIGOT: {
    getResourceBannerData: async () => {
      upstreamCalls += 1;
      return fixture;
    }
  }
};
const resourceData = new MemoryCache({ ttlMs: 900_000, maxEntries: 500 });
const resourceBannerImage = new MemoryCache({ ttlMs: 300_000, maxEntries: 200 });
const app = createApp(createFixtureAdapter(MC_STATUS_FIXTURES), clients, {
  resourceData,
  resourceBannerImage
});

const path = "/banner/resource/spigot/benchmark/banner.png";
await app.request(path);

const count = 200;
const latencies: number[] = [];
const memoryBefore = process.memoryUsage();
const cpuBefore = process.cpuUsage();
for (let i = 0; i < count; i += 1) {
  const start = performance.now();
  await app.request(path);
  latencies.push(performance.now() - start);
}
const cpu = process.cpuUsage(cpuBefore);
const memoryAfter = process.memoryUsage();
latencies.sort((a, b) => a - b);

console.log(
  JSON.stringify(
    {
      warmRequests: count,
      latencyMs: {
        p50: Number(latencies[Math.floor(count * 0.5)]?.toFixed(3)),
        p95: Number(latencies[Math.floor(count * 0.95)]?.toFixed(3)),
        mean: Number((latencies.reduce((sum, value) => sum + value, 0) / count).toFixed(3))
      },
      cpuMs: Number(((cpu.user + cpu.system) / 1000).toFixed(2)),
      memoryDeltaBytes: {
        heap: memoryAfter.heapUsed - memoryBefore.heapUsed,
        rss: memoryAfter.rss - memoryBefore.rss
      },
      upstreamCalls,
      sourceCacheHits: resourceData.stats().hits,
      imageCache: resourceBannerImage.stats()
    },
    null,
    2
  )
);
