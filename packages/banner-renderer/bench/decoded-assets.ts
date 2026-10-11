import { createHash } from "node:crypto";

import { createCanvasSurface, encodePng, renderImageNode, renderSpriteNode } from "../src";

const render = async (): Promise<Buffer> => {
  const surface = createCanvasSurface(468, 60);
  await renderImageNode(surface, {
    type: "image",
    x: 0,
    y: 0,
    width: 468,
    height: 60,
    assetKey: "BLUE_RADIAL"
  });
  await renderSpriteNode(surface, {
    type: "sprite",
    x: 18,
    y: 17,
    width: 24,
    height: 24,
    assetKey: "STAR_FULL"
  });
  return encodePng(surface);
};

const measure = async (label: string, count: number) => {
  const cpuStart = process.cpuUsage();
  const memoryStart = process.memoryUsage();
  const start = performance.now();
  let output = Buffer.alloc(0);

  for (let i = 0; i < count; i += 1) {
    output = await render();
  }

  const elapsedMs = performance.now() - start;
  const cpu = process.cpuUsage(cpuStart);
  const memory = process.memoryUsage();

  return {
    label,
    renders: count,
    wallMs: Number(elapsedMs.toFixed(2)),
    cpuMs: Number(((cpu.user + cpu.system) / 1000).toFixed(2)),
    heapDeltaBytes: memory.heapUsed - memoryStart.heapUsed,
    rssDeltaBytes: memory.rss - memoryStart.rss,
    externalDeltaBytes: memory.external - memoryStart.external,
    outputSha256: createHash("sha256").update(output).digest("hex")
  };
};

const cold = await measure("cold", 1);
const warm = await measure("warm", 100);

console.log(JSON.stringify({ cold, warm, finalMemoryBytes: process.memoryUsage() }, null, 2));
