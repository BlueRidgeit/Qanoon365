import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  COURT_INTEL_PROVIDER,
  CourtIntelQuery,
  CourtIntelResult,
} from './court-intel.provider.js';
import type { ICourtIntelProvider } from './court-intel.provider.js';

@Injectable()
export class CourtIntelService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Inject(COURT_INTEL_PROVIDER) private provider: ICourtIntelProvider,
  ) {}

  async executeQuery(
    input: {
      queryType: 'party_intelligence' | 'comparable_case' | 'contextual_case_law' | 'opposing_counsel';
      partyName?: string;
      caseType?: string;
      jurisdiction?: string;
      practiceArea?: string;
      firmName?: string;
      lawyerName?: string;
      keywords?: string;
      matterId?: string;
      opportunityId?: string;
      clientId?: string;
    },
    userId: string,
  ): Promise<CourtIntelResult> {
    // 1. Gather DB context based on query type
    const dbContext = await this.gatherContext(input);

    // 2. Build the query for the LLM provider
    const query: CourtIntelQuery = {
      queryType: input.queryType,
      dbContext,
      queryInput: input,
    };

    // 3. Call the LLM provider
    const result = await this.provider.analyze(query);

    // 4. Store the query + result in court_intel_queries table
    const saved = await this.prisma.courtIntelQuery.create({
      data: {
        queryType: input.queryType,
        sourceEntityType: input.matterId
          ? 'matter'
          : input.opportunityId
            ? 'opportunity'
            : input.clientId
              ? 'client'
              : null,
        sourceEntityId: input.matterId ?? input.opportunityId ?? input.clientId ?? null,
        queryInput: input as any,
        resultSummary: result.summary,
        resultData: result as any,
        executedBy: userId,
      },
    });

    await this.audit.log({
      entityType: 'court_intel_query',
      entityId: saved.id,
      action: 'create',
      performedBy: userId,
    });

    return result;
  }

  async getQueryHistory(entityType?: string, entityId?: string) {
    const where: any = {};
    if (entityType) where.sourceEntityType = entityType;
    if (entityId) where.sourceEntityId = entityId;
    return this.prisma.courtIntelQuery.findMany({
      where,
      orderBy: { executedAt: 'desc' },
      take: 50,
    });
  }

  // ── DB Context Gathering ─────────────────────────────────────

  private async gatherContext(input: {
    queryType: string;
    partyName?: string;
    caseType?: string;
    jurisdiction?: string;
    practiceArea?: string;
    firmName?: string;
    lawyerName?: string;
    keywords?: string;
    matterId?: string;
    opportunityId?: string;
    clientId?: string;
  }) {
    const courtCases: any[] = [];
    const parties: any[] = [];
    const relatedMatters = new Map<string, any>();
    const relatedOpportunities = new Map<string, any>();
    const relatedClients = new Map<string, any>();
    let referenceLead: any | null = null;

    const addMatter = (matter?: any | null) => {
      if (matter?.id) {
        relatedMatters.set(matter.id, matter);
      }
    };

    const addOpportunity = (opportunity?: any | null) => {
      if (opportunity?.id) {
        relatedOpportunities.set(opportunity.id, opportunity);
      }
    };

    const addClient = (client?: any | null) => {
      if (client?.id) {
        relatedClients.set(client.id, client);
      }
    };

    if (input.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: input.clientId },
        select: {
          id: true,
          name: true,
          clientType: true,
          industry: true,
          kycStatus: true,
          riskRating: true,
        },
      });
      addClient(client);

      const [clientMatters, clientOpportunities] = await Promise.all([
        this.prisma.matter.findMany({
          where: { clientId: input.clientId },
          select: {
            id: true,
            matterNumber: true,
            name: true,
            status: true,
            practiceArea: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
        this.prisma.opportunity.findMany({
          where: { clientId: input.clientId },
          select: {
            id: true,
            name: true,
            stage: true,
            conflictCheckStatus: true,
            practiceArea: true,
            estimatedValue: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 5,
        }),
      ]);

      for (const matter of clientMatters) addMatter(matter);
      for (const opportunity of clientOpportunities) addOpportunity(opportunity);
    }

    if (input.opportunityId) {
      const opportunity = await this.prisma.opportunity.findUnique({
        where: { id: input.opportunityId },
        include: { client: true },
      });
      addOpportunity(opportunity);
      addClient(opportunity?.client);

      if (opportunity?.leadId) {
        referenceLead = await this.prisma.lead.findUnique({
          where: { id: opportunity.leadId },
          select: {
            id: true,
            subject: true,
            caseType: true,
            jurisdiction: true,
          },
        });
      }
    }

    if (input.matterId) {
      const matter = await this.prisma.matter.findUnique({
        where: { id: input.matterId },
        include: {
          client: true,
          opportunity: true,
        },
      });
      addMatter(matter);
      addClient(matter?.client);
      addOpportunity(matter?.opportunity);

      if (matter?.opportunity?.leadId) {
        referenceLead = await this.prisma.lead.findUnique({
          where: { id: matter.opportunity.leadId },
          select: {
            id: true,
            subject: true,
            caseType: true,
            jurisdiction: true,
          },
        });
      }
    }

    const effectivePartyName =
      input.partyName ?? Array.from(relatedClients.values())[0]?.name;
    const effectiveCaseType =
      input.caseType ??
      referenceLead?.caseType ??
      Array.from(relatedMatters.values())[0]?.practiceArea ??
      Array.from(relatedOpportunities.values())[0]?.practiceArea;
    const effectiveJurisdiction =
      input.jurisdiction ?? referenceLead?.jurisdiction;
    const effectivePracticeArea =
      input.practiceArea ??
      Array.from(relatedMatters.values())[0]?.practiceArea ??
      Array.from(relatedOpportunities.values())[0]?.practiceArea;

    switch (input.queryType) {
      case 'party_intelligence':
        if (effectivePartyName) {
          const matched = await this.fuzzyMatchParties(effectivePartyName);
          parties.push(...matched);
          const cases = await this.getCasesForParties(matched.map((p: any) => p.id));
          courtCases.push(...cases);
        }
        break;

      case 'comparable_case':
        if (effectiveCaseType || effectiveJurisdiction) {
          const cases = await this.searchCases(effectiveCaseType, effectiveJurisdiction);
          courtCases.push(...cases);
        }
        break;

      case 'contextual_case_law':
        if (effectivePracticeArea || effectiveCaseType || effectiveJurisdiction) {
          const cases = await this.searchCases(
            effectiveCaseType ?? effectivePracticeArea,
            effectiveJurisdiction,
          );
          courtCases.push(...cases);
        }
        break;

      case 'opposing_counsel':
        if (input.firmName || input.lawyerName) {
          const cases = await this.searchByRepresentation(input.firmName, input.lawyerName);
          courtCases.push(...cases);
          // Extract unique parties from these cases
          for (const c of cases) {
            for (const p of c.parties ?? []) {
              if (p.courtParty && !parties.find((x: any) => x.id === p.courtParty.id)) {
                parties.push(p.courtParty);
              }
            }
          }
        }
        break;
    }

    return {
      courtCases,
      parties,
      relatedMatters: Array.from(relatedMatters.values()),
      relatedOpportunities: Array.from(relatedOpportunities.values()),
      relatedClients: Array.from(relatedClients.values()),
    };
  }

  /**
   * Fuzzy match party names using pg_trgm similarity.
   * Falls back to ILIKE if trigram extension isn't available.
   */
  private async fuzzyMatchParties(name: string): Promise<any[]> {
    try {
      // Use pg_trgm similarity for fuzzy matching (threshold 0.3)
      const results = await this.prisma.$queryRawUnsafe(`
        SELECT *, similarity(name, $1) AS sim_score
        FROM public.court_parties
        WHERE similarity(name, $1) > 0.3
           OR similarity(COALESCE(name_normalized, ''), $1) > 0.3
           OR similarity(COALESCE(name_arabic, ''), $1) > 0.2
        ORDER BY similarity(name, $1) DESC
        LIMIT 20
      `, name);
      return results as any[];
    } catch {
      // Fallback to ILIKE
      return this.prisma.courtParty.findMany({
        where: {
          OR: [
            { name: { contains: name, mode: 'insensitive' as any } },
            { nameNormalized: { contains: name, mode: 'insensitive' as any } },
          ],
        },
        take: 20,
      });
    }
  }

  private async getCasesForParties(partyIds: string[]): Promise<any[]> {
    if (partyIds.length === 0) return [];

    return this.prisma.courtCase.findMany({
      where: {
        parties: {
          some: { courtPartyId: { in: partyIds } },
        },
      },
      include: {
        parties: {
          include: { courtParty: true },
        },
      },
      orderBy: { filingDate: 'desc' },
      take: 30,
    });
  }

  private async searchCases(caseType?: string, jurisdiction?: string): Promise<any[]> {
    const where: any = {};
    if (caseType) where.caseType = { contains: caseType, mode: 'insensitive' };
    if (jurisdiction) where.jurisdiction = { contains: jurisdiction, mode: 'insensitive' };

    return this.prisma.courtCase.findMany({
      where,
      include: {
        parties: {
          include: { courtParty: true },
        },
      },
      orderBy: { filingDate: 'desc' },
      take: 30,
    });
  }

  private async searchByRepresentation(firmName?: string, lawyerName?: string): Promise<any[]> {
    const where: any = {};
    if (firmName) where.representingFirm = { contains: firmName, mode: 'insensitive' };
    if (lawyerName) where.representingLawyer = { contains: lawyerName, mode: 'insensitive' };

    const caseParties = await this.prisma.courtCaseParty.findMany({
      where,
      include: {
        courtCase: {
          include: {
            parties: {
              include: { courtParty: true },
            },
          },
        },
        courtParty: true,
      },
      take: 30,
    });

    // Deduplicate cases
    const seen = new Set<string>();
    const cases: any[] = [];
    for (const cp of caseParties) {
      if (!seen.has(cp.courtCaseId)) {
        seen.add(cp.courtCaseId);
        cases.push(cp.courtCase);
      }
    }
    return cases;
  }
}
