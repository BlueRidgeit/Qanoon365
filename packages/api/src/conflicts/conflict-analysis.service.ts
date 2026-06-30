import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

export interface DetectedConflict {
  matchedEntityType: 'client' | 'matter' | 'court_party';
  matchedEntityId: string;
  matchedEntityName: string;
  matchSource: 'crm_data' | 'court_records' | 'both';
  matchConfidence: 'high' | 'medium' | 'low';
  confidenceScore: number;
  matchField: string;
  relationshipPath: string;
  courtCaseReference?: string;
  relatedMatterId?: string;
}

const SYSTEM_PROMPT = `You are a conflict-of-interest analyst at a UAE law firm.
Your task is to identify potential conflicts between a new engagement and existing clients, matters, and court records.

CRITICAL RULES:
- Flag ANY potential connection, even indirect ones (parent companies, subsidiaries, directors)
- Consider Arabic name transliterations and spelling variants
- Rate confidence honestly: high (>0.8), medium (0.5-0.8), low (<0.5)
- Provide clear relationship paths explaining HOW the conflict exists
- Never fabricate connections — only flag what the data supports
- Be conservative: when in doubt, flag it for human review`;

@Injectable()
export class ConflictAnalysisService {
  private readonly logger = new Logger(ConflictAnalysisService.name);
  private client: AzureOpenAI | null = null;
  private deploymentName: string;
  private analysisMode: string;

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
  ) {
    this.analysisMode = this.config.get<string>('CONFLICT_ANALYSIS_MODE', 'live');
    this.deploymentName = this.config.get<string>('AZURE_OPENAI_DEPLOYMENT', 'gpt-4o');

    if (this.analysisMode === 'mock_clear') {
      this.logger.warn('Conflict analysis is running in mock_clear mode');
      return;
    }

    const endpoint = this.config.getOrThrow<string>('AZURE_OPENAI_ENDPOINT');
    const apiKey = this.config.getOrThrow<string>('AZURE_OPENAI_API_KEY');
    const apiVersion = this.config.get<string>('AZURE_OPENAI_API_VERSION', '2024-12-01-preview');

    this.client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  }

  /**
   * Run automatic conflict analysis for an opportunity.
   * Checks the opportunity's parties against existing CRM data and court records.
   */
  async analyzeOpportunity(opportunityId: string, userId: string) {
    this.logger.log(`Starting auto conflict analysis for opportunity ${opportunityId}`);

    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { client: true },
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');

    const detected =
      this.analysisMode === 'mock_clear'
        ? []
        : await this.runConflictDetection(opportunity);

    // Create conflict records
    let created = 0;
    for (const conflict of detected) {
      await this.prisma.conflictRecord.create({
        data: {
          opportunityId,
          matchedEntityType: conflict.matchedEntityType,
          matchedEntityId: conflict.matchedEntityId,
          matchSource: conflict.matchSource,
          matchConfidence: conflict.matchConfidence,
          confidenceScore: conflict.confidenceScore,
          matchField: conflict.matchField,
          relationshipPath: conflict.relationshipPath,
          courtCaseReference: conflict.courtCaseReference,
          relatedMatterId: conflict.relatedMatterId,
        },
      });
      created++;
    }

    // Update opportunity conflict status
    const newStatus = detected.length > 0 ? 'in_progress' : 'cleared';
    await this.prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        conflictCheckStatus: newStatus,
        conflictApprovedBy: newStatus === 'cleared' ? userId : undefined,
      },
    });

    await this.audit.log({
      entityType: 'opportunity',
      entityId: opportunityId,
      action: 'auto_conflict_check',
      performedBy: userId,
      fieldChanged: 'conflictCheckStatus',
      newValue: newStatus,
    });

    this.logger.log(
      `Conflict analysis complete for ${opportunityId}: ${detected.length} potential conflicts found`,
    );

    return {
      opportunityId,
      conflictsDetected: detected.length,
      newStatus,
      conflicts: detected,
    };
  }

  private async runConflictDetection(opportunity: any): Promise<DetectedConflict[]> {
    const context = await this.gatherConflictContext(opportunity);
    return this.runAiAnalysis(opportunity, context);
  }

  private async gatherConflictContext(opportunity: any) {
    // 1. Get all existing clients
    const existingClients = await this.prisma.client.findMany({
      select: { id: true, name: true, clientType: true, industry: true },
      take: 200,
    });

    // 2. Get active matters
    const activeMatters = await this.prisma.matter.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, matterNumber: true, clientId: true, practiceArea: true },
      take: 200,
    });

    // 3. Get contacts (opposing counsel, etc.)
    const contacts = await this.prisma.contact.findMany({
      select: { id: true, firstName: true, lastName: true, jobTitle: true, clientId: true },
      take: 200,
    });

    // 4. Get court parties (if available)
    let courtParties: any[] = [];
    try {
      courtParties = await this.prisma.courtParty.findMany({
        select: { id: true, name: true, nameArabic: true, partyType: true },
        take: 200,
      });
    } catch {
      // Court tables may not exist in all environments
    }

    return { existingClients, activeMatters, contacts, courtParties };
  }

  private async runAiAnalysis(
    opportunity: any,
    context: any,
  ): Promise<DetectedConflict[]> {
    if (!this.client) {
      this.logger.warn('Conflict analysis client is unavailable; returning no conflicts');
      return [];
    }

    const contextMsg = this.buildContextMessage(opportunity, context);

    const userMessage = `Analyze the following new engagement for potential conflicts of interest.

## New Engagement
- Name: ${opportunity.name}
- Client: ${opportunity.client?.name ?? 'Unknown'}
- Practice Area: ${opportunity.practiceArea ?? 'N/A'}
- Jurisdiction: ${opportunity.jurisdiction ?? 'N/A'}

## Existing Firm Data
${contextMsg}

## Instructions
Identify ALL potential conflicts. For each, provide:
- Which existing entity conflicts (client, matter, or court party)
- The entity ID from the data above
- How the conflict exists (relationship path)
- Confidence score (0.0 to 1.0)

Respond with ONLY valid JSON:
{
  "conflicts": [
    {
      "matchedEntityType": "client|matter|court_party",
      "matchedEntityId": "the UUID from the data above",
      "matchedEntityName": "name of matched entity",
      "matchSource": "crm_data|court_records|both",
      "matchConfidence": "high|medium|low",
      "confidenceScore": 0.0,
      "matchField": "field that matched (e.g. client_name, practice_area)",
      "relationshipPath": "Explanation of why this is a conflict",
      "courtCaseReference": "case number if applicable or null",
      "relatedMatterId": "matter UUID if applicable or null"
    }
  ]
}

If no conflicts are detected, return: { "conflicts": [] }`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });

      const raw = response.choices[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);

      return (parsed.conflicts ?? []).map((c: any) => ({
        matchedEntityType: c.matchedEntityType ?? 'client',
        matchedEntityId: c.matchedEntityId ?? 'unknown',
        matchedEntityName: c.matchedEntityName ?? '',
        matchSource: c.matchSource ?? 'crm_data',
        matchConfidence: c.matchConfidence ?? 'low',
        confidenceScore: typeof c.confidenceScore === 'number' ? c.confidenceScore : 0.3,
        matchField: c.matchField ?? 'unknown',
        relationshipPath: c.relationshipPath ?? 'AI-detected potential conflict',
        courtCaseReference: c.courtCaseReference || undefined,
        relatedMatterId: c.relatedMatterId || undefined,
      }));
    } catch (error: any) {
      this.logger.error(`AI conflict analysis failed: ${error.message}`);
      return [];
    }
  }

  private buildContextMessage(opportunity: any, context: any): string {
    const parts: string[] = [];

    if (context.existingClients.length > 0) {
      parts.push(`### Existing Clients (${context.existingClients.length})`);
      for (const c of context.existingClients) {
        parts.push(`- [${c.id}] ${c.name} (${c.clientType ?? 'N/A'}, ${c.industry ?? 'N/A'})`);
      }
    }

    if (context.activeMatters.length > 0) {
      parts.push(`\n### Active Matters (${context.activeMatters.length})`);
      for (const m of context.activeMatters) {
        parts.push(`- [${m.id}] ${m.matterNumber}: ${m.name} (Client: ${m.clientId}, Practice: ${m.practiceArea ?? 'N/A'})`);
      }
    }

    if (context.contacts.length > 0) {
      parts.push(`\n### Contacts (${context.contacts.length})`);
      for (const c of context.contacts) {
        parts.push(`- [${c.id}] ${c.firstName} ${c.lastName} — ${c.jobTitle ?? 'N/A'} (linked to client: ${c.clientId ?? 'none'})`);
      }
    }

    if (context.courtParties.length > 0) {
      parts.push(`\n### Court Parties (${context.courtParties.length})`);
      for (const p of context.courtParties) {
        parts.push(`- [${p.id}] ${p.name} (Arabic: ${p.nameArabic ?? 'N/A'}) — ${p.partyType}`);
      }
    }

    return parts.join('\n') || 'No existing data available.';
  }
}
