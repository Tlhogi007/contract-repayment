import { NativeAmortizationCalculator } from './native-amortization-calculator';

describe('NativeAmortizationCalculator', () => {
  const calculator = new NativeAmortizationCalculator();

  it('matches golden monthly payments at 6.5%', () => {
    expect(calculator.monthlyPaymentCents(100_000, 12, 0.065)).toBe(8630);
    expect(calculator.monthlyPaymentCents(100_000, 24, 0.065)).toBe(4455);
    expect(calculator.monthlyPaymentCents(100_000, 36, 0.065)).toBe(3065);
  });
});
