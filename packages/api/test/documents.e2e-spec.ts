import request from 'supertest';
import { createTestApp, closeTestApp, getApp, loginAs } from './test-setup';

describe('Documents Module (e2e)', () => {
  let adminToken: string;
  let userId: string;
  let clientId: string;
  let opportunityId: string;
  let kycRecordId: string;
  let documentId: string;

  beforeAll(async () => {
    await createTestApp();
    const { accessToken } = await loginAs('bladmin@albasti.dev', 'Myfav0r!teBL1T');
    adminToken = accessToken;
    userId = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString()).sub;

    // Create a client for document tests
    const client = await request(getApp().getHttpServer())
      .post('/api/clients')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({ name: 'Doc Test Corp', clientType: 'corporate' })
      .expect(201);
    clientId = client.body.id;

    const opportunity = await request(getApp().getHttpServer())
      .post('/api/opportunities')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({
        clientId,
        name: 'Doc Test Opportunity',
        practiceArea: 'regulatory',
        assignedPartner: userId,
      })
      .expect(201);
    opportunityId = opportunity.body.id;

    const kycRecord = await request(getApp().getHttpServer())
      .post('/api/kyc')
      .set({ Authorization: `Bearer ${adminToken}` })
      .send({
        clientId,
        verificationType: 'corporate_kyc',
      })
      .expect(201);
    kycRecordId = kycRecord.body.id;
  }, 30000);

  afterAll(async () => {
    await closeTestApp();
  });

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  describe('POST /api/documents/upload', () => {
    it('should upload a file and store metadata', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/documents/upload')
        .set(auth())
        .field('entityType', 'client')
        .field('entityId', clientId)
        .field('documentCategory', 'kyc_document')
        .attach('file', Buffer.from('test file content for KYC'), {
          filename: 'trade-license.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.fileName).toBe('trade-license.pdf');
      expect(res.body.contentType).toBe('application/pdf');
      expect(res.body.documentCategory).toBe('kyc_document');
      expect(res.body.entityType).toBe('client');
      expect(res.body.entityId).toBe(clientId);
      expect(res.body.blobPath).toContain('client/');
      documentId = res.body.id;
    });

    it('should upload a second document', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/documents/upload')
        .set(auth())
        .field('entityType', 'client')
        .field('entityId', clientId)
        .field('documentCategory', 'correspondence')
        .attach('file', Buffer.from('engagement letter content'), {
          filename: 'engagement-letter.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })
        .expect(201);

      expect(res.body.fileName).toBe('engagement-letter.docx');
    });

    it('should upload an opportunity-scoped document', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/documents/upload')
        .set(auth())
        .field('entityType', 'opportunity')
        .field('entityId', opportunityId)
        .field('documentCategory', 'engagement_letter')
        .attach('file', Buffer.from('signed engagement letter'), {
          filename: 'signed-engagement-letter.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.entityType).toBe('opportunity');
      expect(res.body.entityId).toBe(opportunityId);
      expect(res.body.blobPath).toContain(`opportunity/${opportunityId}/`);
    });

    it('should normalize the kyc alias to kyc_record', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/documents/upload')
        .set(auth())
        .field('entityType', 'kyc')
        .field('entityId', kycRecordId)
        .field('documentCategory', 'kyc_document')
        .attach('file', Buffer.from('passport copy'), {
          filename: 'passport-copy.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      expect(res.body.entityType).toBe('kyc_record');
      expect(res.body.entityId).toBe(kycRecordId);
      expect(res.body.blobPath).toContain(`kyc_record/${kycRecordId}/`);
    });

    it('should reject unsupported entity types', async () => {
      await request(getApp().getHttpServer())
        .post('/api/documents/upload')
        .set(auth())
        .field('entityType', 'random_entity')
        .field('entityId', clientId)
        .field('documentCategory', 'other')
        .attach('file', Buffer.from('bad target'), {
          filename: 'invalid-target.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('should reject uploads when the linked record does not exist', async () => {
      await request(getApp().getHttpServer())
        .post('/api/documents/upload')
        .set(auth())
        .field('entityType', 'client')
        .field('entityId', '00000000-0000-0000-0000-000000000000')
        .field('documentCategory', 'other')
        .attach('file', Buffer.from('missing target'), {
          filename: 'missing-client.txt',
          contentType: 'text/plain',
        })
        .expect(404);
    });
  });

  describe('GET /api/documents', () => {
    it('should list all documents', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/documents')
        .set(auth())
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by entityType and entityId', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/documents?entityType=client&entityId=${clientId}`)
        .set(auth())
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(2);
      expect(res.body.every((d: any) => d.entityType === 'client' && d.entityId === clientId)).toBe(true);
    });

    it('should support kyc alias filtering against normalized records', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/documents?entityType=kyc&entityId=${kycRecordId}`)
        .set(auth())
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(
        res.body.every((d: any) => d.entityType === 'kyc_record' && d.entityId === kycRecordId),
      ).toBe(true);
    });
  });

  describe('GET /api/documents/:id', () => {
    it('should return document metadata', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/documents/${documentId}`)
        .set(auth())
        .expect(200);

      expect(res.body.id).toBe(documentId);
      expect(res.body.fileName).toBe('trade-license.pdf');
    });

    it('should return 404 for non-existent document', async () => {
      await request(getApp().getHttpServer())
        .get('/api/documents/00000000-0000-0000-0000-000000000000')
        .set(auth())
        .expect(404);
    });
  });

  describe('GET /api/documents/:id/download', () => {
    it('should return a SAS download URL with expiry', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/documents/${documentId}/download`)
        .set(auth())
        .expect(200);

      expect(res.body.url).toBeDefined();
      expect(res.body.url).toContain('sig=');
      expect(res.body.url).toContain('se=');
      expect(res.body.expiresOn).toBeDefined();
      expect(res.body.fileName).toBe('trade-license.pdf');
      expect(res.body.contentType).toBe('application/pdf');

      // Verify expiry is roughly 15 minutes from now
      const expiry = new Date(res.body.expiresOn);
      const now = new Date();
      const diffMinutes = (expiry.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThan(14);
      expect(diffMinutes).toBeLessThan(16);
    });
  });

  describe('DELETE /api/documents/:id', () => {
    it('should delete document from blob and database', async () => {
      const res = await request(getApp().getHttpServer())
        .delete(`/api/documents/${documentId}`)
        .set(auth())
        .expect(200);

      expect(res.body.deleted).toBe(true);

      // Verify it's gone
      await request(getApp().getHttpServer())
        .get(`/api/documents/${documentId}`)
        .set(auth())
        .expect(404);
    });
  });
});
