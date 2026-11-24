import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { MAX_PRINCIPAL_CENTS } from '../../pricing/money';

export class CreateContractDto {
  @ApiProperty({
    example: 100_000,
    maximum: MAX_PRINCIPAL_CENTS,
    description: 'Device principal in integer cents (e.g. 100000 = R1 000.00)',
  })
  @IsInt()
  @Min(1)
  @Max(MAX_PRINCIPAL_CENTS)
  principalCents!: number;
}
