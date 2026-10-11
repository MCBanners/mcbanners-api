import { describe, expect, test } from "bun:test";

import { BoundedAsyncCache } from "../src/renderer/bounded-async-cache";

describe("BoundedAsyncCache", () => {
  test("coalesces concurrent loads for the same key", async () => {
    const cache = new BoundedAsyncCache<{ bytes: number }>(8, (value) => value.bytes);
    let loadCount = 0;
    let resolveLoad: ((value: { bytes: number }) => void) | undefined;
    const load = () => {
      loadCount += 1;
      return new Promise<{ bytes: number }>((resolve) => {
        resolveLoad = resolve;
      });
    };

    const first = cache.get("asset", load);
    const second = cache.get("asset", load);
    resolveLoad?.({ bytes: 4 });

    const [firstValue, secondValue] = await Promise.all([first, second]);
    expect(loadCount).toBe(1);
    expect(firstValue).toBe(secondValue);
  });

  test("evicts least recently used entries to stay within its byte limit", async () => {
    const cache = new BoundedAsyncCache<{ bytes: number }>(3, (value) => value.bytes);
    let aLoads = 0;
    let bLoads = 0;
    const loadA = async () => {
      aLoads += 1;
      return { bytes: 2 };
    };
    const loadB = async () => {
      bLoads += 1;
      return { bytes: 2 };
    };

    await cache.get("a", loadA);
    await cache.get("b", loadB);
    await cache.get("b", loadB);
    await cache.get("a", loadA);

    expect(aLoads).toBe(2);
    expect(bLoads).toBe(1);
  });

  test("does not retain entries larger than the configured limit", async () => {
    const cache = new BoundedAsyncCache<{ bytes: number }>(3, (value) => value.bytes);
    let loadCount = 0;
    const load = async () => {
      loadCount += 1;
      return { bytes: 4 };
    };

    await cache.get("large", load);
    await cache.get("large", load);

    expect(loadCount).toBe(2);
  });
});
