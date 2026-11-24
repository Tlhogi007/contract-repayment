import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { requestIdMiddleware } from './request-id.middleware';

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn(() => 'generated-uuid'),
}));

describe('requestIdMiddleware', () => {
  const next = jest.fn() as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('echoes a safe client request id', () => {
    const headers: Record<string, string> = {};
    const request = {
      get: (name: string) =>
        name.toLowerCase() === 'x-request-id' ? 'trace-123' : undefined,
    } as Request;
    const response = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
    } as Response;

    requestIdMiddleware(request, response, next);

    expect(request.requestId).toBe('trace-123');
    expect(headers['x-request-id']).toBe('trace-123');
    expect(randomUUID).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates an id when the header is missing', () => {
    const headers: Record<string, string> = {};
    const request = {
      get: () => undefined,
    } as unknown as Request;
    const response = {
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
    } as Response;

    requestIdMiddleware(request, response, next);

    expect(request.requestId).toBe('generated-uuid');
    expect(headers['x-request-id']).toBe('generated-uuid');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it('replaces an unsafe request id', () => {
    const request = {
      get: () => 'bad/id',
    } as unknown as Request;
    const response = {
      setHeader: jest.fn(),
    } as unknown as Response;

    requestIdMiddleware(request, response, next);

    expect(request.requestId).toBe('generated-uuid');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });
});
