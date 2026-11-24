import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { AppEnv } from './env.validation';

describe('AppConfigService', () => {
  it('exposes port, environment, and package version', () => {
    const get = jest.fn((key: keyof AppEnv) => {
      if (key === 'PORT') {
        return 4000;
      }
      if (key === 'NODE_ENV') {
        return 'test';
      }
      return undefined;
    });
    const config = { get } as unknown as ConfigService<AppEnv, true>;

    const service = new AppConfigService(config);

    expect(service.port).toBe(4000);
    expect(service.nodeEnv).toBe('test');
    expect(service.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(get).toHaveBeenCalledWith('PORT', { infer: true });
    expect(get).toHaveBeenCalledWith('NODE_ENV', { infer: true });
  });
});
