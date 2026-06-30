import request from 'supertest';
import {
  createTestApp,
  getApp,
  getPrisma,
  closeTestApp,
  loginAs,
} from './test-setup';

let token: string;

beforeAll(async () => {
  await createTestApp();
  const prisma = getPrisma();

  // Ensure we're on the right schema
  await prisma.$executeRawUnsafe(`SET search_path TO "tenant_default", public`);

  // Clean up any leftover court intel queries
  try {
    await prisma.courtIntelQuery.deleteMany({});
  } catch { /* ignore */ }

  const { accessToken } = await loginAs('bladmin@albasti.dev', 'Myfav0r!teBL1T');
  token = accessToken;
}, 30000);

afterAll(async () => {
  await closeTestApp();
});

describe('CourtIntelModule (e2e)', () => {
  // ── Party Intelligence ────────────────────────────────────
  describe('POST /api/court-intel/query — party_intelligence', () => {
    it('should return intelligence for a known party name', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/court-intel/query')
        .set('Authorization', `Bearer ${token}`)
        .send({
          queryType: 'party_intelligence',
          partyName: 'Al Rashid Trading',
        })
        .expect(201);

      expect(res.body).toHaveProperty('queryType', 'party_intelligence');
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('confidence');
      expect(['high', 'medium', 'low']).toContain(res.body.confidence);
      expect(res.body).toHaveProperty('findings');
      expect(Array.isArray(res.body.findings)).toBe(true);
      expect(res.body).toHaveProperty('riskFactors');
      expect(res.body).toHaveProperty('recommendations');
      expect(res.body).toHaveProperty('metadata');
      expect(res.body.metadata).toHaveProperty('casesAnalyzed');
      expect(res.body.metadata).toHaveProperty('partiesMatched');
      expect(res.body.metadata).toHaveProperty('processingTimeMs');
    }, 30000);

    it('should handle fuzzy matching on partial names', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/court-intel/query')
        .set('Authorization', `Bearer ${token}`)
        .send({
          queryType: 'party_intelligence',
          partyName: 'Mashreq',
        })
        .expect(201);

      expect(res.body.queryType).toBe('party_intelligence');
      expect(res.body.metadata.partiesMatched).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  // ── Comparable Case ───────────────────────────────────────
  describe('POST /api/court-intel/query — comparable_case', () => {
    it('should return comparable cases by type and jurisdiction', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/court-intel/query')
        .set('Authorization', `Bearer ${token}`)
        .send({
          queryType: 'comparable_case',
          caseType: 'commercial',
          jurisdiction: 'difc',
        })
        .expect(201);

      expect(res.body.queryType).toBe('comparable_case');
      expect(res.body).toHaveProperty('summary');
      expect(res.body.metadata.casesAnalyzed).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  // ── Contextual Case Law ───────────────────────────────────
  describe('POST /api/court-intel/query — contextual_case_law', () => {
    it('should return contextual case law for a practice area', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/court-intel/query')
        .set('Authorization', `Bearer ${token}`)
        .send({
          queryType: 'contextual_case_law',
          practiceArea: 'banking_finance',
          jurisdiction: 'adgm',
        })
        .expect(201);

      expect(res.body.queryType).toBe('contextual_case_law');
      expect(res.body).toHaveProperty('findings');
      expect(Array.isArray(res.body.findings)).toBe(true);
    }, 30000);

    it('should accept linked client context and persist history against that client', async () => {
      const prisma = getPrisma();
      const client = await prisma.client.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      expect(client).toBeTruthy();

      const res = await request(getApp().getHttpServer())
        .post('/api/court-intel/query')
        .set('Authorization', `Bearer ${token}`)
        .send({
          queryType: 'party_intelligence',
          clientId: client!.id,
        })
        .expect(201);

      expect(res.body.queryType).toBe('party_intelligence');

      const history = await request(getApp().getHttpServer())
        .get(`/api/court-intel/history?entityType=client&entityId=${client!.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(history.body.length).toBeGreaterThanOrEqual(1);
      expect(history.body[0].sourceEntityType).toBe('client');
      expect(history.body[0].sourceEntityId).toBe(client!.id);
    }, 30000);
  });

  // ── Opposing Counsel ──────────────────────────────────────
  describe('POST /api/court-intel/query — opposing_counsel', () => {
    it('should return opposing counsel intel by firm name', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/court-intel/query')
        .set('Authorization', `Bearer ${token}`)
        .send({
          queryType: 'opposing_counsel',
          firmName: 'Al Tamimi',
        })
        .expect(201);

      expect(res.body.queryType).toBe('opposing_counsel');
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('recommendations');
    }, 30000);

    it('should search by lawyer name', async () => {
      const res = await request(getApp().getHttpServer())
        .post('/api/court-intel/query')
        .set('Authorization', `Bearer ${token}`)
        .send({
          queryType: 'opposing_counsel',
          lawyerName: 'Hassan Elhais',
        })
        .expect(201);

      expect(res.body.queryType).toBe('opposing_counsel');
    }, 30000);
  });

  // ── Query History ─────────────────────────────────────────
  describe('GET /api/court-intel/history', () => {
    it('should return query history from all previous queries', async () => {
      const res = await request(getApp().getHttpServer())
        .get('/api/court-intel/history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      // We made at least 5 queries above
      expect(res.body.length).toBeGreaterThanOrEqual(5);

      // Verify structure of a history entry
      const entry = res.body[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('queryType');
      expect(entry).toHaveProperty('queryInput');
      expect(entry).toHaveProperty('resultSummary');
      expect(entry).toHaveProperty('executedAt');
      expect(entry).toHaveProperty('executedBy');
    });
  });

  // ── Auth Guard ────────────────────────────────────────────
  describe('Auth enforcement', () => {
    it('should return 401 without a token', async () => {
      await request(getApp().getHttpServer())
        .post('/api/court-intel/query')
        .send({ queryType: 'party_intelligence', partyName: 'test' })
        .expect(401);
    });
  });
});
