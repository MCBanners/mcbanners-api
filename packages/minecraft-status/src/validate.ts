/**
 * Input validation for Minecraft server host and port values.
 *
 * Returns null when the input is valid, or an error-message string when invalid.
 * Checks are intentionally simple and compatibility-friendly — they reject
 * obviously malformed input without over-fitting to specific hostname formats.
 */

/** Maximum allowed hostname/IP length per RFC 1035. */
const MAX_HOST_LENGTH = 253;

/**
 * Validates a Minecraft server hostname.
 * Returns null on success, or an error-message string on failure.
 */
export function validateHost(host: string): string | null {
  if (typeof host !== "string" || host.trim().length === 0) {
    return "Host must not be empty";
  }
  if (host.length > MAX_HOST_LENGTH) {
    return `Host exceeds maximum length of ${String(MAX_HOST_LENGTH)} characters`;
  }
  return null;
}

/**
 * Validates a Minecraft server port number.
 * Returns null on success, or an error-message string on failure.
 */
export function validatePort(port: number): string | null {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return `Port must be an integer between 1 and 65535 (got ${String(port)})`;
  }
  return null;
}
