import { Injectable } from '@nestjs/common';
import { metrics, type Counter, type Histogram } from '@opentelemetry/api';

const METER_NAME = 'contract-repayment-api.http';

@Injectable()
export class HttpMetricsService {
  private readonly requests: Counter;
  private readonly duration: Histogram;

  constructor() {
    const meter = metrics.getMeter(METER_NAME);
    this.requests = meter.createCounter('http_server_requests_total', {
      description: 'HTTP requests handled by the API',
    });
    this.duration = meter.createHistogram('http_server_request_duration_ms', {
      description: 'HTTP request duration in milliseconds',
      unit: 'ms',
    });
  }

  recordHttpRequest(statusCode: number, durationMs: number): void {
    const statusClass = `${Math.floor(statusCode / 100)}xx`;
    const attributes = {
      'http.response.status_code': statusCode,
      'http.status_class': statusClass,
    };

    this.requests.add(1, attributes);
    this.duration.record(durationMs, attributes);
  }
}
