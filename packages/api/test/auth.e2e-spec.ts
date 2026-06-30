import request from 'supertest';
import { createTestApp, closeTestApp, getApp, loginAs, getPrisma } from './test-setup';

describe('Auth Module (e2e)', () => {
  beforeAll(async () => {
    await createTestApp();
    // Clean up leftover test users from previous runs
    const prisma = getPrisma();
    try {
      await prisma.user.deleteMany({ where: { email: { in: ['lawyer1@albasti.dev', 'hacker@evil.com'] } } });
    } catch { /* ignore */ }
  }, 30000);

  afterAll(async () => {
    await closeTestApp();
  });

  // ── Health ─────────────────────────────────────────────────
  describe('GET /health', () => {
    it('should return 200 without authentication', () => {
      return request(getApp().getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  // ── Login ──────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    it('should return tokens for valid credentials', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@albasti.dev', password: 'Admin123!' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe('string');
    });

    it('should return 401 for wrong password', () => {
      return request(getApp().getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@albasti.dev', password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 401 for non-existent user', () => {
      return request(getApp().getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nobody@albasti.dev', password: 'Admin123!' })
        .expect(401);
    });
  });

  // ── Protected routes ───────────────────────────────────────
  describe('JWT Auth Guard', () => {
    it('should return 401 on protected route without token', () => {
      return request(getApp().getHttpServer())
        .get('/api/tenants')
        .expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(getApp().getHttpServer())
        .get('/api/tenants')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });

    it('should allow access with valid token', async () => {
      const { accessToken } = await loginAs('admin@albasti.dev', 'Admin123!');

      return request(getApp().getHttpServer())
        .get('/api/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  // ── Register (admin only) ─────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should allow admin to register a new user', async () => {
      const { accessToken } = await loginAs('admin@albasti.dev', 'Admin123!');

      const res = await request(getApp().getHttpServer())
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'lawyer1@albasti.dev',
          password: 'Lawyer123!',
          firstName: 'Test',
          lastName: 'Lawyer',
          role: 'lawyer',
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      const { accessToken } = await loginAs('admin@albasti.dev', 'Admin123!');

      return request(getApp().getHttpServer())
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: 'lawyer1@albasti.dev',
          password: 'Lawyer123!',
          firstName: 'Dup',
          lastName: 'User',
          role: 'lawyer',
        })
        .expect(409);
    });

    it('should reject unauthenticated register', () => {
      return request(getApp().getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'hacker@evil.com',
          password: 'Hacker123!',
          firstName: 'Bad',
          lastName: 'Actor',
          role: 'admin',
        })
        .expect(401);
    });
  });

  // ── Refresh ────────────────────────────────────────────────
  describe('POST /api/auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      const { refreshToken } = await loginAs('admin@albasti.dev', 'Admin123!');

      const res = await request(getApp().getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', () => {
      return request(getApp().getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);
    });
  });

  // ── Roles Guard ────────────────────────────────────────────
  describe('Roles Guard', () => {
    it('should allow admin to access admin-only endpoint', async () => {
      const { accessToken } = await loginAs('admin@albasti.dev', 'Admin123!');

      return request(getApp().getHttpServer())
        .get('/api/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject lawyer from admin-only endpoint', async () => {
      // First login as the lawyer we created above
      const { accessToken } = await loginAs('lawyer1@albasti.dev', 'Lawyer123!');

      return request(getApp().getHttpServer())
        .get('/api/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);
    });
  });
});
