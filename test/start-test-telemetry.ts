import {
  isTelemetryStarted,
  startTelemetry,
} from '../src/observability/telemetry';

/** E2e must boot OTel before Nest creates HttpMetricsService. */
export function startTestTelemetry(): void {
  if (isTelemetryStarted()) {
    return;
  }

  startTelemetry({
    serviceName: 'contract-repayment-api-e2e',
    serviceVersion: '0.0.0-test',
    environment: 'test',
  });
}
