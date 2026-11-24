import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiErrorResponse } from '../src/common/http/api-error-response';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { AuthResponseDto } from '../src/auth/dto/auth-response.dto';
import { ContractResponseDto } from '../src/contracts/dto/contract-response.dto';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Contracts (e2e)', () => {
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

  async function register(
    email: string,
  ): Promise<{ token: string; userId: string }> {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);

    const body = res.body as AuthResponseDto;
    return { token: body.accessToken, userId: body.user.id };
  }

  it('rejects unauthenticated access with 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/contracts')
      .expect(401);

    expect((res.body as ApiErrorResponse).statusCode).toBe(401);
  });

  it('creates a contract with 12/24/36 option snapshots', async () => {
    const { token } = await register('owner@example.com');

    const res = await request(app.getHttpServer())
      .post('/contracts')
      .set('Authorization', `Bearer ${token}`)
      .send({ principalCents: 100_000 })
      .expect(201)
      .expect('x-request-id', /.+/);

    const body = res.body as ContractResponseDto;
    expect(body.principalCents).toBe(100_000);
    expect(body.annualRate).toBe(0.065);
    expect(body.options).toEqual([
      {
        termMonths: 12,
        monthlyPaymentCents: 8630,
        totalPayableCents: 103_560,
        totalInterestCents: 3560,
      },
      {
        termMonths: 24,
        monthlyPaymentCents: 4455,
        totalPayableCents: 106_920,
        totalInterestCents: 6920,
      },
      {
        termMonths: 36,
        monthlyPaymentCents: 3065,
        totalPayableCents: 110_340,
        totalInterestCents: 10_340,
      },
    ]);
  });

  it('lists, gets, updates, and deletes own contracts', async () => {
    const { token } = await register('journey@example.com');

    const createRes = await request(app.getHttpServer())
      .post('/contracts')
      .set('Authorization', `Bearer ${token}`)
      .send({ principalCents: 100_000 })
      .expect(201);

    const created = createRes.body as ContractResponseDto;

    const listRes = await request(app.getHttpServer())
      .get('/contracts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body).toEqual([
      expect.objectContaining({ id: created.id, principalCents: 100_000 }),
    ]);

    const getRes = await request(app.getHttpServer())
      .get(`/contracts/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect((getRes.body as ContractResponseDto).id).toBe(created.id);

    const patchRes = await request(app.getHttpServer())
      .patch(`/contracts/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ principalCents: 1_000_000 })
      .expect(200);

    const updated = patchRes.body as ContractResponseDto;
    expect(updated.principalCents).toBe(1_000_000);
    expect(updated.options[0]).toEqual({
      termMonths: 12,
      monthlyPaymentCents: 86_296,
      totalPayableCents: 1_035_552,
      totalInterestCents: 35_552,
    });

    await request(app.getHttpServer())
      .delete(`/contracts/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/contracts/${created.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('hides other users contracts with 404 (not 403)', async () => {
    const owner = await register('owner-idor@example.com');
    const stranger = await register('stranger@example.com');

    const createRes = await request(app.getHttpServer())
      .post('/contracts')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ principalCents: 100_000 })
      .expect(201);

    const contractId = (createRes.body as ContractResponseDto).id;

    const getRes = await request(app.getHttpServer())
      .get(`/contracts/${contractId}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .expect(404);

    expect((getRes.body as ApiErrorResponse).statusCode).toBe(404);

    await request(app.getHttpServer())
      .patch(`/contracts/${contractId}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ principalCents: 200_000 })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/contracts/${contractId}`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/contracts/${contractId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
  });

  it('rejects non-integer principal with 400', async () => {
    const { token } = await register('validate@example.com');

    const res = await request(app.getHttpServer())
      .post('/contracts')
      .set('Authorization', `Bearer ${token}`)
      .send({ principalCents: 100.5 })
      .expect(400);

    expect((res.body as ApiErrorResponse).statusCode).toBe(400);
  });

  it('returns an empty list for a new user', async () => {
    const { token } = await register('empty-list@example.com');

    const res = await request(app.getHttpServer())
      .get('/contracts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual([]);
  });

  it('rejects principal above the money ceiling with 400', async () => {
    const { token } = await register('too-big@example.com');

    const res = await request(app.getHttpServer())
      .post('/contracts')
      .set('Authorization', `Bearer ${token}`)
      .send({ principalCents: 1_000_000_001 })
      .expect(400);

    expect((res.body as ApiErrorResponse).statusCode).toBe(400);
  });

  it('keeps a consistent snapshot after concurrent patches', async () => {
    const { token } = await register('race@example.com');

    const createRes = await request(app.getHttpServer())
      .post('/contracts')
      .set('Authorization', `Bearer ${token}`)
      .send({ principalCents: 100_000 })
      .expect(201);

    const contractId = (createRes.body as ContractResponseDto).id;

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/contracts/${contractId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ principalCents: 100_000 }),
      request(app.getHttpServer())
        .patch(`/contracts/${contractId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ principalCents: 200_000 }),
    ]);

    expect([first.status, second.status]).toEqual([200, 200]);

    const getRes = await request(app.getHttpServer())
      .get(`/contracts/${contractId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = getRes.body as ContractResponseDto;
    expect([100_000, 200_000]).toContain(body.principalCents);
    expect(body.options).toHaveLength(3);
    expect(
      body.options.every(
        (option) =>
          option.totalPayableCents ===
          option.monthlyPaymentCents * option.termMonths,
      ),
    ).toBe(true);
  });

  it('cascades contract rows when the owning user is deleted', async () => {
    const { token, userId } = await register('cascade@example.com');

    const createRes = await request(app.getHttpServer())
      .post('/contracts')
      .set('Authorization', `Bearer ${token}`)
      .send({ principalCents: 100_000 })
      .expect(201);

    const contractId = (createRes.body as ContractResponseDto).id;

    await prisma.user.delete({ where: { id: userId } });

    expect(await prisma.contract.count({ where: { id: contractId } })).toBe(0);
    expect(await prisma.contractOption.count({ where: { contractId } })).toBe(
      0,
    );
  });

  it('OpenAPI documents contract routes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);

    const body = res.body as { paths: Record<string, unknown> };
    expect(body.paths).toHaveProperty('/contracts');
    expect(body.paths).toHaveProperty('/contracts/{id}');
  });
});
