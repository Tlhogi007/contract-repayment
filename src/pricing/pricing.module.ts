import { Module } from '@nestjs/common';
import { AMORTIZATION_CALCULATOR } from './amortization-calculator.token';
import { NativeAmortizationCalculator } from './native-amortization-calculator';
import { RepaymentPolicy } from './repayment-policy';

@Module({
  providers: [
    NativeAmortizationCalculator,
    {
      provide: AMORTIZATION_CALCULATOR,
      useExisting: NativeAmortizationCalculator,
    },
    RepaymentPolicy,
  ],
  exports: [RepaymentPolicy],
})
export class PricingModule {}
