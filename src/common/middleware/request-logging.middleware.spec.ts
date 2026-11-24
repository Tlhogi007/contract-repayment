import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  formatAccessLog,
  requestLoggingMiddleware,
} from './request-logging.middleware';

function createResponse(): Response & {
  emitFinish: () => void;
  statusCode: number;
} {
  let finishHandler: (() => void) | undefined;
  const response = {
    statusCode: 200,
    on(event: string, handler: (...args: unknown[]) => void) {
      if (event === 'finish') {
        finishHandler = () => handler();
      }
      return response;
    },
    emitFinish() {
      finishHandler?.();
    },
  };

  return response as Response & { emitFinish: () => void; statusCode: number };
}

function freezeClock(): void {
  jest.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(1_007);
}

describe('requestLoggingMiddleware', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  beforeEach(() => {
    log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    error = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('formats an access log line', () => {
    expect(formatAccessLog('GET', '/health', 200, 3, 'req-1')).toBe(
      'GET /health 200 3ms requestId=req-1',
    );
  });

  it('logs successful requests', () => {
    freezeClock();

    const request = {
      method: 'GET',
      originalUrl: '/health',
      url: '/health',
      requestId: 'req-ok',
    } as Request;
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    requestLoggingMiddleware(request, response, next);
    response.statusCode = 200;
    response.emitFinish();

    expect(next).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('GET /health 200 7ms requestId=req-ok');
  });

  it('warns on client errors so a 404 still has a log line', () => {
    freezeClock();

    const request = {
      method: 'GET',
      originalUrl: '/missing',
      url: '/missing',
      requestId: 'req-404',
    } as Request;
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    requestLoggingMiddleware(request, response, next);
    response.statusCode = 404;
    response.emitFinish();

    expect(warn).toHaveBeenCalledWith('GET /missing 404 7ms requestId=req-404');
  });

  it('errors on server failures', () => {
    freezeClock();

    const request = {
      method: 'GET',
      originalUrl: '/health',
      url: '/health',
      requestId: 'req-500',
    } as Request;
    const response = createResponse();
    const next = jest.fn() as NextFunction;

    requestLoggingMiddleware(request, response, next);
    response.statusCode = 500;
    response.emitFinish();

    expect(error).toHaveBeenCalledWith('GET /health 500 7ms requestId=req-500');
  });
});
