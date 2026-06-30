import request from 'supertest';
import { createTestApp, closeTestApp, getApp, loginAs, getPrisma } from './test-setup';

describe('Tenancy Module (e2e)', () => {
  beforeAll(async () => {
    await createTestApp();
    // Clean up leftover test tenant from previous runs
    const prisma = getPrisma();
    try {
      // Remove stale user from tenant_default (in case SET search_path missed)
      await prisma.$executeRawUnsafe(`SET search_path TO "tenant_default", public`);
      await prisma.$executeRawUnsafe(`DELETE FROM users WHERE email = 'admin@test-firm.com'`);
    } catch { /* ignore */ }
    try {
      await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS "tenant_test-firm" CASCADE');
      await prisma.tenant.deleteMany({ where: { id: 'test-firm' } });
    } catch { /* ignore */ }
  }, 30000);

  afterAll(async () => {
    // Clean up test tenant
    const prisma = getPrisma();
    try {
      await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS "tenant_test-firm" CASCADE');
      await prisma.tenant.deleteMany({ where: { id: 'test-firm' } });
    } catch {
      // ignore cleanup errors
    }
    await closeTestApp();
  });

  // ── Provision Tenant ───────────────────────────────────────
  describe('POST /api/tenants/provision', () => {
    it('should provision a new tenant with schema and admin user', async () => {
      const { accessToken } = await loginAs('admin@albasti.dev', 'Admin123!');

      const res = await request(getApp().getHttpServer())
        .post('/api/tenants/provision')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          id: 'test-firm',
          name: 'Test Law Firm',
          slug: 'test-firm',
          adminEmail: 'admin@test-firm.com',
          adminPassword: 'TestFirm123!',
        })
        .expect(201);

      expect(res.body.tenant.id).toBe('test-firm');
      expect(res.body.tenant.name).toBe('Test Law Firm');
      expect(res.body.message).toContain('provisioned successfully');
    });

    it('should reject duplicate tenant id', async () => {
      const { accessToken } = await loginAs('admin@albasti.dev', 'Admin123!');

      return request(getApp().getHttpServer())
        .post('/api/tenants/provision')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          id: 'test-firm',
          name: 'Duplicate Firm',
          slug: 'duplicate-firm',
          adminEmail: 'admin@dup.com',
          adminPassword: 'Dup12345!',
        })
        .expect(409);
    });

    it('should reject unauthenticated provision', () => {
      return request(getApp().getHttpServer())
        .post('/api/tenants/provision')
        .send({
          id: 'sneaky',
          name: 'Sneaky Firm',
          slug: 'sneaky',
          adminEmail: 'a@b.com',
          adminPassword: 'Sneak123!',
        })
        .expect(401);
    });
  });

  // ── List Tenants ───────────────────────────────────────────
  describe('GET /api/tenants', () => {
    it('should list all tenants for admin', async () => {
      const { accessToken } = await loginAs('admin@albasti.dev', 'Admin123!');

      const res = await request(getApp().getHttpServer())
        .get('/api/tenants')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((t: any) => t.id);
      expect(ids).toContain('default');
      expect(ids).toContain('test-firm');
    });
  });

  // ── Cross-tenant login ─────────────────────────────────────
  describe('Cross-tenant isolation', () => {
    it('should allow new tenant admin to log in', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@test-firm.com', password: 'TestFirm123!' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();

      // Decode JWT to verify tenantId
      const payload = JSON.parse(
        Buffer.from(res.body.accessToken.split('.')[1], 'base64').toString(),
      );
      expect(payload.tenantId).toBe('test-firm');
      expect(payload.role).toBe('admin');
    });

    it('default tenant admin JWT should have tenantId=default', async () => {
      const { accessToken } = await loginAs('admin@albasti.dev', 'Admin123!');

      const payload = JSON.parse(
        Buffer.from(accessToken.split('.')[1], 'base64').toString(),
      );
      expect(payload.tenantId).toBe('default');
    });
  });
});
