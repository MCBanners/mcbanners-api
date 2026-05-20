import type { HytaleServerStatus } from "./types";

export const HYTALE_FIXTURE_STANDARD: HytaleServerStatus = {
  host: "play.hytale.example",
  port: 5520,
  provider: "hyquery",
  version: "Hytale Beta",
  players: {
    online: 42,
    max: null
  },
  motd: {
    raw: "Welcome to Hytale",
    clean: "Welcome to Hytale"
  },
  latencyMs: 12
};

export const HYTALE_STATUS_FIXTURES: Record<string, HytaleServerStatus> = {
  "play.hytale.example:5520": HYTALE_FIXTURE_STANDARD
};
