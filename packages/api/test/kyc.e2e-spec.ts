import request from 'supertest';
import { createTestApp, closeTestApp, getApp, loginAs, getPrisma } from './test-setup';

describe('KYC Module (e2e)', () => {
  let adminToken: string;
  let clientId: string;
  let kycRecordId: string;

  beforeAll(async () => {
    await createTestApp();
    const { accessToken } = await loginAs('admin@albasti.dev', 'Admin123!');
    adminToken = accessToken;

    // Create a client for KYC tests
    const client = await request(getApp().getHttpServer())
      .post('/api/clients')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ name: 'KYC Test Corp', clientType: 'corporate' })
      .expect(201);
    clientId = client.body.id;
  }, 30000);

  afterAll(async () => {
    await closeTestApp();
  });

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  describe('POST /api/kyc', () => {
    it('should create a KYC record', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/kyc')
        .set(auth())
        .send({
          clientId,
          verificationType: 'corporate_kyc',
          idDocumentType: 'trade_license',
          idDocumentNumber: 'TL-2026-00123',
          idExpiryDate: '2027-12-31T00:00:00.000Z',
          riskRating: 'low',
          notes: 'Initial KYC for corporate client.',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.clientId).toBe(clientId);
      expect(res.body.status).toBe('documents_requested');
      expect(res.body.verificationType).toBe('corporate_kyc');
      kycRecordId = res.body.id;
    });

    it('should update client KYC status to documents_requested', async () => {
      const client = await request(getApp().getHttpServer())
        .get(`/api/clients/${clientId}`)
        .set(auth())
        .expect(200);

      expect(client.body.kycStatus).toBe('documents_requested');
    });

    it('should return 404 for non-existent client', async () => {
      await request(getApp().getHttpServer())
        .post('/api/kyc')
        .set(auth())
        .send({
          clientId: '00000000-0000-0000-0000-000000000000',
          verificationType: 'individual_kyc',
        })
        .expect(404);
    });
  });

  describe('GET /api/kyc', () => {
    it('should list all KYC records', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/kyc')
        .set(auth())
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by clientId', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/kyc?clientId=${clientId}`)
        .set(auth())
        .expect(200);

      expect(res.body.every((r: any) => r.clientId === clientId)).toBe(true);
    });
  });

  describe('GET /api/kyc/:id', () => {
    it('should return single KYC record with client', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/kyc/${kycRecordId}`)
        .set(auth())
        .expect(200);

      expect(res.body.id).toBe(kycRecordId);
      expect(res.body.client).toBeDefined();
      expect(res.body.client.name).toBe('KYC Test Corp');
    });
  });

  describe('PATCH /api/kyc/:id', () => {
    it('should update KYC record to under_review', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/api/kyc/${kycRecordId}`)
        .set(auth())
        .send({ status: 'under_review' })
        .expect(200);

      expect(res.body.status).toBe('under_review');
    });

    it('should verify KYC record and set verifier + date', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/api/kyc/${kycRecordId}`)
        .set(auth())
        .send({ status: 'verified' })
        .expect(200);

      expect(res.body.status).toBe('verified');
      expect(res.body.verifiedBy).toBeDefined();
      expect(res.body.verificationDate).toBeDefined();
    });

    it('should sync client KYC status to verified', async () => {
      const client = await request(getApp().getHttpServer())
        .get(`/api/clients/${clientId}`)
        .set(auth())
        .expect(200);

      expect(client.body.kycStatus).toBe('verified');
    });
  });

  describe('GET /api/kyc/check-expiry', () => {
    it('should check for expired KYC records', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/kyc/check-expiry')
        .set(auth())
        .expect(200);

      expect(res.body.expiredCount).toBeDefined();
      expect(typeof res.body.expiredCount).toBe('number');
    });
  });

  describe('Audit trail', () => {
    it('should have audit entries for KYC operations', async () => {
      const prisma = getPrisma();
      const logs = await prisma.auditLog.findMany({
        where: { entityType: 'kyc_record' },
        orderBy: { performedAt: 'desc' },
      });

      expect(logs.length).toBeGreaterThanOrEqual(2);
      expect(logs.some((l: any) => l.action === 'create')).toBe(true);
      expect(logs.some((l: any) => l.action === 'kyc_verify')).toBe(true);
    });
  });
});
