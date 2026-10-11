import { CurseForgeResourceClient } from "../src/curseforge-client";
import type { FetchFn } from "../src/http-client";

const baseUrl = "https://api.cfwidget.com/";
const projectCount = 24;
const simulatedDelayMs = 40;
const runs = 5;

const projectIds = Array.from({ length: projectCount }, (_, index) => index + 1);
const authorResponse = JSON.stringify({
  id: 123,
  username: "benchmark-author",
  projects: projectIds.map((id) => ({ id }))
});

const projectResponse = (id: number): string =>
  JSON.stringify({
    id,
    title: `Project ${id}`,
    thumbnail: "",
    downloads: { monthly: 0, total: id * 100 },
    download: { uploaded_at: "" },
    members: []
  });

const timings: number[] = [];
const requestCounts: number[] = [];

for (let run = 0; run < runs; run += 1) {
  let requestCount = 0;
  const fetchFn: FetchFn = async (input) => {
    const url = input instanceof URL ? input.href : input instanceof Request ? input.url : input;
    requestCount += 1;
    await Bun.sleep(simulatedDelayMs);

    const body =
      url === `${baseUrl}author/123`
        ? authorResponse
        : projectResponse(Number(url.slice(baseUrl.length)));
    return new Response(body, { status: 200 });
  };

  const client = new CurseForgeResourceClient({}, fetchFn);
  const startedAt = performance.now();
  const result = await client.getAuthorBannerData("123");
  timings.push(performance.now() - startedAt);
  requestCounts.push(requestCount);
  if (result?.author.downloadCount !== projectIds.reduce((sum, id) => sum + id * 100, 0)) {
    throw new Error("Benchmark result did not aggregate all project downloads");
  }
}

timings.sort((a, b) => a - b);
requestCounts.sort((a, b) => a - b);
const median = (values: number[]): number => values[Math.floor(values.length / 2)] ?? 0;

console.log(
  JSON.stringify({
    projectCount,
    simulatedDelayMs,
    runs,
    medianColdLatencyMs: Number(median(timings).toFixed(1)),
    upstreamRequestsPerColdRequest: median(requestCounts)
  })
);
