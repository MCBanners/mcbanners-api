import type { HytaleStatusAdapter } from "./adapter";
import type { HytaleServerStatus } from "./types";

export class FixtureHytaleStatusAdapter implements HytaleStatusAdapter {
  private readonly fixtures: ReadonlyMap<string, HytaleServerStatus>;

  constructor(fixtures: ReadonlyMap<string, HytaleServerStatus>) {
    this.fixtures = fixtures;
  }

  getStatus(host: string, port: number): Promise<HytaleServerStatus | null> {
    const status = this.fixtures.get(`${host}:${String(port)}`);
    return Promise.resolve(status ?? null);
  }
}

export const createFixtureHytaleAdapter = (
  entries: Record<string, HytaleServerStatus>
): FixtureHytaleStatusAdapter =>
  new FixtureHytaleStatusAdapter(new Map(Object.entries(entries)));
