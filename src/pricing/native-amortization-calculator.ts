import type { AmortizationCalculator } from './amortization-calculator';
import type { TermMonths } from './terms';

export class NativeAmortizationCalculator implements AmortizationCalculator {
  monthlyPaymentCents(
    principalCents: number,
    termMonths: TermMonths,
    annualRate: number,
  ): number {
    const monthlyRate = annualRate / 12;
    const growth = (1 + monthlyRate) ** termMonths;
    const payment = (principalCents * (monthlyRate * growth)) / (growth - 1);

    return Math.round(payment);
  }
}
