import type { McApiResponse } from "./mc-api-response";
import type { MinecraftServerStatus } from "./types";
/**
 * Normalizes a raw mc-api response into a typed MinecraftServerStatus.
 *
 * - Icon is preserved as a full data URI (or null for absent/empty).
 * - Player counts default to 0 when absent.
 * - MOTD fields default to empty string when absent.
 */
export declare const normalizeMinecraftServerStatus: (
  response: McApiResponse
) => MinecraftServerStatus;
//# sourceMappingURL=normalize.d.ts.map
