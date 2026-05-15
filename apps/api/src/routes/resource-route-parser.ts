/**
 * Pure parsing helpers for the wildcard resource banner route.
 *
 * Extracted here so they can be unit-tested independently of the Hono handler.
 */

/** Parsed components of a resource route wildcard path. */
export interface ParsedResourceRoute {
  /**
   * Resource ID, which may contain `/` for platforms that use composite IDs.
   *
   * Examples:
   *   - Spigot / Modrinth / CurseForge / Ore: single segment (`"12345"`, `"sodium"`)
   *   - Hangar: two-segment author/slug (`"papermc/eternal-light"`)
   *
   * The caller is responsible for normalising (e.g. `.toLowerCase()`) before
   * passing to a resource client.
   */
  id: string;

  /**
   * Route action — one of:
   *   - `"isValid"` — validity probe
   *   - `"banner.png"` / `"banner.jpg"` — image render
   *
   * Any other value is passed through; the handler decides whether it is valid.
   */
  action: string;
}

/**
 * Parses the wildcard portion of a resource route URL into an `(id, action)`
 * pair.
 *
 * `remainder` is everything after the `/:platform/` prefix — i.e. all URL
 * segments that follow the platform name, joined with `/`.
 *
 * Rules:
 * - The last `/`-delimited segment is always the **action**.
 * - Every segment before it is the **id**.
 * - Returns `null` when there is no separable id+action pair:
 *   - empty string
 *   - no `/` present (only one segment → impossible to separate id from action)
 *   - empty id (e.g. `"/banner.png"` — leading slash produces an empty id)
 *   - empty action (trailing slash)
 *
 * @example
 * parseResourceRoutePath("12345/banner.png")          // { id: "12345",        action: "banner.png" }
 * parseResourceRoutePath("author/slug/isValid")        // { id: "author/slug",  action: "isValid"    }
 * parseResourceRoutePath("too/many/slashes/banner.png")// { id: "too/many/slashes", action: "banner.png" }
 * parseResourceRoutePath("banner.png")                 // null — no id
 * parseResourceRoutePath("")                           // null — empty
 * parseResourceRoutePath("123")                        // null — no slash
 * parseResourceRoutePath("123/")                       // null — empty action
 */
export function parseResourceRoutePath(remainder: string): ParsedResourceRoute | null {
  if (remainder.length === 0) return null;
  const slashIdx = remainder.lastIndexOf("/");
  if (slashIdx === -1) return null;
  const id = remainder.slice(0, slashIdx);
  const action = remainder.slice(slashIdx + 1);
  if (id.length === 0) return null; // e.g. "/banner.png" → empty id
  if (action.length === 0) return null; // trailing slash
  return { id, action };
}

/**
 * Extracts the sub-path (the `id/action` remainder) that follows the platform
 * segment in a URL pathname.
 *
 * Because the resource banner route is mounted at an arbitrary prefix
 * (e.g. `/banner/resource`) and the Hono sub-router handler receives the full
 * URL, we cannot rely on `c.req.path` being relative. This function locates
 * the platform segment by searching for `/{rawPlatform}/` in the pathname and
 * returning everything after it.
 *
 * `rawPlatform` is the **exact** string that Hono matched for `:platform`
 * (case-preserving), so the search is case-sensitive.
 *
 * Returns `null` if the platform marker is not found (should not happen in a
 * properly mounted Hono route, but is handled defensively).
 *
 * @example
 * extractRouteRemainder("/banner/resource/spigot/12345/banner.png", "spigot")
 *   // "12345/banner.png"
 * extractRouteRemainder("/banner/resource/hangar/papermc/eternal-light/isValid", "hangar")
 *   // "papermc/eternal-light/isValid"
 */
export function extractRouteRemainder(pathname: string, rawPlatform: string): string | null {
  const marker = `/${rawPlatform}/`;
  const idx = pathname.indexOf(marker);
  if (idx === -1) return null;
  return pathname.slice(idx + marker.length);
}
