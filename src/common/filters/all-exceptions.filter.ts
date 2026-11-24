import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ERROR_REPORTER,
  type ErrorReporter,
} from '../../observability/error-reporter';
import { ApiErrorResponse } from '../http/api-error-response';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    @Inject(ERROR_REPORTER) private readonly errorReporter: ErrorReporter,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = this.buildErrorBody(exception, statusCode, request);

    if (!(exception instanceof HttpException) || statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `Unhandled exception ${request.method} ${body.path} requestId=${body.requestId ?? '-'}`,
        stack,
      );
      this.errorReporter.captureException(exception, {
        path: body.path,
        method: request.method,
        requestId: body.requestId,
        statusCode,
      });
    }

    response.status(statusCode).json(body);
  }

  private buildErrorBody(
    exception: unknown,
    statusCode: number,
    request: Request,
  ): ApiErrorResponse {
    let message: string | string[] = 'Internal server error';
    let error = statusCode >= 500 ? 'Internal Server Error' : 'Error';

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const fields = payload as {
          message?: string | string[];
          error?: string;
        };

        if (fields.message !== undefined) {
          message = fields.message;
        }
        if (fields.error !== undefined) {
          error = fields.error;
        }
      }
    }

    return {
      statusCode,
      error,
      message,
      path: request.originalUrl || request.url,
      timestamp: new Date().toISOString(),
      requestId: request.requestId,
    };
  }
}
