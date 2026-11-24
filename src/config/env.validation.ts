import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export const NODE_ENVS = ['development', 'test', 'production'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

export interface AppEnv {
  PORT: number;
  NODE_ENV: NodeEnv;
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
  };
}
