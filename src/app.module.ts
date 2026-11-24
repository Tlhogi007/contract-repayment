import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/app-config.module';
import { ContractsModule } from './contracts/contracts.module';
import { HealthModule } from './health/health.module';
import { PricingModule } from './pricing/pricing.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    PricingModule,
    ContractsModule,
    HealthModule,
  ],
})
export class AppModule {}
