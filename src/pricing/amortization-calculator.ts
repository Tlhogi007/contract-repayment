import type { TermMonths } from './terms';

/** Strategy seam: swap formula engines without changing the cents quote API. */
export interface AmortizationCalculator {
  monthlyPaymentCents(
    principalCents: number,
    termMonths: TermMonths,
    annualRate: number,
  ): number;
}
