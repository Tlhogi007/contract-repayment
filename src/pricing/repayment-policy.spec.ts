import type { AmortizationCalculator } from './amortization-calculator';
import { NativeAmortizationCalculator } from './native-amortization-calculator';
import {
  MAX_PRINCIPAL_CENTS,
  RepaymentPolicy,
  TERM_MONTHS,
} from './repayment-policy';

describe('RepaymentPolicy', () => {
  const policy = new RepaymentPolicy(new NativeAmortizationCalculator());

  it('exposes the assessment rate and terms', () => {
    expect(policy.annualRate).toBe(0.065);
    expect(policy.terms).toEqual([12, 24, 36]);
    expect(TERM_MONTHS).toEqual([12, 24, 36]);
  });

  it('quotes golden values for 100000 cents principal', () => {
    const options = policy.quote(100_000);

    expect(options).toEqual([
      {
        termMonths: 12,
        monthlyPaymentCents: 8630,
        totalPayableCents: 103_560,
        totalInterestCents: 3560,
      },
      {
        termMonths: 24,
        monthlyPaymentCents: 4455,
        totalPayableCents: 106_920,
        totalInterestCents: 6920,
      },
      {
        termMonths: 36,
        monthlyPaymentCents: 3065,
        totalPayableCents: 110_340,
        totalInterestCents: 10_340,
      },
    ]);
  });

  it('quotes golden values for 1000000 cents principal', () => {
    expect(policy.quote(1_000_000)).toEqual([
      {
        termMonths: 12,
        monthlyPaymentCents: 86_296,
        totalPayableCents: 1_035_552,
        totalInterestCents: 35_552,
      },
      {
        termMonths: 24,
        monthlyPaymentCents: 44_546,
        totalPayableCents: 1_069_104,
        totalInterestCents: 69_104,
      },
      {
        termMonths: 36,
        monthlyPaymentCents: 30_649,
        totalPayableCents: 1_103_364,
        totalInterestCents: 103_364,
      },
    ]);
  });

  it('is deterministic across repeated calls', () => {
    expect(policy.quote(250_000)).toEqual(policy.quote(250_000));
  });

  it('rejects non-positive or non-integer principals', () => {
    expect(() => policy.quote(0)).toThrow(RangeError);
    expect(() => policy.quote(-100)).toThrow(RangeError);
    expect(() => policy.quote(10.5)).toThrow(RangeError);
    expect(() => policy.monthlyPaymentCents(0, 12)).toThrow(RangeError);
  });

  it('rejects principals above the Int-safe money ceiling', () => {
    expect(() => policy.quote(MAX_PRINCIPAL_CENTS + 1)).toThrow(RangeError);
  });

  it('quotes at the maximum allowed principal without overflowing Int totals', () => {
    const options = policy.quote(MAX_PRINCIPAL_CENTS);
    const intMax = 2_147_483_647;

    for (const option of options) {
      expect(Number.isInteger(option.monthlyPaymentCents)).toBe(true);
      expect(option.totalPayableCents).toBeLessThanOrEqual(intMax);
      expect(option.totalInterestCents).toBeLessThanOrEqual(intMax);
    }
  });

  it('delegates formula math to the injected calculator (Strategy)', () => {
    const monthlyPaymentCents = jest.fn().mockReturnValue(999);
    const calculator: AmortizationCalculator = { monthlyPaymentCents };
    const customPolicy = new RepaymentPolicy(calculator);

    const options = customPolicy.quote(50_000);

    expect(monthlyPaymentCents).toHaveBeenCalledTimes(3);
    expect(monthlyPaymentCents).toHaveBeenCalledWith(50_000, 12, 0.065);
    expect(options[0]).toEqual({
      termMonths: 12,
      monthlyPaymentCents: 999,
      totalPayableCents: 999 * 12,
      totalInterestCents: 999 * 12 - 50_000,
    });
  });
});
