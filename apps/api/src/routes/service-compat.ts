import { compatibilityManifest } from "@mcbanners/domain";
import { Hono } from "hono";

const displayName = (value: string): string =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const constantsResponse = Object.freeze({
  templates: Object.freeze(
    Object.fromEntries(
      compatibilityManifest.backgroundTemplates.map((template) => [
        template.name,
        displayName(template.name)
      ])
    )
  ),
  fonts: Object.freeze(
    Object.fromEntries(
      compatibilityManifest.fontFaces.map((fontFace) => [fontFace.name, displayName(fontFace.name)])
    )
  ),
  text_alignments: Object.freeze(
    Object.fromEntries(
      compatibilityManifest.textAlignments.map((alignment) => [
        alignment.name,
        displayName(alignment.name)
      ])
    )
  )
});

const defaultsByType = Object.freeze(
  Object.fromEntries(
    compatibilityManifest.parameterDefaults.map((defaultSet) => [
      defaultSet.bannerKind,
      Object.fromEntries(
        defaultSet.namespaces.map((namespace) => [namespace.name, namespace.defaults])
      )
    ])
  )
);

export const createServiceCompatRoute = (): Hono => {
  const route = new Hono();

  route.get("/constants", (c) => c.json(constantsResponse));

  route.get("/defaults/:type", (c) => {
    const type = c.req.param("type").toLowerCase();
    if (type === "all") {
      return c.json(defaultsByType);
    }

    const defaults = defaultsByType[type];
    if (defaults === undefined) {
      return c.json({ error: `Unsupported defaults type: ${type}` }, 404);
    }

    return c.json(defaults);
  });

  return route;
};
