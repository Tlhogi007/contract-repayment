import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
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
}
