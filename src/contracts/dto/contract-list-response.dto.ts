import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractResponseDto } from './contract-response.dto';

export class ContractListResponseDto {
  @ApiProperty({ type: [ContractResponseDto] })
  data!: ContractResponseDto[];

  @ApiPropertyOptional({
    nullable: true,
    description: 'Pass as `cursor` on the next request; null when exhausted',
  })
  nextCursor!: string | null;
}
