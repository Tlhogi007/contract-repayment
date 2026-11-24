import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppConfigService } from '../config/app-config.service';
import { API_SERVICE_NAME, HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness check',
    description:
      'Process liveness only. Readiness (DB/auth) lands with those dependencies.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  check(): HealthResponseDto {
    return {
      status: 'ok',
      service: API_SERVICE_NAME,
      version: this.appConfig.version,
      environment: this.appConfig.nodeEnv,
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
