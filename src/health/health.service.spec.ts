import { ServiceUnavailableException } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const appConfig = {
    version: '0.1.0',
    nodeEnv: 'test',
  } as unknown as AppConfigService;

  it('live returns process facts', () => {
    const queryRaw = jest.fn();
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
    const service = new HealthService(appConfig, prisma);

    expect(service.live().status).toBe('ok');
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('ready fails closed when Prisma throws', async () => {
    const queryRaw = jest.fn().mockRejectedValue(new Error('boom'));
    const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
    const service = new HealthService(appConfig, prisma);

    await expect(service.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
