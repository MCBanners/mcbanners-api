import type { MiddlewareHandler } from "hono";
import { logger } from "@mcbanners/logger";

export const requestLoggerMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
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
