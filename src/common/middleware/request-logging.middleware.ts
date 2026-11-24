import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const MISSING_REQUEST_ID = '-';
const logger = new Logger('HTTP');

export function formatAccessLog(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  requestId: string,
): string {
  return `${method} ${path} ${statusCode} ${durationMs}ms requestId=${requestId}`;
}

/**
 * Access log on response finish so Nest-generated 404s still correlate
 * with `x-request-id`. Bodies are never logged.
 */
export function requestLoggingMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();
  const method = request.method;
  const path = request.originalUrl || request.url;

  response.on('finish', () => {
    const requestId = request.requestId ?? MISSING_REQUEST_ID;
    const durationMs = Date.now() - startedAt;
    const line = formatAccessLog(
      method,
      path,
      response.statusCode,
      durationMs,
      requestId,
    );

    if (response.statusCode >= 500) {
      logger.error(line);
      return;
    }

    if (response.statusCode >= 400) {
      logger.warn(line);
      return;
    }

    logger.log(line);
  });

  next();
}
