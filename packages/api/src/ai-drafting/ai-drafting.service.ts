import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import {
  AI_DRAFTING_PROVIDER,
} from './ai-drafting.provider.js';
import type {
  IAiDraftingProvider,
  DraftRequest,
  DraftResult,
  DraftTemplate,
} from './ai-drafting.provider.js';

const TEMPLATES: DraftTemplate[] = [
  {
    type: 'engagement_letter',
    name: 'Engagement Letter',
    description: 'Formal letter engaging the firm for legal services, including scope, fees, and terms.',
    supportedEntities: ['opportunity', 'matter'],
  },
  {
    type: 'legal_memo',
    name: 'Legal Memorandum',
    description: 'Internal research memorandum analyzing legal issues, facts, and recommendations.',
    supportedEntities: ['matter'],
  },
  {
    type: 'client_update',
    name: 'Client Update Letter',
    description: 'Progress update letter to the client summarizing recent activities and next steps.',
    supportedEntities: ['matter'],
  },
  {
    type: 'nda',
    name: 'Non-Disclosure Agreement',
    description: 'Standard NDA tailored to the matter jurisdiction and parties.',
    supportedEntities: ['matter', 'opportunity'],
  },
  {
    type: 'demand_letter',
    name: 'Demand Letter',
    description: 'Formal demand letter asserting a legal claim and requesting action.',
    supportedEntities: ['matter'],
  },
];

@Injectable()
export class AiDraftingService {
  private readonly logger = new Logger(AiDraftingService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    @Inject(AI_DRAFTING_PROVIDER) private provider: IAiDraftingProvider,
  ) {}

  getTemplates(): DraftTemplate[] {
    return TEMPLATES;
  }

  async generateDraft(request: DraftRequest, userId: string): Promise<DraftResult> {
    this.logger.log(`Generating ${request.templateType} draft for ${request.entityType}/${request.entityId}`);

    // Gather context from DB
    const context = await this.gatherContext(request);

    // Call AI provider
    const result = await this.provider.generateDraft(request, context);

    // Audit log
    await this.audit.log({
      entityType: request.entityType,
      entityId: request.entityId,
      action: 'ai_draft',
      performedBy: userId,
      fieldChanged: 'templateType',
      newValue: request.templateType,
    });

    this.logger.log(
      `Draft generated: ${result.suggestedFileName} (${result.metadata.tokensUsed} tokens, ${result.metadata.processingTimeMs}ms)`,
    );

    return result;
  }

  private async gatherContext(request: DraftRequest): Promise<Record<string, any>> {
    const context: Record<string, any> = {};

    if (request.entityType === 'matter') {
      const matter = await this.prisma.matter.findUnique({
        where: { id: request.entityId },
        include: {
          client: true,
        },
      });
      if (!matter) throw new NotFoundException(`Matter ${request.entityId} not found`);
      context.matter = matter;
      context.client = matter.client;

      // Fetch opportunity if linked
      if (matter.opportunityId) {
        context.opportunity = await this.prisma.opportunity.findUnique({
          where: { id: matter.opportunityId },
        });
      }

      // Fetch recent activities
      context.activities = await this.prisma.activity.findMany({
        where: {
          entityType: 'matter',
          entityId: request.entityId,
        },
        orderBy: { activityDate: 'desc' },
        take: 10,
      });

      // Fetch latest court intel if available
      const courtIntel = await this.prisma.courtIntelQuery.findFirst({
        where: {
          sourceEntityType: 'matter',
          sourceEntityId: request.entityId,
        },
        orderBy: { executedAt: 'desc' },
      });
      if (courtIntel) {
        context.courtIntel = courtIntel;
      }
    }

    if (request.entityType === 'opportunity') {
      const opportunity = await this.prisma.opportunity.findUnique({
        where: { id: request.entityId },
        include: {
          client: true,
        },
      });
      if (!opportunity) throw new NotFoundException(`Opportunity ${request.entityId} not found`);
      context.opportunity = opportunity;
      context.client = opportunity.client;

      // Fetch activities linked to the opportunity
      context.activities = await this.prisma.activity.findMany({
        where: {
          entityType: 'opportunity',
          entityId: request.entityId,
        },
        orderBy: { activityDate: 'desc' },
        take: 10,
      });
    }

    return context;
  }
}
