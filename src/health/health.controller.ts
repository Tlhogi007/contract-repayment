import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppConfigService } from '../config/app-config.service';
import { API_SERVICE_NAME, HealthResponseDto } from './dto/health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly appConfig: AppConfigService;

  constructor(appConfig: AppConfigService) {
    this.appConfig = appConfig;
  }

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
