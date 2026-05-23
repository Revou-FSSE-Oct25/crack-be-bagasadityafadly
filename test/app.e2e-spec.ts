import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

// ─────────────────────────────────────────────────────────────────────────────
// Integration tests — spin up the full NestJS app and make real HTTP requests.
// Uses the same DATABASE_URL as development (set in .env).
// ─────────────────────────────────────────────────────────────────────────────

describe('Gymora API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same middleware as main.ts so responses match production format
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Health check ────────────────────────────────────────────────────────────

  describe('GET /api/v1/health', () => {
    it('returns 200 with status ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.status).toBe('ok');
        });
    });
  });

  // ── Auth — Register ─────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    const testEmail = `e2e-${Date.now()}@gymora-test.com`;

    it('returns 201 with access_token and user on valid data', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'E2E Tester', email: testEmail, password: 'Test1234!' })
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.access_token).toBeDefined();
          expect(res.body.data.user.email).toBe(testEmail);
          expect(res.body.data.user).not.toHaveProperty('password');
        });
    });

    it('returns 409 when registering with the same email again', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Duplicate', email: testEmail, password: 'Test1234!' })
        .expect(409);
    });

    it('returns 400 when password is too weak', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Weak', email: `weak-${Date.now()}@test.com`, password: 'abc' })
        .expect(400);
    });

    it('returns 400 when email is missing', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'No Email', password: 'Test1234!' })
        .expect(400);
    });
  });

  // ── Auth — Login ────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    const existingEmail = `login-e2e-${Date.now()}@gymora-test.com`;

    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Login Tester', email: existingEmail, password: 'Test1234!' });
    });

    it('returns 200 with access_token on correct credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: existingEmail, password: 'Test1234!' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.access_token).toBeDefined();
        });
    });

    it('returns 401 on wrong password (generic message prevents enumeration)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: existingEmail, password: 'WrongPassword!' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid credentials');
        });
    });

    it('returns 401 on non-existent email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@gymora-test.com', password: 'Test1234!' })
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Invalid credentials');
        });
    });
  });

  // ── Leaderboard — public endpoint ──────────────────────────────────────────

  describe('GET /api/v1/xp/leaderboard', () => {
    it('returns 200 with an array', () => {
      return request(app.getHttpServer())
        .get('/api/v1/xp/leaderboard')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('respects limit query parameter', () => {
      return request(app.getHttpServer())
        .get('/api/v1/xp/leaderboard?limit=2')
        .expect(200)
        .expect((res) => {
          expect(res.body.data.length).toBeLessThanOrEqual(2);
        });
    });

    it('each entry has rank, name, xpTotal fields', () => {
      return request(app.getHttpServer())
        .get('/api/v1/xp/leaderboard?limit=1')
        .expect(200)
        .expect((res) => {
          if (res.body.data.length > 0) {
            const entry = res.body.data[0];
            expect(entry).toHaveProperty('rank');
            expect(entry).toHaveProperty('name');
            expect(entry).toHaveProperty('xpTotal');
          }
        });
    });
  });

  // ── Protected route — requires JWT ─────────────────────────────────────────

  describe('GET /api/v1/xp/my', () => {
    it('returns 401 without a token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/xp/my')
        .expect(401);
    });

    it('returns 200 with a valid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Token Tester',
          email: `token-${Date.now()}@gymora-test.com`,
          password: 'Test1234!',
        });

      const token = res.body.data.access_token;

      return request(app.getHttpServer())
        .get('/api/v1/xp/my')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((resXp) => {
          expect(resXp.body.data.xpTotal).toBeDefined();
          expect(resXp.body.data.level).toBeDefined();
        });
    });
  });
});
