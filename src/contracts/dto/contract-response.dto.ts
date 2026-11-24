import { ApiProperty } from '@nestjs/swagger';

export class ContractOptionResponseDto {
  @ApiProperty({ example: 12 })
  termMonths!: number;

  @ApiProperty({ example: 8630 })
  monthlyPaymentCents!: number;

  @ApiProperty({ example: 103_560 })
  totalPayableCents!: number;

  @ApiProperty({ example: 3560 })
  totalInterestCents!: number;
}

export class ContractResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 100_000 })
  principalCents!: number;

  @ApiProperty({ example: 0.065 })
  annualRate!: number;

  @ApiProperty({ type: [ContractOptionResponseDto] })
  options!: ContractOptionResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
