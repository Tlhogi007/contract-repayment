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
});
