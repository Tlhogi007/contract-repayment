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
      OTEL_SERVICE_NAME: 'contract-repayment-api',
    };

    const get = jest.fn((key: keyof AppEnv) => stubEnv[key]);
    const config = { get } as unknown as ConfigService<AppEnv, true>;

    const service = new AppConfigService(config);

    expect(service.port).toBe(4000);
    expect(service.nodeEnv).toBe('test');
    expect(service.jwtSecret).toBe(FAKE_JWT_SECRET);
    expect(service.jwtExpiresIn).toBe('1h');
    expect(service.otelServiceName).toBe('contract-repayment-api');
    expect(service.otlpEndpoint).toBeUndefined();
    expect(service.sentryDsn).toBeUndefined();
    expect(service.corsOrigins).toEqual([]);
    expect(service.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(get).toHaveBeenCalledWith('PORT', { infer: true });
    expect(get).toHaveBeenCalledWith('NODE_ENV', { infer: true });
    expect(get).toHaveBeenCalledWith('JWT_SECRET', { infer: true });
    expect(get).toHaveBeenCalledWith('JWT_EXPIRES_IN', { infer: true });
  });

  it('parses comma-separated CORS_ORIGINS', () => {
    const stubEnv: AppEnv = {
      PORT: 3000,
      NODE_ENV: 'development',
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: FAKE_JWT_SECRET,
      JWT_EXPIRES_IN: '1h',
      OTEL_SERVICE_NAME: 'contract-repayment-api',
      CORS_ORIGINS: ' http://localhost:5173, https://app.example.com ',
    };

    const get = jest.fn((key: keyof AppEnv) => stubEnv[key]);
    const config = { get } as unknown as ConfigService<AppEnv, true>;
    const service = new AppConfigService(config);

    expect(service.corsOrigins).toEqual([
      'http://localhost:5173',
      'https://app.example.com',
    ]);
  });
});
