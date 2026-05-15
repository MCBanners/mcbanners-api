/**
 * Raw JSON response shape from mc-api GET /server.
 *
 * Mirrors the mc-api ServerStatus, PlayersInfo, and Motd Java model classes.
 * Icon is a data URI string (`data:image/png;base64,...`) or empty/absent when
 * the server has no favicon.
 */
export interface McApiResponse {
  readonly host: string;
  readonly port: number;
  readonly version: string;
  readonly players: {
    readonly online: number;
    readonly max: number;
  };
  readonly motd: {
    readonly raw: string;
    readonly colorless: string;
    readonly formatted: string;
  };
  /** Data URI or empty string. Absent when server returns no icon. */
  readonly icon?: string;
}
//# sourceMappingURL=mc-api-response.d.ts.map
