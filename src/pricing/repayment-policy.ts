export const ANNUAL_INTEREST_RATE = 0.065;
export const TERM_MONTHS = [12, 24, 36] as const;

export type TermMonths = (typeof TERM_MONTHS)[number];

export type RepaymentOption = {
  termMonths: TermMonths;
  monthlyPaymentCents: number;
  totalPayableCents: number;
  totalInterestCents: number;
};

export class RepaymentPolicy {
  readonly annualRate = ANNUAL_INTEREST_RATE;
  readonly terms = TERM_MONTHS;

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

    const monthlyRate = this.annualRate / 12;
    const growth = (1 + monthlyRate) ** termMonths;
    const payment = (principalCents * (monthlyRate * growth)) / (growth - 1);

    return Math.round(payment);
  }

  private assertPrincipalCents(principalCents: number): void {
    if (!Number.isInteger(principalCents) || principalCents <= 0) {
      throw new RangeError('principalCents must be a positive integer (cents)');
    }
  }
}
