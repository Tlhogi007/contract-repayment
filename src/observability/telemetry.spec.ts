import {
  getPrometheusExporter,
  isTelemetryStarted,
  shutdownTelemetry,
  startTelemetry,
} from './telemetry';

describe('telemetry', () => {
  afterEach(async () => {
    await shutdownTelemetry();
  });

  it('starts a Prometheus scrape exporter by default', () => {
    startTelemetry({
      serviceName: 'contract-repayment-api-test',
      serviceVersion: '0.0.0-test',
      environment: 'test',
    });

    expect(isTelemetryStarted()).toBe(true);
    expect(getPrometheusExporter()).toBeDefined();
  });

  it('is idempotent when start is called twice', () => {
    startTelemetry({
      serviceName: 'contract-repayment-api-test',
      serviceVersion: '0.0.0-test',
      environment: 'test',
    });
    startTelemetry({
      serviceName: 'contract-repayment-api-test',
      serviceVersion: '0.0.0-test',
      environment: 'test',
    });

    expect(isTelemetryStarted()).toBe(true);
  });

  it('throws when Prometheus exporter is requested before start', async () => {
    await shutdownTelemetry();
    expect(() => getPrometheusExporter()).toThrow(
      /Telemetry has not been started/,
    );
  });
});
