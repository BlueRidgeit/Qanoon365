import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import helmet from 'helmet';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../src/audit/audit.service.js';
import { AuditModule } from '../src/audit/audit.module.js';
import { AuthModule } from '../src/auth/auth.module.js';
import { ClientsModule } from '../src/clients/clients.module.js';
import { KycModule } from '../src/kyc/kyc.module.js';
import { LeadsModule } from '../src/leads/leads.module.js';
import { MattersModule } from '../src/matters/matters.module.js';
import { OpportunitiesModule } from '../src/opportunities/opportunities.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter.js';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../src/common/guards/roles.guard.js';

jest.setTimeout(30000);

function uniqueName(prefix: string) {
  return `${prefix} ${Date.now()}`;
}

type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
  isActive: boolean;
  lastLoginAt: Date | null;
};

type ClientRecord = {
  id: string;
  name: string;
  clientType: string;
  registrationNumber?: string;
  industry?: string;
  preferredLanguage: string;
  riskRating?: string;
  notes?: string;
  kycStatus: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
};

type LeadRecord = {
  id: string;
  subject: string;
  caseType: string;
  jurisdiction: string;
  urgency: string;
  caseSummary: string;
  clientName?: string;
  clientType?: string;
  opposingPartyNames?: string;
  estimatedValue?: number;
  referralSource?: string;
  assignedTo?: string;
  status: string;
  convertedOpportunityId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
};

type OpportunityRecord = {
  id: string;
  clientId: string;
  name: string;
  practiceArea: string;
  assignedPartner: string;
  leadId?: string;
  engagementType?: string;
  estimatedValue?: number;
  stage: string;
  conflictCheckStatus: string;
  conflictApprovedBy?: string | null;
  kycStatus: string;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
};

type MatterRecord = {
  id: string;
  matterNumber: string;
  name: string;
  clientId: string;
  opportunityId: string;
  practiceArea: string;
  leadPartner: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
};

type KycRecord = {
  id: string;
  clientId: string;
  verificationType: string;
  status: string;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  idExpiryDate?: Date | null;
  verificationDate?: Date | null;
  verifiedBy?: string | null;
  riskRating?: string | null;
  notes?: string | null;
  documentFolderPath?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
};

class InMemoryAuditService {
  public readonly entries: Array<Record<string, unknown>> = [];

  async log(entry: Record<string, unknown>) {
    this.entries.push(entry);
  }
}

class InMemoryPrismaService {
  readonly users = new Map<string, UserRecord>();
  readonly clients = new Map<string, ClientRecord>();
  readonly leads = new Map<string, LeadRecord>();
  readonly opportunities = new Map<string, OpportunityRecord>();
  readonly matters = new Map<string, MatterRecord>();
  readonly kycRecords = new Map<string, KycRecord>();
  readonly audit = new InMemoryAuditService();

  constructor() {
    const adminUser: UserRecord = {
      id: randomUUID(),
      email: 'admin@albasti.dev',
      passwordHash: bcrypt.hashSync('Admin123!', 10),
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      tenantId: 'tenant-demo',
      isActive: true,
      lastLoginAt: null,
    };
    this.users.set(adminUser.id, adminUser);
  }

  async $connect() {}
  async $disconnect() {}
  async $executeRawUnsafe() {}

  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    return fn(this);
  }

  user = {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) {
        return this.users.get(where.id) ?? null;
      }
      if (where.email) {
        return Array.from(this.users.values()).find((user) => user.email === where.email) ?? null;
      }
      return null;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<UserRecord> }) => {
      const user = this.users.get(where.id);
      if (!user) {
        throw new Error('User not found');
      }
      Object.assign(user, data);
      return user;
    },
  };

  client = {
    create: async ({ data }: { data: Partial<ClientRecord> }) => {
      const id = randomUUID();
      const now = new Date();
      const client: ClientRecord = {
        id,
        name: String(data.name),
        clientType: String(data.clientType ?? 'individual'),
        registrationNumber: data.registrationNumber,
        industry: data.industry,
        preferredLanguage: data.preferredLanguage ?? 'english',
        riskRating: data.riskRating,
        notes: data.notes,
        kycStatus: (data.kycStatus as string) ?? 'not_started',
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: String(data.createdBy ?? ''),
        updatedBy: String(data.updatedBy ?? ''),
      };
      this.clients.set(id, client);
      return this.hydrateClient(client);
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const client = this.clients.get(where.id);
      return client ? this.hydrateClient(client) : null;
    },
    findMany: async (query: { where?: { name?: string; id?: string; isActive?: boolean }; orderBy?: { createdAt?: 'desc' | 'asc' }; take?: number }) => {
      let rows = Array.from(this.clients.values());
      if (query.where?.name) {
        rows = rows.filter((client) => client.name === query.where?.name);
      }
      if (query.where?.id) {
        rows = rows.filter((client) => client.id === query.where?.id);
      }
      if (query.where?.isActive !== undefined) {
        rows = rows.filter((client) => client.isActive === query.where?.isActive);
      }
      rows = this.sortByCreatedAt(rows, query.orderBy?.createdAt ?? 'desc');
      return rows.slice(0, query.take ?? rows.length).map((client) => this.hydrateClient(client));
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<ClientRecord> }) => {
      const client = this.clients.get(where.id);
      if (!client) {
        throw new Error('Client not found');
      }
      Object.assign(client, data, { updatedAt: new Date() });
      return this.hydrateClient(client);
    },
  };

  kycRecord = {
    create: async ({ data }: { data: Partial<KycRecord> }) => {
      const id = randomUUID();
      const now = new Date();
      const record: KycRecord = {
        id,
        clientId: String(data.clientId),
        verificationType: String(data.verificationType),
        status: (data.status as string) ?? 'documents_requested',
        idDocumentType: data.idDocumentType ?? null,
        idDocumentNumber: data.idDocumentNumber ?? null,
        idExpiryDate: data.idExpiryDate ?? null,
        verificationDate: data.verificationDate ?? null,
        verifiedBy: data.verifiedBy ?? null,
        riskRating: data.riskRating ?? null,
        notes: data.notes ?? null,
        documentFolderPath: data.documentFolderPath ?? null,
        createdAt: now,
        updatedAt: now,
        createdBy: String(data.createdBy ?? ''),
        updatedBy: String(data.updatedBy ?? ''),
      };
      this.kycRecords.set(id, record);
      return record;
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const record = this.kycRecords.get(where.id);
      return record ? { ...record, client: this.hydrateClient(this.clients.get(record.clientId)!) } : null;
    },
    findMany: async (query: { where?: { clientId?: string; status?: string; idExpiryDate?: { lt: Date } }; orderBy?: { createdAt?: 'desc' | 'asc' }; take?: number }) => {
      let rows = Array.from(this.kycRecords.values());
      if (query.where?.clientId) {
        rows = rows.filter((record) => record.clientId === query.where?.clientId);
      }
      if (query.where?.status) {
        rows = rows.filter((record) => record.status === query.where?.status);
      }
      if (query.where?.idExpiryDate?.lt) {
        rows = rows.filter((record) => record.idExpiryDate instanceof Date && record.idExpiryDate < query.where!.idExpiryDate!.lt);
      }
      rows = this.sortByCreatedAt(rows, query.orderBy?.createdAt ?? 'desc');
      return rows.slice(0, query.take ?? rows.length).map((record) => ({
        ...record,
        client: this.hydrateClient(this.clients.get(record.clientId)!),
      }));
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<KycRecord> }) => {
      const record = this.kycRecords.get(where.id);
      if (!record) {
        throw new Error('KYC record not found');
      }
      Object.assign(record, data, { updatedAt: new Date() });
      return record;
    },
  };

  lead = {
    create: async ({ data }: { data: Partial<LeadRecord> }) => {
      const id = randomUUID();
      const now = new Date();
      const lead: LeadRecord = {
        id,
        subject: String(data.subject),
        caseType: String(data.caseType),
        jurisdiction: String(data.jurisdiction),
        urgency: String(data.urgency),
        caseSummary: String(data.caseSummary),
        clientName: data.clientName,
        clientType: data.clientType,
        opposingPartyNames: data.opposingPartyNames,
        estimatedValue: data.estimatedValue,
        referralSource: data.referralSource,
        assignedTo: data.assignedTo,
        status: (data.status as string) ?? 'new',
        convertedOpportunityId: data.convertedOpportunityId ?? null,
        createdAt: now,
        updatedAt: now,
        createdBy: String(data.createdBy ?? ''),
        updatedBy: String(data.updatedBy ?? ''),
      };
      this.leads.set(id, lead);
      return lead;
    },
    findUnique: async ({ where }: { where: { id: string } }) => this.leads.get(where.id) ?? null,
    findMany: async (query: { where?: { status?: string }; orderBy?: { createdAt?: 'desc' | 'asc' }; take?: number }) => {
      let rows = Array.from(this.leads.values());
      if (query.where?.status) {
        rows = rows.filter((lead) => lead.status === query.where?.status);
      }
      rows = this.sortByCreatedAt(rows, query.orderBy?.createdAt ?? 'desc');
      return rows.slice(0, query.take ?? rows.length);
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<LeadRecord> }) => {
      const lead = this.leads.get(where.id);
      if (!lead) {
        throw new Error('Lead not found');
      }
      Object.assign(lead, data, { updatedAt: new Date() });
      return lead;
    },
  };

  opportunity = {
    create: async ({ data }: { data: Partial<OpportunityRecord> }) => {
      const id = randomUUID();
      const now = new Date();
      const opportunity: OpportunityRecord = {
        id,
        clientId: String(data.clientId),
        name: String(data.name),
        practiceArea: String(data.practiceArea),
        assignedPartner: String(data.assignedPartner),
        leadId: data.leadId,
        engagementType: data.engagementType,
        estimatedValue: data.estimatedValue,
        stage: (data.stage as string) ?? 'inquiry',
        conflictCheckStatus: (data.conflictCheckStatus as string) ?? 'not_started',
        conflictApprovedBy: data.conflictApprovedBy ?? null,
        kycStatus: (data.kycStatus as string) ?? 'not_required',
        closedAt: data.closedAt ?? null,
        createdAt: now,
        updatedAt: now,
        createdBy: String(data.createdBy ?? ''),
        updatedBy: String(data.updatedBy ?? ''),
      };
      this.opportunities.set(id, opportunity);
      return this.hydrateOpportunity(opportunity);
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const opportunity = this.opportunities.get(where.id);
      return opportunity ? this.hydrateOpportunity(opportunity) : null;
    },
    findMany: async (query: { where?: { stage?: string }; orderBy?: { createdAt?: 'desc' | 'asc' }; take?: number }) => {
      let rows = Array.from(this.opportunities.values());
      if (query.where?.stage) {
        rows = rows.filter((opportunity) => opportunity.stage === query.where?.stage);
      }
      rows = this.sortByCreatedAt(rows, query.orderBy?.createdAt ?? 'desc');
      return rows.slice(0, query.take ?? rows.length).map((opportunity) => this.hydrateOpportunity(opportunity));
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<OpportunityRecord> }) => {
      const opportunity = this.opportunities.get(where.id);
      if (!opportunity) {
        throw new Error('Opportunity not found');
      }
      Object.assign(opportunity, data, { updatedAt: new Date() });
      return this.hydrateOpportunity(opportunity);
    },
    updateMany: async ({ where, data }: { where: { clientId?: string }; data: Partial<OpportunityRecord> }) => {
      let count = 0;
      for (const opportunity of this.opportunities.values()) {
        if (!where.clientId || opportunity.clientId === where.clientId) {
          Object.assign(opportunity, data, { updatedAt: new Date() });
          count++;
        }
      }
      return { count };
    },
    count: async () => this.opportunities.size,
  };

  matter = {
    create: async ({ data }: { data: Partial<MatterRecord> }) => {
      const id = randomUUID();
      const now = new Date();
      const matter: MatterRecord = {
        id,
        matterNumber: String(data.matterNumber),
        name: String(data.name),
        clientId: String(data.clientId),
        opportunityId: String(data.opportunityId),
        practiceArea: String(data.practiceArea),
        leadPartner: String(data.leadPartner),
        status: (data.status as string) ?? 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: String(data.createdBy ?? ''),
        updatedBy: String(data.updatedBy ?? ''),
      };
      this.matters.set(id, matter);
      return this.hydrateMatter(matter);
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const matter = this.matters.get(where.id);
      return matter ? this.hydrateMatter(matter) : null;
    },
    findMany: async (query: { where?: { status?: string; opportunityId?: string }; orderBy?: { createdAt?: 'desc' | 'asc' }; take?: number }) => {
      let rows = Array.from(this.matters.values());
      if (query.where?.status) {
        rows = rows.filter((matter) => matter.status === query.where?.status);
      }
      if (query.where?.opportunityId) {
        rows = rows.filter((matter) => matter.opportunityId === query.where?.opportunityId);
      }
      rows = this.sortByCreatedAt(rows, query.orderBy?.createdAt ?? 'desc');
      return rows.slice(0, query.take ?? rows.length).map((matter) => this.hydrateMatter(matter));
    },
    findFirst: async (query: { where?: { opportunityId?: string }; orderBy?: { createdAt?: 'desc' | 'asc' }; take?: number }) => {
      const rows = await this.matter.findMany(query as any);
      return rows[0] ?? null;
    },
    count: async () => this.matters.size,
  };

  private sortByCreatedAt<T extends { createdAt: Date }>(rows: T[], direction: 'desc' | 'asc') {
    return [...rows].sort((a, b) => {
      const delta = a.createdAt.getTime() - b.createdAt.getTime();
      return direction === 'desc' ? -delta : delta;
    });
  }

  private hydrateClient(client: ClientRecord) {
    const clientMatters = Array.from(this.matters.values()).filter((matter) => matter.clientId === client.id);
    const clientOpportunities = Array.from(this.opportunities.values()).filter((opportunity) => opportunity.clientId === client.id);
    const clientKycRecords = Array.from(this.kycRecords.values()).filter((record) => record.clientId === client.id);
    return {
      ...client,
      contacts: [],
      kycRecords: this.sortByCreatedAt(clientKycRecords, 'desc'),
      opportunities: this.sortByCreatedAt(clientOpportunities, 'desc').map((opportunity) => this.hydrateOpportunity(opportunity)),
      matters: this.sortByCreatedAt(clientMatters, 'desc').map((matter) => this.hydrateMatter(matter)),
    };
  }

  private hydrateOpportunity(opportunity: OpportunityRecord) {
    const client = this.clients.get(opportunity.clientId);
    const conflictRecords = Array.from(this.audit.entries)
      .filter((entry) => entry.entityType === 'conflict_record' && entry.entityId === opportunity.id);
    const relatedMatters = Array.from(this.matters.values()).filter((matter) => matter.opportunityId === opportunity.id);
    return {
      ...opportunity,
      client: client
        ? {
            id: client.id,
            name: client.name,
            kycStatus: client.kycStatus,
          }
        : null,
      conflictRecords,
      matters: this.sortByCreatedAt(relatedMatters, 'desc').map((matter) => this.hydrateMatter(matter)),
    };
  }

  private hydrateMatter(matter: MatterRecord) {
    const client = this.clients.get(matter.clientId);
    const opportunity = this.opportunities.get(matter.opportunityId);
    return {
      ...matter,
      client: client
        ? {
            id: client.id,
            name: client.name,
            kycStatus: client.kycStatus,
          }
        : null,
      opportunity: opportunity
        ? {
            id: opportunity.id,
            leadId: opportunity.leadId,
            name: opportunity.name,
            stage: opportunity.stage,
            conflictCheckStatus: opportunity.conflictCheckStatus,
            kycStatus: opportunity.kycStatus,
            clientId: opportunity.clientId,
          }
        : null,
    };
  }
}

describe('Phase 0 backend stabilization (e2e)', () => {
  let app: INestApplication;
  let prisma: InMemoryPrismaService;
  let adminToken: string;

  async function bootstrapApp() {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.local', '.env'],
        }),
        PrismaModule,
        AuditModule,
        AuthModule,
        ClientsModule,
        KycModule,
        LeadsModule,
        OpportunitiesModule,
        MattersModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(new InMemoryPrismaService())
      .overrideProvider(AuditService)
      .useValue(new InMemoryAuditService())
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(helmet());
    app.setGlobalPrefix('api', { exclude: ['health'] });
    const reflector = new Reflector();
    app.useGlobalGuards(new JwtAuthGuard(reflector), new RolesGuard(reflector));
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService) as unknown as InMemoryPrismaService;
  }

  async function loginAs(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    return res.body;
  }

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

  beforeAll(async () => {
    await bootstrapApp();
    const { accessToken } = await loginAs('admin@albasti.dev', 'Admin123!');
    adminToken = accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('qualifies a lead against an existing client when clientId is provided', async () => {
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@albasti.dev' },
    });
    expect(adminUser).toBeDefined();

    const existingClientName = uniqueName('Existing client');
    const existingClient = await prisma.client.create({
      data: {
        name: existingClientName,
        clientType: 'company',
        createdBy: adminUser!.id,
        updatedBy: adminUser!.id,
      },
    });

    const lead = await request(app.getHttpServer())
      .post('/api/leads')
      .set(auth())
      .send({
        subject: 'Existing client qualification',
        caseType: 'commercial',
        jurisdiction: 'difc',
        urgency: 'standard',
        caseSummary: 'Qualification should reuse the selected client record.',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/leads/${lead.body.id}/qualify`)
      .set(auth())
      .send({
        clientId: existingClient.id,
        clientName: 'Ignored name',
      })
      .expect(201);

    expect(res.body.clientId).toBe(existingClient.id);
    expect(res.body.opportunity.clientId).toBe(existingClient.id);

    const matchingClients = await prisma.client.findMany({
      where: { name: existingClientName },
    });
    expect(matchingClients).toHaveLength(1);
  });

  it('qualifies a lead using payload client details and carries relationships through the workflow', async () => {
    const payloadClientName = uniqueName('Payload client');

    const lead = await request(app.getHttpServer())
      .post('/api/leads')
      .set(auth())
      .send({
        subject: 'Payload driven qualification',
        caseType: 'litigation',
        jurisdiction: 'adgm',
        urgency: 'urgent',
        caseSummary: 'Qualification should create a new client from payload values.',
      })
      .expect(201);

    const qualified = await request(app.getHttpServer())
      .post(`/api/leads/${lead.body.id}/qualify`)
      .set(auth())
      .send({
        clientName: payloadClientName,
        clientType: 'company',
      })
      .expect(201);

    expect(qualified.body.lead.status).toBe('converted');
    expect(qualified.body.opportunity.name).toBe('Payload driven qualification');
    expect(qualified.body.clientId).toBeDefined();

    const createdClient = await prisma.client.findUnique({
      where: { id: qualified.body.clientId },
    });
    expect(createdClient?.name).toBe(payloadClientName);

    const kycRecord = await request(app.getHttpServer())
      .post('/api/kyc')
      .set(auth())
      .send({
        clientId: qualified.body.clientId,
        verificationType: 'corporate',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/kyc/${kycRecord.body.id}`)
      .set(auth())
      .send({ status: 'verified' })
      .expect(200);

    const clientAfterKyc = await prisma.client.findUnique({
      where: { id: qualified.body.clientId },
    });
    expect(clientAfterKyc?.kycStatus).toBe('verified');

    const opportunityAfterKyc = await request(app.getHttpServer())
      .get(`/api/opportunities/${qualified.body.opportunity.id}`)
      .set(auth())
      .expect(200);
    expect(opportunityAfterKyc.body.kycStatus).toBe('verified');

    await request(app.getHttpServer())
      .patch(`/api/opportunities/${qualified.body.opportunity.id}`)
      .set(auth())
      .send({ conflictCheckStatus: 'cleared' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/opportunities/${qualified.body.opportunity.id}/stage`)
      .set(auth())
      .send({ stage: 'won' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/opportunities/${qualified.body.opportunity.id}/stage`)
      .set(auth())
      .send({ stage: 'won' })
      .expect(200);

    const opportunityList = await request(app.getHttpServer())
      .get('/api/opportunities')
      .set(auth())
      .expect(200);

    const createdOpportunity = opportunityList.body.find(
      (opp: any) => opp.id === qualified.body.opportunity.id,
    );
    expect(createdOpportunity?.client?.id).toBe(qualified.body.clientId);
    expect(createdOpportunity?.client?.name).toBe(payloadClientName);

    const matterList = await request(app.getHttpServer())
      .get('/api/matters')
      .set(auth())
      .expect(200);

    const createdMatter = matterList.body.find(
      (matter: any) => matter.opportunityId === qualified.body.opportunity.id,
    );
    expect(matterList.body.filter((matter: any) => matter.opportunityId === qualified.body.opportunity.id)).toHaveLength(1);
    expect(createdMatter?.client?.id).toBe(qualified.body.clientId);
    expect(createdMatter?.opportunity?.id).toBe(qualified.body.opportunity.id);
    expect(createdMatter?.opportunity?.leadId).toBe(qualified.body.opportunity.leadId);

    const clientDetail = await request(app.getHttpServer())
      .get(`/api/clients/${qualified.body.clientId}`)
      .set(auth())
      .expect(200);

    expect(Array.isArray(clientDetail.body.opportunities)).toBe(true);
    expect(Array.isArray(clientDetail.body.matters)).toBe(true);
    expect(clientDetail.body.opportunities.some((opp: any) => opp.id === qualified.body.opportunity.id)).toBe(true);
    expect(clientDetail.body.matters.some((matter: any) => matter.opportunityId === qualified.body.opportunity.id)).toBe(true);
  });
});
