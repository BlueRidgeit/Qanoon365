import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

const STAGE_ORDER = ['inquiry', 'consultation', 'proposal', 'retainer', 'won', 'lost'];

@Injectable()
export class OpportunitiesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(data: {
    clientId: string;
    name: string;
    practiceArea: string;
    assignedPartner: string;
    leadId?: string;
    engagementType?: string;
    estimatedValue?: number;
  }, userId: string) {
    const opp = await this.prisma.opportunity.create({
      data: { ...data, createdBy: userId, updatedBy: userId },
    });
    await this.audit.log({
      entityType: 'opportunity', entityId: opp.id,
      action: 'create', performedBy: userId,
    });
    return opp;
  }

  async findAll(params: { cursor?: string; limit?: number; stage?: string }) {
    const limit = params.limit ?? 20;
    const where: any = {};
    if (params.stage) where.stage = params.stage;
    const query: any = {
      where,
      orderBy: { createdAt: 'desc' as const },
      take: limit,
      include: {
        client: { select: { id: true, name: true, kycStatus: true } },
      },
    };
    if (params.cursor) { query.cursor = { id: params.cursor }; query.skip = 1; }
    return this.prisma.opportunity.findMany(query);
  }

  async findOne(id: string) {
    const opp = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        conflictRecords: true,
        client: { select: { id: true, name: true, kycStatus: true } },
        matters: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');
    return opp;
  }

  async update(id: string, data: Record<string, any>, userId: string) {
    await this.findOne(id);
    const opp = await this.prisma.opportunity.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });
    await this.audit.log({
      entityType: 'opportunity', entityId: id,
      action: 'update', performedBy: userId,
    });
    return opp;
  }

  async transitionStage(id: string, newStage: string, userId: string, userRole: string) {
    let oldStageForAudit: string | null = null;
    let newStageForAudit: string | null = null;
    let matterCreated = false;

    const result = await this.prisma.$transaction(async (tx) => {
      const opp = await tx.opportunity.findUnique({
        where: { id },
        include: {
          conflictRecords: true,
          client: { select: { id: true, name: true, kycStatus: true } },
          matters: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!opp) throw new NotFoundException('Opportunity not found');

      const oldStage = opp.stage;

      if (!STAGE_ORDER.includes(newStage)) {
        throw new BadRequestException(`Invalid stage: ${newStage}`);
      }

      // Gate: proposal requires conflict cleared
      if (newStage === 'proposal' && opp.conflictCheckStatus !== 'cleared') {
        throw new BadRequestException('Cannot advance to proposal: conflict check not cleared');
      }

      // Gate: retainer requires KYC verified
      if (newStage === 'retainer' && opp.client.kycStatus !== 'verified') {
        throw new BadRequestException('Cannot advance to retainer: client KYC not verified');
      }

      // Gate: won requires both conflict cleared and KYC verified
      if (newStage === 'won') {
        if (opp.conflictCheckStatus !== 'cleared') {
          throw new BadRequestException('Cannot mark as won: conflict check not cleared');
        }
        if (opp.client.kycStatus !== 'verified') {
          throw new BadRequestException('Cannot mark as won: client KYC not verified');
        }
      }

      if (oldStage === newStage) {
        if (newStage === 'won') {
          const matter = await this.ensureMatterForOpportunity(tx, opp, userId);
          matterCreated = matter.created;
        }
        return opp;
      }

      const updateData: any = { stage: newStage, updatedBy: userId };
      if (newStage === 'won' || newStage === 'lost') {
        updateData.closedAt = new Date();
      }

      const updated = await tx.opportunity.update({
        where: { id },
        data: updateData,
      });

      oldStageForAudit = oldStage;
      newStageForAudit = newStage;

      if (newStage === 'won') {
        const matter = await this.ensureMatterForOpportunity(tx, { ...opp, ...updated }, userId);
        matterCreated = matter.created;
      }

      return updated;
    });

    if (oldStageForAudit && newStageForAudit) {
      await this.audit.log({
        entityType: 'opportunity',
        entityId: id,
        action: 'stage_change',
        performedBy: userId,
        fieldChanged: 'stage',
        oldValue: oldStageForAudit,
        newValue: newStageForAudit,
      });
    }

    if (matterCreated) {
      const matter = await this.prisma.matter.findFirst({
        where: { opportunityId: id },
        orderBy: { createdAt: 'desc' as const },
      });
      if (matter) {
        await this.audit.log({
          entityType: 'matter',
          entityId: matter.id,
          action: 'create',
          performedBy: userId,
        });
      }
    }

    return result;
  }

  private async ensureMatterForOpportunity(tx: any, opp: any, userId: string) {
    const existing = await tx.matter.findMany({
      where: { opportunityId: opp.id },
      orderBy: { createdAt: 'desc' as const },
      take: 1,
    });

    if (existing.length > 0) {
      return { matter: existing[0], created: false };
    }

    const year = new Date().getFullYear();
    const count = await tx.matter.count();
    const matterNumber = `MAT-${year}-${String(count + 1).padStart(4, '0')}`;

    const matter = await tx.matter.create({
      data: {
        matterNumber,
        name: opp.name,
        clientId: opp.clientId,
        opportunityId: opp.id,
        practiceArea: opp.practiceArea,
        leadPartner: opp.assignedPartner,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return { matter, created: true };
  }
}
