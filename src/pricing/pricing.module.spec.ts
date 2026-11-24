import { Test } from '@nestjs/testing';
import { AMORTIZATION_CALCULATOR } from './amortization-calculator.token';
import { PricingModule } from './pricing.module';
import { RepaymentPolicy } from './repayment-policy';

describe('PricingModule', () => {
  it('wires RepaymentPolicy to the native calculator by default', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PricingModule],
    }).compile();

    const policy = moduleRef.get(RepaymentPolicy);

    expect(policy.quote(100_000)[0]?.monthlyPaymentCents).toBe(8630);
  });

  it('allows replacing the calculator via the DI token', async () => {
    const monthlyPaymentCents = jest.fn().mockReturnValue(1234);

    const moduleRef = await Test.createTestingModule({
      imports: [PricingModule],
    })
      .overrideProvider(AMORTIZATION_CALCULATOR)
      .useValue({ monthlyPaymentCents })
      .compile();

    const policy = moduleRef.get(RepaymentPolicy);
    const options = policy.quote(50_000);

    expect(monthlyPaymentCents).toHaveBeenCalled();
    expect(options[0]?.monthlyPaymentCents).toBe(1234);
  });
});
