import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { AppConfigService } from './config/app-config.service';
import { startTelemetry } from './observability/telemetry';

function readPackageVersion(): string {
  const packagePath = join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as {
    version: string;
  };
  return pkg.version;
}

async function bootstrap() {
  startTelemetry({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'contract-repayment-api',
    serviceVersion: readPackageVersion(),
    environment: process.env.NODE_ENV ?? 'development',
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  });

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableShutdownHooks();
  configureApp(app);

  const { port } = app.get(AppConfigService);
  await app.listen(port);

  Logger.log(`Listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
