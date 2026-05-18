import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import * as request from 'supertest';
import { HealthModule } from '../src/modules/health/health.module';

describe('Health endpoint', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return health status', async () => {
    const server = app.getHttpServer() as Server;

    await request(server)
      .get('/api/health')
      .expect(200)
      .expect({
        status: 'ok',
        service: 'flo-vis-backend'
      });
  });
});
