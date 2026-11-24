import * as classValidator from 'class-validator';
import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('applies defaults and keeps unrelated variables', () => {
    const result = validateEnv({ JWT_SECRET: 'present-for-later' });

    expect(result.PORT).toBe(3000);
    expect(result.NODE_ENV).toBe('development');
    expect(result.JWT_SECRET).toBe('present-for-later');
  });

  it('coerces a numeric port string', () => {
    const result = validateEnv({ PORT: '4000', NODE_ENV: 'production' });

    expect(result.PORT).toBe(4000);
    expect(result.NODE_ENV).toBe('production');
  });

  it('rejects an invalid port without echoing the value or other secrets', () => {
    const secret = 'super-secret-value';

    expect(() => validateEnv({ PORT: 'nope', JWT_SECRET: secret })).toThrow(
      /PORT/,
    );

    try {
      validateEnv({ PORT: 'nope', JWT_SECRET: secret });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain(secret);
      expect(message).not.toContain('nope');
    }
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('still fails when a validation error has no constraints map', () => {
    jest.spyOn(classValidator, 'validateSync').mockReturnValueOnce([
      {
        property: 'PORT',
        constraints: undefined,
      },
    ] as classValidator.ValidationError[]);

    expect(() => validateEnv({ PORT: 3000 })).toThrow(
      /Invalid environment configuration/,
    );

    jest.restoreAllMocks();
  });
});
