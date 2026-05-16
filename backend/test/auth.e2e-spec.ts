import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Hits a real Postgres + Redis. In CI we spin those up as service containers.
 * Locally: `docker compose up postgres redis` first.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a weak password on register', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'weak@example.com', password: 'short' })
      .expect(400);
  });

  it('registers, logs in, and refuses unauthenticated /accounts', async () => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = 'StrongPass1!';

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(login.body.accessToken).toBeDefined();

    await request(app.getHttpServer()).get('/api/v1/accounts').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/accounts')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
  });
});
