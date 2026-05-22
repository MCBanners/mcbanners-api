import { logger } from "@mcbanners/logger";
import type { MiddlewareHandler } from "hono";

const isValidRequestId = (id: string): boolean => {
  if (id.length > 128) return false;
  for (let i = 0; i < id.length; i++) {
    const c = id.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
};

export const requestLoggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const incomingId = c.req.header("x-request-id");
  const requestId =
    incomingId !== undefined && isValidRequestId(incomingId) ? incomingId : crypto.randomUUID();
  c.header("X-Request-ID", requestId);
  await next();
  logger.info({
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    durationMs: Date.now() - start
  });
};
