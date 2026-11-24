import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import {
  CurrentUser,
  extractAuthenticatedUser,
} from './current-user.decorator';

describe('CurrentUser decorator', () => {
  it('extractAuthenticatedUser returns the request user', () => {
    const user = { id: 'user-1', email: 'user@example.com' };
    const request = { user } as Request;

    expect(extractAuthenticatedUser(request)).toEqual(user);
  });

  it('resolves the authenticated user through Nest param metadata', () => {
    class Probe {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      handler(@CurrentUser() _user: unknown): void {}
    }

    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      Probe,
      'handler',
    ) as Record<
      string,
      { factory: (data: unknown, ctx: ExecutionContext) => unknown }
    >;

    const factory = metadata[Object.keys(metadata)[0]].factory;
    const user = { id: 'user-1', email: 'user@example.com' };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;

    expect(factory(undefined, context)).toEqual(user);
  });
});
