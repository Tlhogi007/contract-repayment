import {
  context,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  metrics,
  trace,
} from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  type MetricReader,
} from '@opentelemetry/sdk-metrics';
import { BatchSpanProcessor, TracerProvider } from '@opentelemetry/sdk-trace';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';

export type TelemetryOptions = {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  otlpEndpoint?: string;
};

let meterProvider: MeterProvider | undefined;
let tracerProvider: TracerProvider | undefined;
let prometheusExporter: PrometheusExporter | undefined;
let started = false;

function normalizeOtlpBase(endpoint: string): string {
  return endpoint.replace(/\/$/, '');
}

function resolveDiagLogLevel(level = process.env.OTEL_LOG_LEVEL): DiagLogLevel {
  switch (level?.toLowerCase()) {
    case 'debug':
      return DiagLogLevel.DEBUG;
    case 'info':
      return DiagLogLevel.INFO;
    default:
      return DiagLogLevel.ERROR;
  }
}

/**
 * Boots vendor-neutral OpenTelemetry.
 * Always exposes a Prometheus scrape view; pushes OTLP when an endpoint is set
 * (Datadog / Azure Monitor / AWS Distro / Grafana / etc. via their OTLP intake).
 */
export function startTelemetry(options: TelemetryOptions): void {
  if (started) {
    return;
  }

  diag.setLogger(new DiagConsoleLogger(), resolveDiagLogLevel());
  try {
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable(),
    );
  } catch {
    // Already registered (e.g. Jest worker reuse).
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: options.serviceName,
    [ATTR_SERVICE_VERSION]: options.serviceVersion,
    'deployment.environment': options.environment,
  });

  prometheusExporter = new PrometheusExporter({ preventServerStart: true });
  const readers: MetricReader[] = [prometheusExporter];

  if (options.otlpEndpoint) {
    const base = normalizeOtlpBase(options.otlpEndpoint);
    const exportIntervalMillis = Number(
      process.env.OTEL_METRIC_EXPORT_INTERVAL ?? 60000,
    );
    // Visible even when OTEL diag level is ERROR (smoke / local verify).
    console.info(
      `[telemetry] OTLP export enabled → ${base}/v1/metrics + /v1/traces (interval ${exportIntervalMillis}ms)`,
    );
    readers.push(
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${base}/v1/metrics`,
        }),
        exportIntervalMillis,
        exportTimeoutMillis: Math.min(exportIntervalMillis, 30000),
      }),
    );

    tracerProvider = new TracerProvider({
      resource,
      spanProcessors: [
        new BatchSpanProcessor({
          exporter: new OTLPTraceExporter({
            url: `${base}/v1/traces`,
          }),
        }),
      ],
    });
    trace.setGlobalTracerProvider(tracerProvider);
  }

  meterProvider = new MeterProvider({
    resource,
    readers,
  });
  try {
    metrics.setGlobalMeterProvider(meterProvider);
  } catch {
    // Already registered (e.g. Jest worker reuse).
  }
  started = true;
}

export function getPrometheusExporter(): PrometheusExporter {
  if (!prometheusExporter) {
    throw new Error('Telemetry has not been started');
  }
  return prometheusExporter;
}

export function isTelemetryStarted(): boolean {
  return started;
}

export async function shutdownTelemetry(): Promise<void> {
  const shutdowns: Promise<unknown>[] = [];
  if (meterProvider) {
    shutdowns.push(meterProvider.shutdown());
  }
  if (tracerProvider) {
    shutdowns.push(tracerProvider.shutdown());
  }
  await Promise.all(shutdowns);
  meterProvider = undefined;
  tracerProvider = undefined;
  prometheusExporter = undefined;
  started = false;
}
