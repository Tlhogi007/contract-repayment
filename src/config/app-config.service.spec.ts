import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { AppEnv } from './env.validation';

const FAKE_JWT_SECRET = 'unit-test-jwt-secret-32chars-min';

describe('AppConfigService', () => {
  it('returns typed getters from ConfigService', () => {
    const stubEnv: AppEnv = {
      PORT: 4000,
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: FAKE_JWT_SECRET,
      JWT_EXPIRES_IN: '1h',
    };

    const get = jest.fn((key: keyof AppEnv) => stubEnv[key]);
    const config = { get } as unknown as ConfigService<AppEnv, true>;

    const service = new AppConfigService(config);

    expect(service.port).toBe(4000);
    expect(service.nodeEnv).toBe('test');
    expect(service.jwtSecret).toBe(FAKE_JWT_SECRET);
    expect(service.jwtExpiresIn).toBe('1h');
    expect(service.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(get).toHaveBeenCalledWith('PORT', { infer: true });
    expect(get).toHaveBeenCalledWith('NODE_ENV', { infer: true });
    expect(get).toHaveBeenCalledWith('JWT_SECRET', { infer: true });
    expect(get).toHaveBeenCalledWith('JWT_EXPIRES_IN', { infer: true });
  });
});
