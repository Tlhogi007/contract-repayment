import { ApiProperty } from '@nestjs/swagger';
import { NODE_ENVS } from '../../config/env.validation';
import type { NodeEnv } from '../../config/env.validation';

export const API_SERVICE_NAME = 'contract-repayment-api';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: API_SERVICE_NAME })
  service!: string;

  @ApiProperty({ example: '0.1.0' })
  version!: string;

  @ApiProperty({ example: 'development', enum: NODE_ENVS })
  environment!: NodeEnv;

  @ApiProperty({ example: 12, description: 'Process uptime in whole seconds' })
  uptimeSeconds!: number;
}
