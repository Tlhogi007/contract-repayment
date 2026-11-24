import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RepaymentPolicy } from '../pricing/repayment-policy';
import type { CreateContractDto } from './dto/create-contract.dto';
import type { ContractResponseDto } from './dto/contract-response.dto';
import type { UpdateContractDto } from './dto/update-contract.dto';

const optionSelect = {
  termMonths: true,
  monthlyPaymentCents: true,
  totalPayableCents: true,
  totalInterestCents: true,
} as const;

const contractSelect = {
  id: true,
  principalCents: true,
  annualRate: true,
  createdAt: true,
  updatedAt: true,
  options: {
    select: optionSelect,
    orderBy: { termMonths: 'asc' as const },
  },
};

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repaymentPolicy: RepaymentPolicy,
  ) {}

  async create(
    userId: string,
    dto: CreateContractDto,
  ): Promise<ContractResponseDto> {
    const quotes = this.repaymentPolicy.quote(dto.principalCents);

    const contract = await this.prisma.contract.create({
      data: {
        userId,
        principalCents: dto.principalCents,
        annualRate: this.repaymentPolicy.annualRate,
        options: {
          create: quotes.map((quote) => ({
            termMonths: quote.termMonths,
            monthlyPaymentCents: quote.monthlyPaymentCents,
            totalPayableCents: quote.totalPayableCents,
            totalInterestCents: quote.totalInterestCents,
          })),
        },
      },
      select: contractSelect,
    });

    return contract;
  }

  async findAll(userId: string): Promise<ContractResponseDto[]> {
    return this.prisma.contract.findMany({
      where: { userId },
      select: contractSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<ContractResponseDto> {
    return this.findOwnedOrThrow(userId, id);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateContractDto,
  ): Promise<ContractResponseDto> {
    await this.findOwnedOrThrow(userId, id);

    const quotes = this.repaymentPolicy.quote(dto.principalCents);

    return this.prisma.$transaction(async (tx) => {
      await tx.contractOption.deleteMany({ where: { contractId: id } });

      return tx.contract.update({
        where: { id },
        data: {
          principalCents: dto.principalCents,
          annualRate: this.repaymentPolicy.annualRate,
          options: {
            create: quotes.map((quote) => ({
              termMonths: quote.termMonths,
              monthlyPaymentCents: quote.monthlyPaymentCents,
              totalPayableCents: quote.totalPayableCents,
              totalInterestCents: quote.totalInterestCents,
            })),
          },
        },
        select: contractSelect,
      });
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.contract.delete({ where: { id } });
  }

  private async findOwnedOrThrow(
    userId: string,
    id: string,
  ): Promise<ContractResponseDto> {
    const contract = await this.prisma.contract.findFirst({
      where: { id, userId },
      select: contractSelect,
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }
}
