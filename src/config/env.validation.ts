import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export const NODE_ENVS = ['development', 'test', 'production'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

export const DEFAULT_JWT_EXPIRES_IN = '1h';

export interface AppEnv {
  PORT: number;
  NODE_ENV: NodeEnv;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  OTEL_SERVICE_NAME: string;
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  SENTRY_DSN?: string;
}

export type ValidatedEnv = Record<string, unknown> & AppEnv;

export class EnvironmentVariables {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsOptional()
  @IsIn(NODE_ENVS)
  NODE_ENV?: NodeEnv;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  OTEL_SERVICE_NAME?: string;

  /** OTLP HTTP base, e.g. http://localhost:4318 — Datadog/Azure/AWS/Grafana agents accept this. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;

  /** When set, 5xx exceptions are also sent to Sentry. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  SENTRY_DSN?: string;
}

export function validateEnv(config: Record<string, unknown>): ValidatedEnv {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');

    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return {
    ...config,
    PORT: validated.PORT ?? 3000,
    NODE_ENV: validated.NODE_ENV ?? 'development',
    DATABASE_URL: validated.DATABASE_URL,
    JWT_SECRET: validated.JWT_SECRET,
    JWT_EXPIRES_IN: validated.JWT_EXPIRES_IN ?? DEFAULT_JWT_EXPIRES_IN,
    OTEL_SERVICE_NAME: validated.OTEL_SERVICE_NAME ?? 'contract-repayment-api',
    OTEL_EXPORTER_OTLP_ENDPOINT: validated.OTEL_EXPORTER_OTLP_ENDPOINT,
    SENTRY_DSN: validated.SENTRY_DSN,
  };
}
