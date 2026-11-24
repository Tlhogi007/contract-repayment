import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const DEFAULT_CONTRACTS_PAGE_SIZE = 20;
export const MAX_CONTRACTS_PAGE_SIZE = 100;

export class ListContractsQueryDto {
  @ApiPropertyOptional({
    default: DEFAULT_CONTRACTS_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_CONTRACTS_PAGE_SIZE,
    description: 'Page size (bounded to protect list latency)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CONTRACTS_PAGE_SIZE)
  limit?: number = DEFAULT_CONTRACTS_PAGE_SIZE;

  @ApiPropertyOptional({
    description:
      'Opaque cursor from the previous page `nextCursor` (contract id)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
