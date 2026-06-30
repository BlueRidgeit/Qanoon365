import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class ConflictsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(data: {
    opportunityId: string;
    matchedEntityType: string;
    matchedEntityId: string;
    matchSource: string;
    matchConfidence: string;
    confidenceScore?: number;
    matchField?: string;
    relationshipPath?: string;
    courtCaseReference?: string;
    relatedMatterId?: string;
  }, userId: string) {
    // Verify opportunity exists
    const opp = await this.prisma.opportunity.findUnique({ where: { id: data.opportunityId } });
    if (!opp) throw new NotFoundException('Opportunity not found');

    const record = await this.prisma.conflictRecord.create({
      data: {
        ...data,
        confidenceScore: data.confidenceScore ?? null,
      },
    });

    // Update opportunity conflict status to in_progress if not already
    if (opp.conflictCheckStatus === 'not_started') {
      await this.prisma.opportunity.update({
        where: { id: data.opportunityId },
        data: { conflictCheckStatus: 'in_progress' },
      });
    }

    await this.audit.log({
      entityType: 'conflict_record', entityId: record.id,
      action: 'create', performedBy: userId,
    });

    return record;
  }

  async findAll(opportunityId?: string) {
    const where: any = {};
    if (opportunityId) where.opportunityId = opportunityId;
    return this.prisma.conflictRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { opportunity: { select: { id: true, name: true, stage: true } } },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.conflictRecord.findUnique({
      where: { id },
      include: { opportunity: { select: { id: true, name: true, stage: true, clientId: true } } },
    });
    if (!record) throw new NotFoundException('Conflict record not found');
    return record;
  }

  async resolve(id: string, data: {
    resolutionStatus: string;
    resolutionNotes?: string;
  }, userId: string, userRole: string) {
    // Only partner or compliance can resolve conflicts
    if (!['admin', 'partner', 'compliance'].includes(userRole)) {
      throw new ForbiddenException('Only Partner or Compliance can resolve conflicts');
    }

    const record = await this.findOne(id);

    if (record.resolutionStatus !== 'pending') {
      throw new BadRequestException('Conflict record is already resolved');
    }

    if (data.resolutionStatus === 'waived' && (!data.resolutionNotes || data.resolutionNotes.trim().length === 0)) {
      throw new BadRequestException('Resolution notes are required when waiving a conflict');
    }

    const updated = await this.prisma.conflictRecord.update({
      where: { id },
      data: {
        resolutionStatus: data.resolutionStatus,
        resolutionNotes: data.resolutionNotes,
        resolvedBy: userId,
        resolvedAt: new Date(),
      },
    });

    await this.audit.log({
      entityType: 'conflict_record', entityId: id,
      action: 'conflict_resolve', performedBy: userId,
      fieldChanged: 'resolutionStatus', oldValue: 'pending', newValue: data.resolutionStatus,
    });

    // Check if all conflicts for this opportunity are resolved
    // If all cleared/waived, update opportunity conflict_check_status to cleared
    await this.updateOpportunityConflictStatus(record.opportunityId, userId);

    return updated;
  }

  private async updateOpportunityConflictStatus(opportunityId: string, userId: string) {
    const allRecords = await this.prisma.conflictRecord.findMany({
      where: { opportunityId },
    });

    if (allRecords.length === 0) return;

    const hasUnresolved = allRecords.some(r => r.resolutionStatus === 'pending');
    const hasConfirmed = allRecords.some(r => r.resolutionStatus === 'confirmed_conflict');

    let newStatus: string;
    if (hasConfirmed) {
      newStatus = 'conflict_identified';
    } else if (hasUnresolved) {
      newStatus = 'in_progress';
    } else {
      // All cleared or waived
      newStatus = 'cleared';
    }

    await this.prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        conflictCheckStatus: newStatus,
        conflictApprovedBy: newStatus === 'cleared' ? userId : undefined,
      },
    });
  }
}
