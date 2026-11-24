import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';

describe('AuthController', () => {
  const authResponse: AuthResponseDto = {
    accessToken: 'token',
    tokenType: 'Bearer',
    user: {
      id: 'user-1',
      email: 'user@example.com',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  };

  const register = jest.fn();
  const login = jest.fn();
  const authService = { register, login } as unknown as AuthService;
  const controller = new AuthController(authService);

  beforeEach(() => {
    jest.clearAllMocks();
    register.mockResolvedValue(authResponse);
    login.mockResolvedValue(authResponse);
  });

  it('delegates register to AuthService', async () => {
    const dto = { email: 'user@example.com', password: 'password123' };

    await expect(controller.register(dto)).resolves.toEqual(authResponse);
    expect(register).toHaveBeenCalledWith(dto);
  });

  it('delegates login to AuthService', async () => {
    const dto = { email: 'user@example.com', password: 'password123' };

    await expect(controller.login(dto)).resolves.toEqual(authResponse);
    expect(login).toHaveBeenCalledWith(dto);
  });

  it('returns the authenticated user for /me', () => {
    const user = { id: 'user-1', email: 'user@example.com' };

    expect(controller.me(user)).toEqual(user);
  });
});
