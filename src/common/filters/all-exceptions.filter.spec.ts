import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiErrorResponse } from '../http/api-error-response';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createHost(request: Partial<Request>) {
  const json = jest.fn<void, [ApiErrorResponse]>();
  const status = jest.fn().mockReturnValue({ json });

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ status }) as unknown as Response,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  let errorLog: jest.SpyInstance;

  beforeAll(() => {
    errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('keeps validation messages', () => {
    const { host, status, json } = createHost({
      method: 'POST',
      originalUrl: '/contracts',
      url: '/contracts',
      requestId: 'req-1',
    });

    filter.catch(
      new BadRequestException(['amount must be a positive number']),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'Bad Request',
        message: ['amount must be a positive number'],
        path: '/contracts',
        requestId: 'req-1',
      }),
    );
  });

  it('hides unexpected error details from the client', () => {
    const { host, status, json } = createHost({
      method: 'GET',
      originalUrl: '/health',
      url: '/health',
    });

    filter.catch(new Error('database password is hunter2'), host);

    const body = json.mock.calls[0]?.[0];
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body?.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('hunter2');
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('Unhandled exception GET /health'),
      expect.any(String),
    );
  });

  it('keeps a string exception message', () => {
    const { host, status, json } = createHost({
      method: 'GET',
      originalUrl: '/health',
      url: '/health',
    });

    filter.catch(new HttpException('teapot', HttpStatus.I_AM_A_TEAPOT), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.I_AM_A_TEAPOT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 418,
        message: 'teapot',
      }),
    );
  });

  it('maps not found to 404', () => {
    const { host, status } = createHost({
      method: 'GET',
      originalUrl: '/missing',
      url: '/missing',
    });

    filter.catch(new NotFoundException('Cannot GET /missing'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });

  it('uses url when originalUrl is absent and keeps empty object payloads safe', () => {
    const { host, status, json } = createHost({
      method: 'GET',
      url: '/fallback-path',
    });

    filter.catch(new HttpException({}, HttpStatus.BAD_GATEWAY), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 502,
        path: '/fallback-path',
        message: 'Internal server error',
        error: 'Internal Server Error',
      }),
    );
    expect(errorLog).toHaveBeenCalled();
  });

  it('logs non-Error throws without a stack', () => {
    const { host, status, json } = createHost({
      method: 'GET',
      originalUrl: '/health',
      url: '/health',
    });

    filter.catch('boom', host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Internal server error',
      }),
    );
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('Unhandled exception GET /health'),
      undefined,
    );
  });

  it('ignores null HttpException bodies', () => {
    const { host, status, json } = createHost({
      method: 'POST',
      originalUrl: '/contracts',
      url: '/contracts',
    });

    filter.catch(
      new HttpException(null as unknown as string, HttpStatus.BAD_REQUEST),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Internal server error',
      }),
    );
  });
});
