import { UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

const FAKE_JWT_SECRET = 'unit-test-jwt-secret-32chars-min';

describe('JwtStrategy', () => {
  const findUniqueUser = jest.fn();
  const prisma = {
    user: {
      findUnique: findUniqueUser,
    },
  } as unknown as PrismaService;

  const appConfig = {
    jwtSecret: FAKE_JWT_SECRET,
  } as AppConfigService;

  const strategy = new JwtStrategy(appConfig, prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the authenticated user for a valid payload', async () => {
    findUniqueUser.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
    });

    await expect(
      strategy.validate({ sub: 'user-1', email: 'user@example.com' }),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'user@example.com',
    });
  });

  it('rejects a payload whose user no longer exists', async () => {
    findUniqueUser.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'gone', email: 'gone@example.com' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
