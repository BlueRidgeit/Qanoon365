import request from 'supertest';
import { createTestApp, closeTestApp, getApp, loginAs, getPrisma } from './test-setup';

describe('CRUD Modules (e2e)', () => {
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

  // ═══════════════════════════════════════════════════════════════
  // CLIENTS
  // ═══════════════════════════════════════════════════════════════
  let clientId: string;

  describe('Clients', () => {
    it('POST /api/clients – should create a client', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/clients')
        .set(auth())
        .send({ name: 'Test Corp', clientType: 'corporate', industry: 'Technology' })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Test Corp');
      expect(res.body.clientType).toBe('corporate');
      expect(res.body.kycStatus).toBe('not_started');
      expect(res.body.preferredLanguage).toBe('english');
      clientId = res.body.id;
    });

    it('GET /api/clients – should list clients', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/clients')
        .set(auth())
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.some((c: any) => c.id === clientId)).toBe(true);
    });

    it('GET /api/clients/:id – should return client with relations', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/clients/${clientId}`)
        .set(auth())
        .expect(200);

      expect(res.body.id).toBe(clientId);
      expect(res.body.contacts).toBeDefined();
      expect(res.body.kycRecords).toBeDefined();
    });

    it('PATCH /api/clients/:id – should update a client', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/api/clients/${clientId}`)
        .set(auth())
        .send({ industry: 'Legal Tech', riskRating: 'low' })
        .expect(200);

      expect(res.body.industry).toBe('Legal Tech');
      expect(res.body.riskRating).toBe('low');
    });

    it('GET /api/clients/:id – 404 for non-existent', async () => {
      await request(getApp().getHttpServer())
        .get('/api/clients/00000000-0000-0000-0000-000000000000')
        .set(auth())
        .expect(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CONTACTS
  // ═══════════════════════════════════════════════════════════════
  let contactId: string;

  describe('Contacts', () => {
    it('POST /api/contacts – should create a contact for client', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/contacts')
        .set(auth())
        .send({
          clientId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@testcorp.com',
          jobTitle: 'CEO',
          isPrimary: true,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.firstName).toBe('John');
      expect(res.body.isPrimary).toBe(true);
      contactId = res.body.id;
    });

    it('GET /api/contacts?clientId – should filter contacts by client', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/contacts?clientId=${clientId}`)
        .set(auth())
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].clientId).toBe(clientId);
    });

    it('GET /api/contacts/:id – should return single contact', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/contacts/${contactId}`)
        .set(auth())
        .expect(200);

      expect(res.body.firstName).toBe('John');
    });

    it('PATCH /api/contacts/:id – should update a contact', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/api/contacts/${contactId}`)
        .set(auth())
        .send({ phone: '+971501234567' })
        .expect(200);

      expect(res.body.phone).toBe('+971501234567');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // LEADS
  // ═══════════════════════════════════════════════════════════════
  let leadId: string;

  describe('Leads', () => {
    it('POST /api/leads – should create a lead', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/leads')
        .set(auth())
        .send({
          subject: 'Employment Dispute',
          caseType: 'employment',
          jurisdiction: 'difc',
          urgency: 'medium',
          caseSummary: 'Wrongful termination claim against employer.',
          clientName: 'Jane Smith',
          clientType: 'individual',
          estimatedValue: 50000,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.subject).toBe('Employment Dispute');
      expect(res.body.status).toBe('new');
      leadId = res.body.id;
    });

    it('GET /api/leads – should list leads', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/leads')
        .set(auth())
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/leads?status=new – should filter by status', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/leads?status=new')
        .set(auth())
        .expect(200);

      expect(res.body.every((l: any) => l.status === 'new')).toBe(true);
    });

    it('PATCH /api/leads/:id – should update a lead', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/api/leads/${leadId}`)
        .set(auth())
        .send({ urgency: 'high' })
        .expect(200);

      expect(res.body.urgency).toBe('high');
    });

    it('POST /api/leads/:id/qualify – should convert lead to client + opportunity', async () => {
      const res = await request(getApp().getHttpServer())
        .post(`/api/leads/${leadId}/qualify`)
        .set(auth())
        .expect(201);

      expect(res.body.lead.status).toBe('converted');
      expect(res.body.opportunity).toBeDefined();
      expect(res.body.opportunity.name).toBe('Employment Dispute');
      expect(res.body.clientId).toBeDefined();
    });

    it('POST /api/leads/:id/qualify – should reject already-qualified lead', async () => {
      await request(getApp().getHttpServer())
        .post(`/api/leads/${leadId}/qualify`)
        .set(auth())
        .expect(400);
    });

    it('POST /api/leads/:id/qualify – should require client name', async () => {
      // Create a lead without clientName
      const lead = await request(getApp().getHttpServer())
        .post('/api/leads')
        .set(auth())
        .send({
          subject: 'No Client Lead',
          caseType: 'commercial',
          jurisdiction: 'difc',
          urgency: 'low',
          caseSummary: 'Test lead without client name.',
        })
        .expect(201);

      await request(getApp().getHttpServer())
        .post(`/api/leads/${lead.body.id}/qualify`)
        .set(auth())
        .expect(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // OPPORTUNITIES + STAGE GATE LOGIC
  // ═══════════════════════════════════════════════════════════════
  let opportunityId: string;

  describe('Opportunities', () => {
    it('POST /api/opportunities – should create an opportunity', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/opportunities')
        .set(auth())
        .send({
          clientId,
          name: 'Direct Opportunity',
          practiceArea: 'commercial',
          assignedPartner: (JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64').toString())).sub,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.stage).toBe('inquiry');
      expect(res.body.conflictCheckStatus).toBe('not_started');
      opportunityId = res.body.id;
    });

    it('GET /api/opportunities – should list opportunities', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/opportunities')
        .set(auth())
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/opportunities/:id – should return opportunity with relations', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/opportunities/${opportunityId}`)
        .set(auth())
        .expect(200);

      expect(res.body.client).toBeDefined();
      expect(res.body.conflictRecords).toBeDefined();
    });

    it('PATCH /api/opportunities/:id/stage – should advance to consultation', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/api/opportunities/${opportunityId}/stage`)
        .set(auth())
        .send({ stage: 'consultation' })
        .expect(200);

      expect(res.body.stage).toBe('consultation');
    });

    it('PATCH /api/opportunities/:id/stage – should reject proposal without conflict cleared', async () => {
      await request(getApp().getHttpServer())
        .patch(`/api/opportunities/${opportunityId}/stage`)
        .set(auth())
        .send({ stage: 'proposal' })
        .expect(400);
    });

    it('should advance to proposal after conflict is cleared', async () => {
      // Clear conflict check via PATCH
      await request(getApp().getHttpServer())
        .patch(`/api/opportunities/${opportunityId}`)
        .set(auth())
        .send({ conflictCheckStatus: 'cleared' })
        .expect(200);

      const res = await request(getApp().getHttpServer())
        .patch(`/api/opportunities/${opportunityId}/stage`)
        .set(auth())
        .send({ stage: 'proposal' })
        .expect(200);

      expect(res.body.stage).toBe('proposal');
    });

    it('PATCH /api/opportunities/:id/stage – should reject retainer without KYC verified', async () => {
      await request(getApp().getHttpServer())
        .patch(`/api/opportunities/${opportunityId}/stage`)
        .set(auth())
        .send({ stage: 'retainer' })
        .expect(400);
    });

    it('should advance to retainer after client KYC is verified', async () => {
      // Verify client KYC via PATCH
      await request(getApp().getHttpServer())
        .patch(`/api/clients/${clientId}`)
        .set(auth())
        .send({ kycStatus: 'verified' })
        .expect(200);

      const res = await request(getApp().getHttpServer())
        .patch(`/api/opportunities/${opportunityId}/stage`)
        .set(auth())
        .send({ stage: 'retainer' })
        .expect(200);

      expect(res.body.stage).toBe('retainer');
    });

    it('should advance to won and auto-create matter', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/api/opportunities/${opportunityId}/stage`)
        .set(auth())
        .send({ stage: 'won' })
        .expect(200);

      expect(res.body.stage).toBe('won');
      expect(res.body.closedAt).toBeDefined();
    });

    it('PATCH /api/opportunities/:id/stage – should reject invalid stage', async () => {
      // Create another opportunity to test invalid stage
      const opp = await request(getApp().getHttpServer())
        .post('/api/opportunities')
        .set(auth())
        .send({
          clientId,
          name: 'Another Opp',
          practiceArea: 'banking',
          assignedPartner: (JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64').toString())).sub,
        })
        .expect(201);

      await request(getApp().getHttpServer())
        .patch(`/api/opportunities/${opp.body.id}/stage`)
        .set(auth())
        .send({ stage: 'nonexistent_stage' })
        .expect(400);
    });

    it('should allow transition to lost', async () => {
      // Create yet another opportunity for the lost test
      const opp = await request(getApp().getHttpServer())
        .post('/api/opportunities')
        .set(auth())
        .send({
          clientId,
          name: 'Lost Opp',
          practiceArea: 'litigation',
          assignedPartner: (JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64').toString())).sub,
        })
        .expect(201);

      const res = await request(getApp().getHttpServer())
        .patch(`/api/opportunities/${opp.body.id}/stage`)
        .set(auth())
        .send({ stage: 'lost' })
        .expect(200);

      expect(res.body.stage).toBe('lost');
      expect(res.body.closedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // MATTERS (auto-created from won opportunity + close flow)
  // ═══════════════════════════════════════════════════════════════
  describe('Matters', () => {
    let matterId: string;

    it('GET /api/matters – should list matters (includes auto-created)', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/matters')
        .set(auth())
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      matterId = res.body[0].id;
      expect(res.body[0].matterNumber).toMatch(/^MAT-\d{4}-\d{4}$/);
      expect(res.body[0].status).toBe('active');
    });

    it('GET /api/matters/:id – should return matter with relations', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/matters/${matterId}`)
        .set(auth())
        .expect(200);

      expect(res.body.client).toBeDefined();
      expect(res.body.opportunity).toBeDefined();
    });

    it('PATCH /api/matters/:id – should update matter', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/api/matters/${matterId}`)
        .set(auth())
        .send({ notes: 'Updated matter notes' })
        .expect(200);

      expect(res.body.notes).toBe('Updated matter notes');
    });

    it('PATCH /api/matters/:id/close – should close matter (admin has partner role)', async () => {
      const res = await request(getApp().getHttpServer())
        .patch(`/api/matters/${matterId}/close`)
        .set(auth())
        .expect(200);

      expect(res.body.status).toBe('closed');
    });

    it('PATCH /api/matters/:id/close – should reject already-closed matter', async () => {
      await request(getApp().getHttpServer())
        .patch(`/api/matters/${matterId}/close`)
        .set(auth())
        .expect(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ACTIVITIES
  // ═══════════════════════════════════════════════════════════════
  describe('Activities', () => {
    it('POST /api/activities – should create an activity', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/activities')
        .set(auth())
        .send({
          entityType: 'client',
          entityId: clientId,
          activityType: 'meeting',
          subject: 'Initial consultation meeting',
          body: 'Discussed scope of engagement.',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.subject).toBe('Initial consultation meeting');
      expect(res.body.isSystemGenerated).toBe(false);
    });

    it('GET /api/activities – should list activities', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/activities')
        .set(auth())
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/activities?entityType&entityId – should filter by entity', async () => {
      const res = await request(getApp().getHttpServer())
        .get(`/api/activities?entityType=client&entityId=${clientId}`)
        .set(auth())
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.every((a: any) => a.entityType === 'client' && a.entityId === clientId)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // AUDIT LOG (verify entries were created by CRUD operations)
  // ═══════════════════════════════════════════════════════════════
  describe('Audit Trail', () => {
    it('should have audit entries for CRUD operations', async () => {
      const prisma = getPrisma();
      const logs = await prisma.auditLog.findMany({
        orderBy: { performedAt: 'desc' },
        take: 50,
      });

      expect(logs.length).toBeGreaterThanOrEqual(5);

      const entityTypes = logs.map((l: any) => l.entityType);
      expect(entityTypes).toContain('client');
      expect(entityTypes).toContain('lead');
      expect(entityTypes).toContain('opportunity');
      expect(entityTypes).toContain('matter');

      const actions = logs.map((l: any) => l.action);
      expect(actions).toContain('create');
      expect(actions).toContain('update');
      expect(actions).toContain('stage_change');
    });
  });
});
