import {
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiErrorResponse } from '../common/http/api-error-response';
import { HealthResponseDto, ReadyResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness',
    description: 'Process is up. Does not check the database.',
  })
  @ApiOkResponse({ type: HealthResponseDto })
  live(): HealthResponseDto {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness',
    description:
      'Returns 200 when the database answers SELECT 1; otherwise 503 for probes/alerts.',
  })
  @ApiOkResponse({ type: ReadyResponseDto })
  @ApiServiceUnavailableResponse({ type: ApiErrorResponse })
  ready(): Promise<ReadyResponseDto> {
    return this.healthService.ready();
  }

  /** Local vendor smoke only — enable with VENDOR_SMOKE_ERRORS=1 */
  @Get('smoke-error')
  @ApiExcludeEndpoint()
  smokeError(): never {
    if (process.env.VENDOR_SMOKE_ERRORS !== '1') {
      throw new NotFoundException();
    }
    throw new InternalServerErrorException('vendor smoke simulated 5xx');
  }
}
