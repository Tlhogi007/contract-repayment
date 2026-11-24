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
}
