import { Controller, Get, Header } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { PrometheusSerializer } from '@opentelemetry/exporter-prometheus';
import { SkipThrottle } from '@nestjs/throttler';
import { getPrometheusExporter } from '../observability/telemetry';

const prometheusSerializer = new PrometheusSerializer();

@ApiTags('observability')
@SkipThrottle()
@Controller()
export class MetricsController {
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({
    summary: 'Prometheus metrics',
    description:
      'Prometheus text exposition (OpenTelemetry meters). Long lines are normal — scroll horizontally in Swagger, or use curl for a terminal view. Optional exports: OTEL_EXPORTER_OTLP_ENDPOINT, SENTRY_DSN.',
  })
  @ApiProduces('text/plain')
  @ApiOkResponse({
    description: 'Prometheus text exposition format',
    schema: {
      type: 'string',
      example: [
        '# HELP http_server_requests_total HTTP requests handled by the API',
        '# TYPE http_server_requests_total counter',
        'http_server_requests_total{http_status_class="2xx"} 1',
      ].join('\n'),
    },
  })
  async metrics(): Promise<string> {
    const { resourceMetrics } = await getPrometheusExporter().collect();
    return prometheusSerializer.serialize(resourceMetrics);
  }
}
