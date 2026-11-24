import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  API_SERVICE_NAME,
  HealthResponseDto,
  ReadyResponseDto,
} from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  live(): HealthResponseDto {
    return {
      status: 'ok',
      service: API_SERVICE_NAME,
      version: this.appConfig.version,
      environment: this.appConfig.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  async ready(): Promise<ReadyResponseDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }

    return {
      status: 'ok',
      service: API_SERVICE_NAME,
      version: this.appConfig.version,
      environment: this.appConfig.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
      checks: {
        database: 'up',
      },
    };
  }
}
