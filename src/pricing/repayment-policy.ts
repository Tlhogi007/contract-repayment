import { Inject, Injectable } from '@nestjs/common';
import type { AmortizationCalculator } from './amortization-calculator';
import { AMORTIZATION_CALCULATOR } from './amortization-calculator.token';
import { MAX_PRINCIPAL_CENTS } from './money';
import { TERM_MONTHS, type TermMonths } from './terms';

export { MAX_PRINCIPAL_CENTS } from './money';
export { TERM_MONTHS, type TermMonths } from './terms';
export type { AmortizationCalculator } from './amortization-calculator';
export { AMORTIZATION_CALCULATOR } from './amortization-calculator.token';
export { NativeAmortizationCalculator } from './native-amortization-calculator';

export const ANNUAL_INTEREST_RATE = 0.065;

export type RepaymentOption = {
  termMonths: TermMonths;
  monthlyPaymentCents: number;
  totalPayableCents: number;
  totalInterestCents: number;
};

@Injectable()
export class RepaymentPolicy {
  readonly annualRate = ANNUAL_INTEREST_RATE;
  readonly terms = TERM_MONTHS;

  constructor(
    @Inject(AMORTIZATION_CALCULATOR)
    private readonly calculator: AmortizationCalculator,
  ) {}

  quote(principalCents: number): RepaymentOption[] {
    this.assertPrincipalCents(principalCents);

    return this.terms.map((termMonths) => {
      const monthlyPaymentCents = this.monthlyPaymentCents(
        principalCents,
        termMonths,
      );
      const totalPayableCents = monthlyPaymentCents * termMonths;
      const totalInterestCents = totalPayableCents - principalCents;

      return {
        termMonths,
        monthlyPaymentCents,
        totalPayableCents,
        totalInterestCents,
      };
    });
  }

  monthlyPaymentCents(principalCents: number, termMonths: TermMonths): number {
    this.assertPrincipalCents(principalCents);

    return this.calculator.monthlyPaymentCents(
      principalCents,
      termMonths,
      this.annualRate,
    );
  }

  private assertPrincipalCents(principalCents: number): void {
    if (!Number.isInteger(principalCents) || principalCents <= 0) {
      throw new RangeError('principalCents must be a positive integer (cents)');
    }
    if (principalCents > MAX_PRINCIPAL_CENTS) {
      throw new RangeError(`principalCents must be <= ${MAX_PRINCIPAL_CENTS}`);
    }
  }
}
