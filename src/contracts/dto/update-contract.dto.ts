import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, Max, Min } from 'class-validator';
import { MAX_PRINCIPAL_CENTS } from '../../pricing/money';

export class UpdateContractDto {
  @ApiProperty({
    example: 150_000,
    maximum: MAX_PRINCIPAL_CENTS,
    description: 'Updated device principal in integer cents',
  })
  @IsInt()
  @Min(1)
  @Max(MAX_PRINCIPAL_CENTS)
  principalCents!: number;

  @ApiProperty({
    example: '2026-01-02T00:00:00.000Z',
    description:
      'updatedAt from the last read; stale values reject with 409 Conflict',
  })
  @IsDateString()
  expectedUpdatedAt!: string;
}
