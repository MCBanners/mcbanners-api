import { defaultMaxImageBytes, type FetchFn, fetchImageBase64 } from "../src/http-client";

const bodyBytes = 8 * 1024 * 1024;
const chunkBytes = 64 * 1024;
const mode = process.argv[2] ?? "optimized";
if (mode !== "baseline" && mode !== "optimized") {
  throw new Error("Expected benchmark mode: baseline or optimized");
}
const baseRss = process.memoryUsage().rss;
let peakRss = baseRss;
let bytesConsumed = 0;

const sampleMemory = (): void => {
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
};

const fetchFn: FetchFn = async () => {
  bytesConsumed = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      sampleMemory();
      if (bytesConsumed >= bodyBytes) {
        controller.close();
        return;
      }

      const length = Math.min(chunkBytes, bodyBytes - bytesConsumed);
      bytesConsumed += length;
      controller.enqueue(new Uint8Array(length).fill(0x5a));
    }
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "image/png" } });
};

if (mode === "baseline") {
  const response = await fetchFn("https://example.test/large.png");
  const buffer = await response.arrayBuffer();
  sampleMemory();
  if (buffer.byteLength <= defaultMaxImageBytes) {
    Buffer.from(buffer).toString("base64");
  }
} else {
  await fetchImageBase64("https://example.test/large.png", {}, fetchFn);
}
sampleMemory();

console.log(
  JSON.stringify({
    mode,
    configuredMaxImageBytes: defaultMaxImageBytes,
    mockedBodyBytes: bodyBytes,
    chunkBytes,
    bytesConsumed,
    peakRssDeltaMiB: Number(((peakRss - baseRss) / (1024 * 1024)).toFixed(2))
  })
);
