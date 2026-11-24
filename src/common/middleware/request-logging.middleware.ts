import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { HttpMetricsService } from '../../observability/http-metrics.service';

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

function shouldRecordMetrics(path: string): boolean {
  const pathname = path.split('?')[0] ?? path;
  return (
    pathname !== '/metrics' &&
    pathname !== '/health' &&
    !pathname.startsWith('/health/') &&
    !pathname.startsWith('/api/docs')
  );
}

export function createRequestLoggingMiddleware(
  httpMetrics?: HttpMetricsService,
): (request: Request, response: Response, next: NextFunction) => void {
  return (request: Request, response: Response, next: NextFunction): void => {
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

      if (httpMetrics && shouldRecordMetrics(path)) {
        httpMetrics.recordHttpRequest(response.statusCode, durationMs);
      }

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
  };
}

/** Default export for unit tests that do not inject HttpMetricsService. */
export const requestLoggingMiddleware = createRequestLoggingMiddleware();
