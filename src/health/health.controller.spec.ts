import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../config/app-config.service';
import { NodeEnv } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { API_SERVICE_NAME } from './dto/health-response.dto';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let queryRaw: jest.Mock;

  beforeEach(async () => {
    queryRaw = jest.fn().mockResolvedValue([{ '1': 1 }]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: AppConfigService,
          useValue: {
            version: '0.1.0',
            nodeEnv: 'test' satisfies NodeEnv,
          } satisfies Pick<AppConfigService, 'version' | 'nodeEnv'>,
        },
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: queryRaw,
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns a liveness payload without credentials or tokens', () => {
    const result = controller.live();

    const { uptimeSeconds, ...liveness } = result;

    expect(liveness).toEqual({
      status: 'ok',
      service: API_SERVICE_NAME,
      version: '0.1.0',
      environment: 'test',
    });
    expect(uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(result)).not.toMatch(/secret|password|token/i);
  });

  it('returns ready when the database answers', async () => {
    const result = await controller.ready();

    expect(result.status).toBe('ok');
    expect(result.checks).toEqual({ database: 'up' });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('maps database failure to ServiceUnavailableException', async () => {
    queryRaw.mockRejectedValue(new Error('db down'));

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
