import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { ApiErrorResponse } from './../src/common/http/api-error-response';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/bootstrap';
import {
  API_SERVICE_NAME,
  HealthResponseDto,
} from './../src/health/dto/health-response.dto';

describe('Platform (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health returns liveness details', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect('x-request-id', /.+/)
      .expect((res) => {
        const body = res.body as HealthResponseDto;
        expect(body.status).toBe('ok');
        expect(body.service).toBe(API_SERVICE_NAME);
        expect(typeof body.version).toBe('string');
        expect(['development', 'test', 'production']).toContain(
          body.environment,
        );
        expect(typeof body.uptimeSeconds).toBe('number');
      });
  });

  it('echoes a safe client request id', () => {
    return request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'trace-123')
      .expect(200)
      .expect('x-request-id', 'trace-123');
  });

  it('replaces a request id outside the safe pattern', () => {
    return request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'bad/id')
      .expect(200)
      .expect((res) => {
        expect(typeof res.headers['x-request-id']).toBe('string');
        expect(res.headers['x-request-id']).not.toBe('bad/id');
      });
  });

  it('GET /api/docs-json exposes the OpenAPI document', () => {
    return request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          info: { title: string };
          paths: Record<string, unknown>;
        };
        expect(body.info.title).toBe('Contract Repayment API');
        expect(body.paths).toHaveProperty('/health');
      });
  });

  it('GET /missing returns a stable error body', () => {
    return request(app.getHttpServer())
      .get('/missing')
      .expect(404)
      .expect((res) => {
        const body = res.body as ApiErrorResponse;
        expect(body.statusCode).toBe(404);
        expect(body.error).toBe('Not Found');
        expect(body.path).toBe('/missing');
        expect(typeof body.requestId).toBe('string');
        expect(typeof body.message).toBe('string');
      });
  });
});
