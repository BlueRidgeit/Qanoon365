import request from 'supertest';
import { createTestApp, closeTestApp, getApp, loginAs } from './test-setup';

describe('Dashboard Module (e2e)', () => {
  let adminToken: string;

  beforeAll(async () => {
    await createTestApp();
    const { accessToken } = await loginAs('admin@albasti.dev', 'Admin123!');
    adminToken = accessToken;
  }, 30000);

  afterAll(async () => {
    await closeTestApp();
  });

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  describe('GET /api/dashboard', () => {
    it('should return full overview with pipeline, conflicts, KYC', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/dashboard')
        .set(auth())
        .expect(200);

      // Pipeline section
      expect(res.body.pipeline).toBeDefined();
      expect(res.body.pipeline.stages).toBeDefined();
      expect(typeof res.body.pipeline.stages.inquiry).toBe('number');
      expect(typeof res.body.pipeline.totalActive).toBe('number');
      expect(typeof res.body.pipeline.totalWon).toBe('number');
      expect(typeof res.body.pipeline.totalEstimatedValue).toBe('number');

      // Conflicts section
      expect(res.body.conflicts).toBeDefined();
      expect(res.body.conflicts.resolutionStatuses).toBeDefined();
      expect(typeof res.body.conflicts.totalPending).toBe('number');

      // KYC section
      expect(res.body.kyc).toBeDefined();
      expect(res.body.kyc.clientStatuses).toBeDefined();
      expect(typeof res.body.kyc.totalClients).toBe('number');
      expect(typeof res.body.kyc.complianceRate).toBe('number');

      // Matters and activities
      expect(typeof res.body.activeMatters).toBe('number');
      expect(Array.isArray(res.body.recentActivities)).toBe(true);
    });
  });

  describe('GET /api/dashboard/pipeline', () => {
    it('should return pipeline summary by stage', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/dashboard/pipeline')
        .set(auth())
        .expect(200);

      expect(res.body.stages).toBeDefined();
      const expectedStages = ['inquiry', 'consultation', 'proposal', 'retainer', 'won', 'lost'];
      for (const stage of expectedStages) {
        expect(typeof res.body.stages[stage]).toBe('number');
      }
      expect(typeof res.body.totalActive).toBe('number');
    });
  });

  describe('GET /api/dashboard/conflicts', () => {
    it('should return conflict status summary', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/dashboard/conflicts')
        .set(auth())
        .expect(200);

      expect(res.body.resolutionStatuses).toBeDefined();
      expect(typeof res.body.totalPending).toBe('number');
      expect(typeof res.body.opportunitiesWithConflicts).toBe('number');
    });
  });

  describe('GET /api/dashboard/kyc', () => {
    it('should return KYC compliance summary', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/dashboard/kyc')
        .set(auth())
        .expect(200);

      expect(res.body.clientStatuses).toBeDefined();
      expect(typeof res.body.totalClients).toBe('number');
      expect(typeof res.body.verifiedCount).toBe('number');
      expect(typeof res.body.complianceRate).toBe('number');
      expect(typeof res.body.expiredCount).toBe('number');

      // Compliance rate should be between 0 and 100
      expect(res.body.complianceRate).toBeGreaterThanOrEqual(0);
      expect(res.body.complianceRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Auth guard', () => {
    it('should return 401 without authentication', async () => {
      await request(getApp().getHttpServer())
        .get('/api/dashboard')
        .expect(401);
    });
  });
});
