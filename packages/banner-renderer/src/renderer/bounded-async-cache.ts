interface CacheEntry<Value> {
  readonly value: Value;
  readonly bytes: number;
}

/** A byte-bounded LRU cache that shares concurrent loads for the same key. */
export class BoundedAsyncCache<Value> {
  private readonly entries = new Map<string, CacheEntry<Value>>();
  private readonly inFlight = new Map<string, Promise<Value>>();
  private sizeBytes = 0;

  constructor(
    private readonly maxBytes: number,
    private readonly sizeOf: (value: Value) => number,
    private readonly maxEntries = 128
  ) {}

  get(key: string, load: () => Promise<Value>): Promise<Value> {
    const cached = this.entries.get(key);
    if (cached !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      return Promise.resolve(cached.value);
    }

    const pending = this.inFlight.get(key);
    if (pending !== undefined) return pending;
    if (this.inFlight.size >= this.maxEntries) return load();

    const loading = load()
      .then((value) => {
        const bytes = this.sizeOf(value);
        if (bytes <= 0 || bytes > this.maxBytes) return value;

        while (this.entries.size >= this.maxEntries || this.sizeBytes + bytes > this.maxBytes) {
          const oldest = this.entries.entries().next().value as
            | [string, CacheEntry<Value>]
            | undefined;
          if (oldest === undefined) break;
          this.entries.delete(oldest[0]);
          this.sizeBytes -= oldest[1].bytes;
        }

        this.entries.set(key, { value, bytes });
        this.sizeBytes += bytes;
        return value;
      })
      .finally(() => {
        if (this.inFlight.get(key) === loading) this.inFlight.delete(key);
      });

    this.inFlight.set(key, loading);
    return loading;
  }
}
