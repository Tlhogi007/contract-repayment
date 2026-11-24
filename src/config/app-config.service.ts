import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppEnv, NodeEnv } from './env.validation';

function readPackageVersion(): string {
  const packagePath = join(__dirname, '..', '..', 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as {
    version: string;
  };
  return pkg.version;
}

@Injectable()
export class AppConfigService {
  readonly version = readPackageVersion();

  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get nodeEnv(): NodeEnv {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get jwtSecret(): string {
    return this.config.get('JWT_SECRET', { infer: true });
  }

  get jwtExpiresIn(): string {
    return this.config.get('JWT_EXPIRES_IN', { infer: true });
  }

  get otelServiceName(): string {
    return this.config.get('OTEL_SERVICE_NAME', { infer: true });
  }

  get otlpEndpoint(): string | undefined {
    return this.config.get('OTEL_EXPORTER_OTLP_ENDPOINT', { infer: true });
  }

  get sentryDsn(): string | undefined {
    return this.config.get('SENTRY_DSN', { infer: true });
  }
}
