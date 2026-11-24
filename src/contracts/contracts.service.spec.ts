import { ConflictException, NotFoundException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../prisma/prisma.service';
import { RepaymentPolicy } from '../pricing/repayment-policy';

describe('ContractsService', () => {
  const create = jest.fn();
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const update = jest.fn();
  const updateMany = jest.fn();
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
      updateMany,
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
    updateMany.mockResolvedValue({ count: 1 });
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

  it('lists a bounded page for the owner only', async () => {
    await expect(service.findAll('user-1')).resolves.toEqual({
      data: [contractRow],
      nextCursor: null,
    });
    const [[listArg]] = findMany.mock.calls as [
      [{ where: { userId: string }; take: number }],
    ];
    expect(listArg.where).toEqual({ userId: 'user-1' });
    expect(listArg.take).toBe(21);
  });

  it('returns nextCursor when more rows exist than the page size', async () => {
    const page = [
      { ...contractRow, id: 'c1' },
      { ...contractRow, id: 'c2' },
      { ...contractRow, id: 'c3' },
    ];
    findMany.mockResolvedValue(page);

    await expect(service.findAll('user-1', { limit: 2 })).resolves.toEqual({
      data: [page[0], page[1]],
      nextCursor: 'c2',
    });
  });

  it('applies cursor pagination and clamps oversized limits', async () => {
    findMany.mockResolvedValue([contractRow]);

    await service.findAll('user-1', { limit: 500, cursor: 'c-prev' });

    const [[listArg]] = findMany.mock.calls as [
      [
        {
          take: number;
          cursor: { id: string };
          skip: number;
        },
      ],
    ];
    expect(listArg.take).toBe(101);
    expect(listArg.cursor).toEqual({ id: 'c-prev' });
    expect(listArg.skip).toBe(1);
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
      expectedUpdatedAt: updatedAt.toISOString(),
    });

    expect(quote).toHaveBeenCalledWith(150_000);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'contract-1',
        userId: 'user-1',
        updatedAt,
      },
      data: {
        principalCents: 150_000,
        annualRate: 0.065,
      },
    });
    expect(deleteManyOptions).toHaveBeenCalledWith({
      where: { contractId: 'contract-1' },
    });
    const [[updateArg]] = update.mock.calls as [
      [{ where: { id: string }; data: { options: unknown } }],
    ];
    expect(updateArg.where).toEqual({ id: 'contract-1' });
    expect(result.principalCents).toBe(150_000);
  });

  it('rejects stale expectedUpdatedAt with ConflictException', async () => {
    await expect(
      service.update('user-1', 'contract-1', {
        principalCents: 150_000,
        expectedUpdatedAt: '2020-01-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('rejects update when the optimistic lock loses the race', async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.update('user-1', 'contract-1', {
        principalCents: 150_000,
        expectedUpdatedAt: updatedAt.toISOString(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(deleteManyOptions).not.toHaveBeenCalled();
  });

  it('rejects update when the contract is not owned', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      service.update('user-1', 'foreign', {
        principalCents: 150_000,
        expectedUpdatedAt: updatedAt.toISOString(),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(updateMany).not.toHaveBeenCalled();
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
