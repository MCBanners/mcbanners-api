import { type FetchFn, fetchImageBase64 } from "../src/http-client";

const mode = process.argv[2];
const scenario = process.argv[3];
if (
  (mode !== "before" && mode !== "after") ||
  (scenario !== "repeated" && scenario !== "concurrent")
) {
  throw new Error(
    "Usage: bun run packages/external-clients/bench/remote-logo-cache.ts <before|after> <repeated|concurrent>"
  );
}

const requestCount = 32;
const logoBytes = new Uint8Array(64 * 1024).fill(0x2a);
let upstreamRequests = 0;
let bytesTransferred = 0;
let peakRss = process.memoryUsage().rss;
const sampleMemory = () => {
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
};

const mockFetch: FetchFn = async () => {
  upstreamRequests += 1;
  await Bun.sleep(40);
  const body = new Uint8Array(logoBytes);
  bytesTransferred += body.byteLength;
  sampleMemory();
  return new Response(body, { headers: { "Content-Type": "image/png" } });
};

const sharedFetch: FetchFn = (input, init) => mockFetch(input, init);
const uniqueFetch = (): FetchFn => (input, init) => mockFetch(input, init);
const fetchForCall = () => (mode === "before" ? uniqueFetch() : sharedFetch);
const url = "https://cdn.example.test/marketplace-logo.png";
const memoryBefore = process.memoryUsage();
const startedAt = performance.now();

if (scenario === "repeated") {
  for (let index = 0; index < requestCount; index += 1) {
    await fetchImageBase64(url, {}, fetchForCall());
    sampleMemory();
  }
} else {
  await Promise.all(
    Array.from({ length: requestCount }, () => fetchImageBase64(url, {}, fetchForCall()))
  );
  sampleMemory();
}

const elapsedMs = performance.now() - startedAt;
const memoryAfter = process.memoryUsage();
console.log(
  JSON.stringify({
    mode,
    scenario,
    calls: requestCount,
    upstreamRequests,
    bytesTransferred,
    elapsedMs: Number(elapsedMs.toFixed(2)),
    averageMsPerCall: Number((elapsedMs / requestCount).toFixed(2)),
    rssBefore: memoryBefore.rss,
    rssPeak: peakRss,
    rssAfter: memoryAfter.rss,
    heapUsedBefore: memoryBefore.heapUsed,
    heapUsedAfter: memoryAfter.heapUsed
  })
);
