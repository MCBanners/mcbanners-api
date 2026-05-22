import { beforeEach, describe, expect, it } from "bun:test";
import { MemoryCache } from "../src/cache.ts";
import type { CacheStats } from "../src/types.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Basic get/set/delete/clear
// ---------------------------------------------------------------------------

describe("MemoryCache – basic operations", () => {
  it("returns undefined for a missing key", () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    expect(cache.get<unknown>("missing")).toBeUndefined();
  });

  it("returns a set value", () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    cache.set("key", "value");
    expect(cache.get<string>("key")).toBe("value");
  });

  it("overwrites an existing key", () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    cache.set("key", "first");
    cache.set("key", "second");
    expect(cache.get<string>("key")).toBe("second");
  });

  it("delete removes the key", () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    cache.set("key", 42);
    expect(cache.delete("key")).toBe(true);
    expect(cache.get<unknown>("key")).toBeUndefined();
  });

  it("delete returns false for a missing key", () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    expect(cache.delete("ghost")).toBe(false);
  });

  it("clear removes all entries", () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.get<unknown>("a")).toBeUndefined();
    expect(cache.get<unknown>("b")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// TTL expiry
// ---------------------------------------------------------------------------

describe("MemoryCache – TTL expiry", () => {
  it("returns undefined for an expired entry", async () => {
    const cache = new MemoryCache({ ttlMs: 5 });
    cache.set("key", "soon-gone");
    await sleep(10);
    expect(cache.get<unknown>("key")).toBeUndefined();
  });

  it("respects per-entry TTL override", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    cache.set("fast", "value", 5);
    cache.set("slow", "value"); // uses default 60 s
    await sleep(10);
    expect(cache.get<unknown>("fast")).toBeUndefined();
    expect(cache.get<string>("slow")).toBe("value");
  });

  it("expired entry counts as a miss and eviction", async () => {
    const cache = new MemoryCache({ ttlMs: 5 });
    cache.set("key", "v");
    await sleep(10);
    cache.get("key"); // trigger expiry
    const s = cache.stats();
    expect(s.evictions).toBe(1);
    expect(s.misses).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// LRU eviction (maxEntries)
// ---------------------------------------------------------------------------

describe("MemoryCache – maxEntries LRU eviction", () => {
  it("evicts the oldest entry when maxEntries is exceeded", () => {
    const cache = new MemoryCache({ ttlMs: 60_000, maxEntries: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3); // "a" should be evicted
    expect(cache.get<unknown>("a")).toBeUndefined();
    expect(cache.get<number>("b")).toBe(2);
    expect(cache.get<number>("c")).toBe(3);
  });

  it("accessing an entry promotes it and delays its eviction", () => {
    const cache = new MemoryCache({ ttlMs: 60_000, maxEntries: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    // Access "a" to promote it to MRU.
    cache.get("a");
    cache.set("c", 3); // "b" should be evicted (LRU), not "a"
    expect(cache.get<unknown>("b")).toBeUndefined();
    expect(cache.get<number>("a")).toBe(1);
    expect(cache.get<number>("c")).toBe(3);
  });

  it("evictions counter tracks evicted entries", () => {
    const cache = new MemoryCache({ ttlMs: 60_000, maxEntries: 1 });
    cache.set("a", 1);
    cache.set("b", 2); // evicts "a"
    cache.set("c", 3); // evicts "b"
    expect(cache.stats().evictions).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// maxBytes eviction
// ---------------------------------------------------------------------------

describe("MemoryCache – maxBytes eviction", () => {
  it("evicts the oldest entry when maxBytes is exceeded", () => {
    const cache = new MemoryCache({ ttlMs: 60_000, maxBytes: 100 });
    cache.set("a", "data-a", undefined, 60);
    cache.set("b", "data-b", undefined, 60); // total would be 120 → evict "a"
    expect(cache.get<unknown>("a")).toBeUndefined();
    expect(cache.get<string>("b")).toBe("data-b");
  });
});

// ---------------------------------------------------------------------------
// getOrSet
// ---------------------------------------------------------------------------

describe("MemoryCache – getOrSet", () => {
  it("calls fn and returns its value", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    const result = await cache.getOrSet("key", () => Promise.resolve("result"));
    expect(result).toBe("result");
  });

  it("caches the result so fn is only called once", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    let calls = 0;
    const fn = (): Promise<string> => {
      calls++;
      return Promise.resolve("value");
    };
    await cache.getOrSet("key", fn);
    await cache.getOrSet("key", fn);
    expect(calls).toBe(1);
  });

  it("does not cache null by default", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    let calls = 0;
    const fn = (): Promise<null> => {
      calls++;
      return Promise.resolve(null);
    };
    const r1 = await cache.getOrSet("key", fn);
    const r2 = await cache.getOrSet("key", fn);
    expect(r1).toBeNull();
    expect(r2).toBeNull();
    expect(calls).toBe(2);
  });

  it("caches null when cacheNull: true", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    let calls = 0;
    const fn = (): Promise<null> => {
      calls++;
      return Promise.resolve(null);
    };
    await cache.getOrSet("key", fn, { cacheNull: true });
    await cache.getOrSet("key", fn, { cacheNull: true });
    expect(calls).toBe(1);
  });

  it("does not cache on factory error and retries on next call", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    let attempt = 0;
    const fn = (): Promise<string> => {
      attempt++;
      if (attempt === 1) return Promise.reject(new Error("transient failure"));
      return Promise.resolve("recovered");
    };
    // Verify first call throws without using await-thenable.
    let threw = false;
    try {
      await cache.getOrSet("key", fn);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    const result = await cache.getOrSet("key", fn);
    expect(result).toBe("recovered");
    expect(attempt).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// getOrSet byteEstimate function
// ---------------------------------------------------------------------------

describe("MemoryCache – getOrSet byteEstimate function", () => {
  it("accepts a static number as byteEstimate", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000, maxBytes: 100 });
    await cache.getOrSet("key", () => Promise.resolve("value"), { byteEstimate: 50 });
    expect(cache.get<string>("key")).toBe("value");
  });

  it("accepts a function as byteEstimate and calls it with the resolved value", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000, maxBytes: 1000 });
    const str = "x".repeat(80);
    let byteEstimateCalled = false;
    await cache.getOrSet("key", () => Promise.resolve(str), {
      byteEstimate: (v: string) => {
        byteEstimateCalled = true;
        return v.length;
      }
    });
    expect(byteEstimateCalled).toBe(true);
    expect(cache.get<string>("key")).toBe(str);
  });

  it("function byteEstimate drives maxBytes eviction correctly", async () => {
    // maxBytes: 100 — first entry is 60 bytes, second 50 bytes; total 110 > 100 → evict first.
    const cache = new MemoryCache({ ttlMs: 60_000, maxBytes: 100 });
    const large = "a".repeat(60);
    const small = "b".repeat(50);
    await cache.getOrSet("large", () => Promise.resolve(large), {
      byteEstimate: (v: string) => v.length
    });
    await cache.getOrSet("small", () => Promise.resolve(small), {
      byteEstimate: (v: string) => v.length
    });
    expect(cache.get<unknown>("large")).toBeUndefined(); // evicted
    expect(cache.get<string>("small")).toBe(small);
    expect(cache.stats().evictions).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Request coalescing
// ---------------------------------------------------------------------------

describe("MemoryCache – request coalescing", () => {
  it("calls fn only once for concurrent getOrSet calls on the same key", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    let calls = 0;
    const fn = (): Promise<string> => {
      calls++;
      return sleep(20).then(() => "shared-result");
    };

    const [r1, r2, r3] = await Promise.all([
      cache.getOrSet("key", fn),
      cache.getOrSet("key", fn),
      cache.getOrSet("key", fn)
    ]);

    expect(calls).toBe(1);
    expect(r1).toBe("shared-result");
    expect(r2).toBe("shared-result");
    expect(r3).toBe("shared-result");
  });

  it("increments coalesced counter for each joined caller", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    const fn = (): Promise<string> => sleep(20).then(() => "v");

    await Promise.all([
      cache.getOrSet("key", fn),
      cache.getOrSet("key", fn),
      cache.getOrSet("key", fn)
    ]);

    // 3 callers: 1 creates inflight, 2 are coalesced.
    expect(cache.stats().coalesced).toBe(2);
  });

  it("all coalesced callers receive the error when fn rejects", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000 });
    const fn = (): Promise<never> => sleep(10).then(() => Promise.reject(new Error("boom")));

    const results = await Promise.allSettled([
      cache.getOrSet("key", fn),
      cache.getOrSet("key", fn)
    ]);

    expect(results[0].status).toBe("rejected");
    expect(results[1].status).toBe("rejected");
    // After the rejection, a new call should retry (inflight cleared).
    const fn2 = (): Promise<string> => Promise.resolve("recovered");
    expect(await cache.getOrSet("key", fn2)).toBe("recovered");
  });
});

// ---------------------------------------------------------------------------
// Namespace isolation
// ---------------------------------------------------------------------------

describe("MemoryCache – namespace", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache({ ttlMs: 60_000 });
  });

  it("two namespaces with the same key name do not collide", () => {
    const ns1 = cache.namespace("ns1");
    const ns2 = cache.namespace("ns2");
    ns1.set("key", "from-ns1");
    ns2.set("key", "from-ns2");
    expect(ns1.get<string>("key")).toBe("from-ns1");
    expect(ns2.get<string>("key")).toBe("from-ns2");
  });

  it("namespace.clear() only removes that namespace's keys", () => {
    const ns1 = cache.namespace("ns1");
    const ns2 = cache.namespace("ns2");
    ns1.set("a", 1);
    ns1.set("b", 2);
    ns2.set("a", 3);
    ns1.clear();
    expect(ns1.get<unknown>("a")).toBeUndefined();
    expect(ns1.get<unknown>("b")).toBeUndefined();
    expect(ns2.get<number>("a")).toBe(3);
  });

  it("namespace.delete returns false for missing key", () => {
    const ns = cache.namespace("ns");
    expect(ns.delete("ghost")).toBe(false);
  });

  it("namespace.getOrSet coalesces within the namespace", async () => {
    const ns = cache.namespace("ns");
    let calls = 0;
    const fn = (): Promise<string> => {
      calls++;
      return sleep(10).then(() => "v");
    };
    await Promise.all([ns.getOrSet("k", fn), ns.getOrSet("k", fn)]);
    expect(calls).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Stats correctness
// ---------------------------------------------------------------------------

describe("MemoryCache – stats", () => {
  it("tracks hits, misses, sets, deletes, evictions, coalesced correctly", async () => {
    const cache = new MemoryCache({ ttlMs: 60_000, maxEntries: 2 });

    // 2 misses (keys not present)
    cache.get("x");
    cache.get("y");
    // 2 sets (fills cache to maxEntries)
    cache.set("a", 1);
    cache.set("b", 2);
    // 1 hit on "a" → promotes "a" to MRU; insertion order now: {b, a}
    cache.get("a");
    // 1 delete
    cache.delete("b"); // only "a" remains
    // 2 sets: first fills back to maxEntries, second triggers 1 eviction
    cache.set("c", 3); // entries: {a, c}
    cache.set("d", 4); // entries: {a, c, d} → 3 > 2 → evict "a" → {c, d}

    // 2 concurrent getOrSet calls:
    //   call 1: get("co") → miss, creates inflight, fn starts
    //   call 2: get("co") → miss, joins inflight (coalesced)
    //   fn resolves → set("co", 99) → {c, d, co} → 3 > 2 → evict "c" → {d, co}
    let calls = 0;
    const fn = (): Promise<number> => {
      calls++;
      return sleep(10).then(() => 99);
    };
    await Promise.all([cache.getOrSet("co", fn), cache.getOrSet("co", fn)]);

    const s: CacheStats = cache.stats();
    expect(s.misses).toBe(4); // 2 initial + 2 from getOrSet internal get()
    expect(s.hits).toBe(1);
    expect(s.sets).toBe(5); // 4 explicit + 1 from getOrSet resolution
    expect(s.deletes).toBe(1);
    expect(s.evictions).toBe(2); // "a" evicted when "d" added; "c" evicted when "co" stored
    expect(s.coalesced).toBe(1);
    expect(calls).toBe(1);
  });
});
