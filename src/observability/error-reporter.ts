import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

export const ERROR_REPORTER = Symbol('ERROR_REPORTER');

export interface ErrorReporter {
  captureException(error: unknown, context?: Record<string, unknown>): void;
}

@Injectable()
export class LoggingErrorReporter implements ErrorReporter {
  private readonly logger = new Logger('ErrorReporter');

  captureException(error: unknown, context?: Record<string, unknown>): void {
    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(
      `Captured exception${context ? ` ${JSON.stringify(context)}` : ''}`,
      stack,
    );
  }
}

@Injectable()
export class SentryErrorReporter implements ErrorReporter {
  private readonly logger = new Logger('SentryErrorReporter');

  constructor(dsn: string, environment: string, release: string) {
    Sentry.init({
      dsn,
      environment,
      release,
      tracesSampleRate: 0,
    });
    this.logger.log('Sentry error reporting enabled');
  }

  captureException(error: unknown, context?: Record<string, unknown>): void {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context);
      }
      Sentry.captureException(error);
    });
  }
}

export function createErrorReporter(options: {
  sentryDsn?: string;
  environment: string;
  release: string;
}): ErrorReporter {
  if (options.sentryDsn) {
    return new SentryErrorReporter(
      options.sentryDsn,
      options.environment,
      options.release,
    );
  }
  return new LoggingErrorReporter();
}
