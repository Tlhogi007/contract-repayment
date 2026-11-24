import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../config/app-config.service';
import { NodeEnv } from '../config/env.validation';
import { API_SERVICE_NAME } from './dto/health-response.dto';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: AppConfigService,
          useValue: {
            version: '0.1.0',
            nodeEnv: 'test' satisfies NodeEnv,
          } satisfies Pick<AppConfigService, 'version' | 'nodeEnv'>,
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns a liveness payload without credentials or tokens', () => {
    const result = controller.check();

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
});
