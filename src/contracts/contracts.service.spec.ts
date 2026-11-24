import { NotFoundException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../prisma/prisma.service';
import { RepaymentPolicy } from '../pricing/repayment-policy';

describe('ContractsService', () => {
  const create = jest.fn();
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const update = jest.fn();
  const deleteContract = jest.fn();
  const deleteManyOptions = jest.fn();
  const quote = jest.fn();

  const quotes = [
    {
      termMonths: 12 as const,
      monthlyPaymentCents: 8630,
      totalPayableCents: 103_560,
      totalInterestCents: 3560,
    },
    {
      termMonths: 24 as const,
      monthlyPaymentCents: 4455,
      totalPayableCents: 106_920,
      totalInterestCents: 6920,
    },
    {
      termMonths: 36 as const,
      monthlyPaymentCents: 3065,
      totalPayableCents: 110_340,
      totalInterestCents: 10_340,
    },
  ];

  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const updatedAt = new Date('2026-01-02T00:00:00.000Z');

  const contractRow = {
    id: 'contract-1',
    principalCents: 100_000,
    annualRate: 0.065,
    createdAt,
    updatedAt,
    options: quotes.map((quoteRow) => ({
      termMonths: quoteRow.termMonths,
      monthlyPaymentCents: quoteRow.monthlyPaymentCents,
      totalPayableCents: quoteRow.totalPayableCents,
      totalInterestCents: quoteRow.totalInterestCents,
    })),
  };

  const prisma = {
    contract: {
      create,
      findMany,
      findFirst,
      update,
      delete: deleteContract,
    },
    contractOption: {
      deleteMany: deleteManyOptions,
    },
    $transaction: jest.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
      fn(prisma),
    ),
  } as unknown as PrismaService;

  const repaymentPolicy = {
    annualRate: 0.065,
    quote,
  } as unknown as RepaymentPolicy;

  const service = new ContractsService(prisma, repaymentPolicy);

  beforeEach(() => {
    jest.clearAllMocks();
    quote.mockReturnValue(quotes);
    create.mockResolvedValue(contractRow);
    findMany.mockResolvedValue([contractRow]);
    findFirst.mockResolvedValue(contractRow);
    update.mockResolvedValue({
      ...contractRow,
      principalCents: 150_000,
    });
    deleteContract.mockResolvedValue(contractRow);
    deleteManyOptions.mockResolvedValue({ count: 3 });
  });

  it('creates a contract with quoted option snapshots', async () => {
    const result = await service.create('user-1', { principalCents: 100_000 });

    expect(quote).toHaveBeenCalledWith(100_000);
    expect(create).toHaveBeenCalledTimes(1);
    const [[createArg]] = create.mock.calls as [
      [
        {
          data: {
            userId: string;
            principalCents: number;
            annualRate: number;
            options: { create: typeof quotes };
          };
        },
      ],
    ];
    expect(createArg.data).toEqual({
      userId: 'user-1',
      principalCents: 100_000,
      annualRate: 0.065,
      options: {
        create: quotes.map((q) => ({
          termMonths: q.termMonths,
          monthlyPaymentCents: q.monthlyPaymentCents,
          totalPayableCents: q.totalPayableCents,
          totalInterestCents: q.totalInterestCents,
        })),
      },
    });
    expect(result).toEqual(contractRow);
  });

  it('lists contracts for the owner only', async () => {
    await expect(service.findAll('user-1')).resolves.toEqual([contractRow]);
    const [[listArg]] = findMany.mock.calls as [
      [{ where: { userId: string } }],
    ];
    expect(listArg.where).toEqual({ userId: 'user-1' });
  });

  it('returns one owned contract', async () => {
    await expect(service.findOne('user-1', 'contract-1')).resolves.toEqual(
      contractRow,
    );
  });

  it('maps missing or foreign contracts to NotFoundException', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.findOne('user-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('recalculates and replaces snapshots on update', async () => {
    const result = await service.update('user-1', 'contract-1', {
      principalCents: 150_000,
    });

    expect(quote).toHaveBeenCalledWith(150_000);
    expect(deleteManyOptions).toHaveBeenCalledWith({
      where: { contractId: 'contract-1' },
    });
    const [[updateArg]] = update.mock.calls as [
      [
        {
          where: { id: string };
          data: { principalCents: number; annualRate: number };
        },
      ],
    ];
    expect(updateArg.where).toEqual({ id: 'contract-1' });
    expect(updateArg.data.principalCents).toBe(150_000);
    expect(updateArg.data.annualRate).toBe(0.065);
    expect(result.principalCents).toBe(150_000);
  });

  it('rejects update when the contract is not owned', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      service.update('user-1', 'foreign', { principalCents: 150_000 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it('deletes an owned contract', async () => {
    await service.remove('user-1', 'contract-1');
    expect(deleteContract).toHaveBeenCalledWith({
      where: { id: 'contract-1' },
    });
  });

  it('rejects delete when the contract is not owned', async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.remove('user-1', 'foreign')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(deleteContract).not.toHaveBeenCalled();
  });
});
