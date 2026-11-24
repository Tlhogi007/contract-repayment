import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PricingModule } from '../pricing/pricing.module';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [AuthModule, PricingModule],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}
