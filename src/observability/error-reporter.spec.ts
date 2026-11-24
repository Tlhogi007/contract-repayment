import { Logger } from '@nestjs/common';

const sentryInit = jest.fn();
const sentryCaptureException = jest.fn();
const setExtras = jest.fn();
const sentryWithScope = jest.fn(
  (cb: (scope: { setExtras: typeof setExtras }) => void) => {
    cb({ setExtras });
  },
);

jest.mock('@sentry/node', () => ({
  init: (...args: unknown[]): void => {
    sentryInit(...args);
  },
  withScope: (cb: (scope: { setExtras: typeof setExtras }) => void): void => {
    sentryWithScope(cb);
  },
  captureException: (...args: unknown[]): string => {
    sentryCaptureException(...args);
    return 'event-id';
  },
}));

import {
  createErrorReporter,
  LoggingErrorReporter,
  SentryErrorReporter,
} from './error-reporter';

describe('createErrorReporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses logging reporter when Sentry DSN is absent', () => {
    const reporter = createErrorReporter({
      environment: 'test',
      release: 'contract-repayment-api@0.0.0',
    });

    expect(reporter).toBeInstanceOf(LoggingErrorReporter);
    expect(sentryInit).not.toHaveBeenCalled();
  });

  it('uses Sentry when a DSN is configured', () => {
    const reporter = createErrorReporter({
      sentryDsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
      environment: 'test',
      release: 'contract-repayment-api@0.0.0',
    });

    expect(reporter).toBeInstanceOf(SentryErrorReporter);
    expect(sentryInit).toHaveBeenCalled();
  });
});

describe('LoggingErrorReporter', () => {
  it('logs captured exceptions with optional context', () => {
    const errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const reporter = new LoggingErrorReporter();

    reporter.captureException(new Error('boom'));
    reporter.captureException(new Error('boom'), { path: '/x' });

    expect(errorLog).toHaveBeenCalledTimes(2);
    errorLog.mockRestore();
  });
});

describe('SentryErrorReporter', () => {
  it('forwards exceptions to Sentry', () => {
    const reporter = createErrorReporter({
      sentryDsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
      environment: 'test',
      release: 'contract-repayment-api@0.0.0',
    });

    reporter.captureException(new Error('boom'), { path: '/x' });
    reporter.captureException(new Error('boom'));

    expect(sentryWithScope).toHaveBeenCalled();
    expect(sentryCaptureException).toHaveBeenCalled();
  });
});
