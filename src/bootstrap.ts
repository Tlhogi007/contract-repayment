import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { createRequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { AppConfigService } from './config/app-config.service';
import { HttpMetricsService } from './observability/http-metrics.service';

export function configureApp(app: INestApplication): void {
  const appConfig = app.get(AppConfigService);
  const httpMetrics = app.get(HttpMetricsService);

  app.use(requestIdMiddleware);
  app.use(createRequestLoggingMiddleware(httpMetrics));
  app.useGlobalPipes(createValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Contract Repayment API')
    .setDescription(
      [
        'NestJS microservice for **device contract repayment calculations**.',
        '',
        'Register or log in, submit a device principal in **integer cents**, and compare **12 / 24 / 36-month** offerings at **6.5%** amortized interest. Contracts are owned by the authenticated user (JWT Bearer).',
        '',
        '### Journey',
        '1. **POST /auth/register** or **POST /auth/login** — obtain an access token',
        '2. **Authorize** in Swagger with that Bearer token',
        '3. **POST /contracts** — create a contract and receive snapshotted term options',
        '4. **GET / PATCH / DELETE /contracts** — manage your own contracts (PATCH requires **expectedUpdatedAt**)',
        '',
        '### Operations',
        '- **/health** — process liveness (does not check the database)',
        '- **/health/ready** — readiness probe; returns **503** when the database is unreachable',
        '- **/metrics** — Prometheus text exposition backed by OpenTelemetry meters',
        '',
        '### Optional exports',
        'Local runs need no vendor setup. For shared environments:',
        '- **OTEL_EXPORTER_OTLP_ENDPOINT** — push traces and metrics over OTLP HTTP (Datadog, Azure Monitor, AWS Distro for OpenTelemetry, Grafana, Jaeger, and similar collectors)',
        '- **SENTRY_DSN** — forward unhandled 5xx exceptions to Sentry',
      ].join('\n'),
    )
    .setVersion(appConfig.version)
    .addTag('auth', 'Register, login, and current user')
    .addTag(
      'contracts',
      'Owner-scoped contract CRUD with snapshotted 12 / 24 / 36-month repayment options',
    )
    .addTag(
      'health',
      'Liveness and readiness probes for orchestrators and load balancers',
    )
    .addTag(
      'observability',
      'Prometheus scrape endpoint; OpenTelemetry meters with optional OTLP and Sentry via environment variables',
    )
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
    customCss: `
      /* Prometheus text: one metric per line; Swagger's <code> defaults to pre-wrap. */
      .swagger-ui .responses-wrapper .highlight-code,
      .swagger-ui .responses-wrapper .highlight-code > pre.microlight,
      .swagger-ui .responses-wrapper .highlight-code > pre.microlight > code,
      .swagger-ui .responses-wrapper .microlight,
      .swagger-ui .responses-wrapper .microlight code,
      .swagger-ui .responses-wrapper .microlight span,
      .swagger-ui .response-col_description pre,
      .swagger-ui .response-col_description pre code {
        white-space: pre !important;
        word-break: normal !important;
        overflow-wrap: normal !important;
        word-wrap: normal !important;
      }
      .swagger-ui .responses-wrapper .highlight-code,
      .swagger-ui .responses-wrapper .highlight-code > pre.microlight {
        overflow-x: auto !important;
        overflow-y: auto !important;
        max-height: 22rem;
        line-height: 1.55 !important;
        font-size: 12px !important;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
      }
    `,
  });
}
