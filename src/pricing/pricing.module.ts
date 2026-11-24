import { Module } from '@nestjs/common';
import { AMORTIZATION_CALCULATOR } from './amortization-calculator.token';
import { NativeAmortizationCalculator } from './native-amortization-calculator';
import { RepaymentPolicy } from './repayment-policy';

@Module({
  providers: [
    {
      provide: AMORTIZATION_CALCULATOR,
      useClass: NativeAmortizationCalculator,
    },
    RepaymentPolicy,
  ],
  exports: [RepaymentPolicy],
})
export class PricingModule {}
