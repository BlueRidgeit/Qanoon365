import request from 'supertest';
import { createTestApp, closeTestApp, getApp, loginAs, getPrisma } from './test-setup';

describe('Conflicts Module (e2e)', () => {
  let adminToken: string;
  let clientId: string;
  let opportunityId: string;
  let conflictRecordId: string;

  beforeAll(async () => {
    await createTestApp();
    const { accessToken } = await loginAs('admin@albasti.dev', 'Admin123!');
    adminToken = accessToken;

    const userId = JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64').toString()).sub;

    // Create a client and opportunity for conflict tests
    const client = await request(getApp().getHttpServer())
      .post('/api/clients')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ name: 'Conflict Test Corp', clientType: 'corporate' })
      .expect(201);
    clientId = client.body.id;

    const opp = await request(getApp().getHttpServer())
      .post('/api/opportunities')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ clientId, name: 'Conflict Test Opp', practiceArea: 'litigation', assignedPartner: userId })
      .expect(201);
    opportunityId = opp.body.id;
  }, 30000);

  afterAll(async () => {
    await closeTestApp();
  });

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  describe('POST /api/conflicts', () => {
    it('should create a conflict record', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/conflicts')
        .set(auth())
        .send({
          opportunityId,
          matchedEntityType: 'client',
          matchedEntityId: clientId,
          matchSource: 'crm_data',
          matchConfidence: 'high',
          confidenceScore: 0.95,
          matchField: 'name',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.opportunityId).toBe(opportunityId);
      expect(res.body.resolutionStatus).toBe('pending');
      conflictRecordId = res.body.id;
    });

    it('should update opportunity conflict status to in_progress', async () => {
      const opp = await request(getApp().getHttpServer())
        .get(`/api/opportunities/${opportunityId}`)
        .set(auth())
        .expect(200);

      expect(opp.body.conflictCheckStatus).toBe('in_progress');
    });

    it('should return 404 for non-existent opportunity', async () => {
      await request(getApp().getHttpServer())
        .post('/api/conflicts')
        .set(auth())
        .send({
          opportunityId: '00000000-0000-0000-0000-000000000000',
          matchedEntityType: 'client',
          matchedEntityId: clientId,
          matchSource: 'crm_data',
          matchConfidence: 'low',
        })
        .expect(404);
    });
  });

  describe('GET /api/conflicts', () => {
    it('should list all conflict records', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/conflicts')
        .set(auth())
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by opportunityId', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/conflicts?opportunityId=${opportunityId}`)
        .set(auth())
        .expect(200);

      expect(res.body.every((r: any) => r.opportunityId === opportunityId)).toBe(true);
    });
  });

  describe('GET /api/conflicts/:id', () => {
    it('should return single conflict record with opportunity', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/conflicts/${conflictRecordId}`)
        .set(auth())
        .expect(200);

      expect(res.body.id).toBe(conflictRecordId);
      expect(res.body.opportunity).toBeDefined();
    });

    it('should return 404 for non-existent record', async () => {
      await request(getApp().getHttpServer())
        .get('/api/conflicts/00000000-0000-0000-0000-000000000000')
        .set(auth())
        .expect(404);
    });
  });

  describe('PATCH /api/conflicts/:id/resolve', () => {
    it('should reject waiver without resolution notes', async () => {
      await request(getApp().getHttpServer())
        .patch(`/api/conflicts/${conflictRecordId}/resolve`)
        .set(auth())
        .send({ resolutionStatus: 'waived' })
        .expect(400);
    });

    it('should resolve conflict as cleared', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/api/conflicts/${conflictRecordId}/resolve`)
        .set(auth())
        .send({ resolutionStatus: 'cleared', resolutionNotes: 'No real conflict after review.' })
        .expect(200);

      expect(res.body.resolutionStatus).toBe('cleared');
      expect(res.body.resolvedBy).toBeDefined();
      expect(res.body.resolvedAt).toBeDefined();
    });

    it('should update opportunity conflict status to cleared when all resolved', async () => {
      const opp = await request(getApp().getHttpServer())
        .get(`/api/opportunities/${opportunityId}`)
        .set(auth())
        .expect(200);

      expect(opp.body.conflictCheckStatus).toBe('cleared');
    });

    it('should reject re-resolving an already-resolved conflict', async () => {
      await request(getApp().getHttpServer())
        .patch(`/api/conflicts/${conflictRecordId}/resolve`)
        .set(auth())
        .send({ resolutionStatus: 'cleared' })
        .expect(400);
    });
  });

  describe('Audit trail', () => {
    it('should have audit entries for conflict operations', async () => {
      const prisma = getPrisma();
      const logs = await prisma.auditLog.findMany({
        where: { entityType: 'conflict_record' },
        orderBy: { performedAt: 'desc' },
      });

      expect(logs.length).toBeGreaterThanOrEqual(2); // create + resolve
      expect(logs.some((l: any) => l.action === 'create')).toBe(true);
      expect(logs.some((l: any) => l.action === 'conflict_resolve')).toBe(true);
    });
  });
});
