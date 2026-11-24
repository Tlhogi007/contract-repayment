import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

function isSafeRequestId(
  headerValue: string | undefined,
): headerValue is string {
  return headerValue !== undefined && SAFE_REQUEST_ID.test(headerValue);
}

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const headerValue = request.get('x-request-id');
  const requestId = isSafeRequestId(headerValue) ? headerValue : randomUUID();

  request.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  next();
}
