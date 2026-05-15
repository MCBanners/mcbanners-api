import type { ServiceBackend } from "@mcbanners/domain";

/**
 * Rating information for a marketplace resource.
 * Mirrors Resource.rating() from the legacy Java domain objects.
 */
export interface RatingData {
  /** Total number of ratings/reviews. */
  readonly count: number;
  /** Average star rating (0–5), or null if no ratings. */
  readonly average: number | null;
}

/**
 * Price information for a premium marketplace resource.
 * Mirrors PriceInformation from the legacy Java domain objects.
 */
export interface PriceData {
  readonly amount: number;
  readonly currency: string;
}

/**
 * Normalized resource data used by the banner layout builder.
 * Mirrors Resource from the legacy Java domain objects.
 */
export interface ResourceData {
  readonly name: string;
  /** Base64-encoded PNG/JPG logo (no data URI prefix), or null if unavailable. */
  readonly logoBase64: string | null;
  readonly downloadCount: number;
  /** ISO 8601 datetime string of last update, or null if unavailable. */
  readonly lastUpdated: string | null;
  readonly rating: RatingData;
  /** null = free resource; non-null = premium resource. */
  readonly price: PriceData | null;
}

/**
 * Normalized author data used by the banner layout builder.
 * Mirrors Author from the legacy Java domain objects.
 */
export interface AuthorData {
  readonly name: string;
}

/**
 * Full input data for building a resource banner.
 * Combines resource, author, and the marketplace backend for conditional logic.
 */
export interface ResourceBannerData {
  readonly resource: ResourceData;
  readonly author: AuthorData;
  readonly backend: ServiceBackend;
}
