import { HttpMetricsService } from './http-metrics.service';
import { shutdownTelemetry, startTelemetry } from './telemetry';

describe('HttpMetricsService', () => {
  beforeEach(() => {
    startTelemetry({
      serviceName: 'contract-repayment-api-test',
      serviceVersion: '0.0.0-test',
      environment: 'test',
    });
  });

  afterEach(async () => {
    await shutdownTelemetry();
  });

  it('records request counters without throwing', () => {
    const metrics = new HttpMetricsService();
    expect(() => metrics.recordHttpRequest(200, 12)).not.toThrow();
    expect(() => metrics.recordHttpRequest(500, 40)).not.toThrow();
  });
});
