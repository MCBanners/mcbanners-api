import type { CompatFixture, CompatRouteCase } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const parseCase = (value: unknown, index: number): CompatRouteCase => {
  if (!isRecord(value)) {
    throw new Error(`Fixture case ${String(index)} must be an object`);
  }

  const id = value["id"];
  const type = value["type"];
  const method = value["method"];
  const path = value["path"];
  const enabled = value["enabled"];
  const description = value["description"];
  const disabledReason = value["disabledReason"];

  if (typeof id !== "string" || id.trim() === "") {
    throw new Error(`Fixture case ${String(index)} is missing id`);
  }
  if (type !== "json" && type !== "image") {
    throw new Error(`Fixture case ${id} has unsupported type`);
  }
  if (method !== "GET") {
    throw new Error(`Fixture case ${id} has unsupported method`);
  }
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw new Error(`Fixture case ${id} path must start with /`);
  }
  if (typeof enabled !== "boolean") {
    throw new Error(`Fixture case ${id} enabled must be boolean`);
  }

  return {
    id,
    type,
    method,
    path,
    enabled,
    ...(typeof description === "string" ? { description } : {}),
    ...(typeof disabledReason === "string" ? { disabledReason } : {})
  };
};

export const parseCompatFixture = (value: unknown): CompatFixture => {
  if (!isRecord(value)) {
    throw new Error("Fixture must be an object");
  }

  const name = value["name"];
  const cases = value["cases"];
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("Fixture is missing name");
  }
  if (!Array.isArray(cases)) {
    throw new Error("Fixture cases must be an array");
  }

  const seen = new Set<string>();
  const parsed = cases.map((entry, index) => {
    const routeCase = parseCase(entry, index);
    if (seen.has(routeCase.id)) {
      throw new Error(`Duplicate fixture case id: ${routeCase.id}`);
    }
    seen.add(routeCase.id);
    return routeCase;
  });

  return { name, cases: parsed };
};

export const loadCompatFixture = async (path: string): Promise<CompatFixture> => {
  const file = Bun.file(path);
  const json = (await file.json()) as unknown;

  return parseCompatFixture(json);
};
