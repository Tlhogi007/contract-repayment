import * as classValidator from 'class-validator';
import { DEFAULT_JWT_EXPIRES_IN, validateEnv } from './env.validation';

const FAKE_JWT_SECRET = 'unit-test-jwt-secret-32chars-min';

const requiredEnvFixture = {
  DATABASE_URL: 'file:./dev.db',
  JWT_SECRET: FAKE_JWT_SECRET,
};

describe('validateEnv', () => {
  it('applies defaults and keeps unrelated variables', () => {
    const result = validateEnv({
      ...requiredEnvFixture,
      EXTRA: 'kept',
    });

    expect(result.PORT).toBe(3000);
    expect(result.NODE_ENV).toBe('development');
    expect(result.DATABASE_URL).toBe(requiredEnvFixture.DATABASE_URL);
    expect(result.JWT_SECRET).toBe(FAKE_JWT_SECRET);
    expect(result.JWT_EXPIRES_IN).toBe(DEFAULT_JWT_EXPIRES_IN);
    expect(result.EXTRA).toBe('kept');
  });

  it('coerces a numeric port string', () => {
    const result = validateEnv({
      ...requiredEnvFixture,
      PORT: '4000',
      NODE_ENV: 'production',
      JWT_EXPIRES_IN: '2h',
    });

    expect(result.PORT).toBe(4000);
    expect(result.NODE_ENV).toBe('production');
    expect(result.JWT_EXPIRES_IN).toBe('2h');
  });

  it('rejects an invalid port without putting env values in the error message', () => {
    expect(() =>
      validateEnv({
        ...requiredEnvFixture,
        PORT: 'nope',
      }),
    ).toThrow(/PORT/);

    try {
      validateEnv({
        ...requiredEnvFixture,
        PORT: 'nope',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain(FAKE_JWT_SECRET);
      expect(message).not.toContain('nope');
    }
  });

  it('rejects a short JWT_SECRET', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: requiredEnvFixture.DATABASE_URL,
        JWT_SECRET: 'too-short',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() =>
      validateEnv({
        JWT_SECRET: FAKE_JWT_SECRET,
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects an empty DATABASE_URL', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: '',
        JWT_SECRET: FAKE_JWT_SECRET,
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects an empty JWT_EXPIRES_IN when provided', () => {
    expect(() =>
      validateEnv({
        ...requiredEnvFixture,
        JWT_EXPIRES_IN: '',
      }),
    ).toThrow(/JWT_EXPIRES_IN/);
  });

  it('rejects an overly long JWT_EXPIRES_IN', () => {
    expect(() =>
      validateEnv({
        ...requiredEnvFixture,
        JWT_EXPIRES_IN: 'x'.repeat(33),
      }),
    ).toThrow(/JWT_EXPIRES_IN/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() =>
      validateEnv({
        ...requiredEnvFixture,
        NODE_ENV: 'staging',
      }),
    ).toThrow(/NODE_ENV/);
  });

  it('still fails when a validation error has no constraints map', () => {
    jest.spyOn(classValidator, 'validateSync').mockReturnValueOnce([
      {
        property: 'PORT',
        constraints: undefined,
      },
    ] as classValidator.ValidationError[]);

    expect(() => validateEnv({ ...requiredEnvFixture, PORT: 3000 })).toThrow(
      /Invalid environment configuration/,
    );

    jest.restoreAllMocks();
  });
});
