import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  const createUser = jest.fn();
  const findUniqueUser = jest.fn();
  const sign = jest.fn();

  const prisma = {
    user: {
      create: createUser,
      findUnique: findUniqueUser,
    },
  } as unknown as PrismaService;

  const jwtService = { sign } as unknown as JwtService;
  const service = new AuthService(prisma, jwtService);
  const hash = bcrypt.hash as jest.Mock;
  const compare = bcrypt.compare as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    hash.mockResolvedValue('hashed');
    compare.mockResolvedValue(true);
    sign.mockReturnValue('signed.jwt.token');
  });

  describe('register', () => {
    it('creates a user and returns a JWT response', async () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      createUser.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        createdAt,
      });

      const result = await service.register({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(hash).toHaveBeenCalledWith('password123', 10);
      expect(createUser).toHaveBeenCalledWith({
        data: { email: 'user@example.com', passwordHash: 'hashed' },
        select: { id: true, email: true, createdAt: true },
      });
      expect(sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'user@example.com',
      });
      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        tokenType: 'Bearer',
        user: {
          id: 'user-1',
          email: 'user@example.com',
          createdAt,
        },
      });
    });

    it('maps unique email conflicts to ConflictException', async () => {
      createUser.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.register({
          email: 'user@example.com',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows unexpected Prisma errors', async () => {
      const boom = new Error('db down');
      createUser.mockRejectedValue(boom);

      await expect(
        service.register({
          email: 'user@example.com',
          password: 'password123',
        }),
      ).rejects.toBe(boom);
    });

    it('rethrows known Prisma errors that are not unique conflicts', async () => {
      const boom = new Prisma.PrismaClientKnownRequestError('FK', {
        code: 'P2003',
        clientVersion: 'test',
      });
      createUser.mockRejectedValue(boom);

      await expect(
        service.register({
          email: 'user@example.com',
          password: 'password123',
        }),
      ).rejects.toBe(boom);
    });
  });

  describe('login', () => {
    it('returns a JWT when credentials match', async () => {
      const createdAt = new Date('2026-01-02T00:00:00.000Z');
      findUniqueUser.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hashed',
        createdAt,
      });

      const result = await service.login({
        email: 'user@example.com',
        password: 'password123',
      });

      expect(compare).toHaveBeenCalledWith('password123', 'hashed');
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user.email).toBe('user@example.com');
    });

    it('rejects an unknown email with a generic message', async () => {
      findUniqueUser.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'missing@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login({
          email: 'missing@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('rejects a wrong password with the same generic message', async () => {
      findUniqueUser.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        passwordHash: 'hashed',
        createdAt: new Date(),
      });
      compare.mockResolvedValue(false);

      await expect(
        service.login({
          email: 'user@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
