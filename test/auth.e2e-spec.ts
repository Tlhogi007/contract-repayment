import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiErrorResponse } from '../src/common/http/api-error-response';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { AuthResponseDto } from '../src/auth/dto/auth-response.dto';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /auth/register creates an account and returns a JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'password123' })
      .expect(201)
      .expect('x-request-id', /.+/);

    const body = res.body as AuthResponseDto;
    expect(body.tokenType).toBe('Bearer');
    expect(typeof body.accessToken).toBe('string');
    expect(body.user.email).toBe('new@example.com');
    expect(body.user).not.toHaveProperty('passwordHash');
  });

  it('POST /auth/register rejects duplicate emails with 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'password123' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'Dup@Example.com', password: 'password123' })
      .expect(409);

    const body = res.body as ApiErrorResponse;
    expect(body.statusCode).toBe(409);
    expect(body.message).toMatch(/already registered/i);
  });

  it('POST /auth/login returns a JWT for valid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'login@example.com', password: 'password123' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'login@example.com', password: 'password123' })
      .expect(200);

    const body = res.body as AuthResponseDto;
    expect(body.accessToken).toBeTruthy();
    expect(body.user.email).toBe('login@example.com');
  });

  it('POST /auth/login rejects a wrong password with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'secure@example.com', password: 'password123' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'secure@example.com', password: 'wrong-password' })
      .expect(401);

    const body = res.body as ApiErrorResponse;
    expect(body.statusCode).toBe(401);
    expect(body.message).toBe('Invalid credentials');
  });

  it('POST /auth/register rejects an invalid body with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);

    const body = res.body as ApiErrorResponse;
    expect(body.statusCode).toBe(400);
  });

  it('GET /auth/me requires a Bearer token', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me').expect(401);

    const body = res.body as ApiErrorResponse;
    expect(body.statusCode).toBe(401);
  });

  it('GET /auth/me returns the authenticated user', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'me@example.com', password: 'password123' })
      .expect(201);

    const { accessToken } = registerRes.body as AuthResponseDto;

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as { id: string; email: string };
    expect(typeof body.id).toBe('string');
    expect(body.email).toBe('me@example.com');
  });

  it('GET /auth/me rejects a token whose user was deleted', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'gone@example.com', password: 'password123' })
      .expect(201);

    const { accessToken, user } = registerRes.body as AuthResponseDto;
    await prisma.user.delete({ where: { id: user.id } });

    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);

    const body = res.body as ApiErrorResponse;
    expect(body.statusCode).toBe(401);
  });

  it('OpenAPI documents auth routes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    const body = res.body as { paths: Record<string, unknown> };
    expect(body.paths).toHaveProperty('/auth/register');
    expect(body.paths).toHaveProperty('/auth/login');
    expect(body.paths).toHaveProperty('/auth/me');
  });
});
