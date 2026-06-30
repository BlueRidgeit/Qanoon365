import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class FollowUpsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Follow-Up Rules ───────────────────────────────────────

  async createRule(
    data: {
      executionFileId: string;
      intervalDays?: number;
      courtContactId: string;
      templateLanguage?: string;
    },
    userId: string,
  ) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (data.intervalDays ?? 14));

    const rule = await this.prisma.followUpRule.create({
      data: {
        executionFileId: data.executionFileId,
        intervalDays: data.intervalDays ?? 14,
        courtContactId: data.courtContactId,
        templateLanguage: data.templateLanguage ?? 'both',
        nextFollowUpDate: nextDate,
      },
      include: { courtContact: true, executionFile: true },
    });
    await this.audit.log({
      entityType: 'execution_file',
      entityId: data.executionFileId,
      action: 'create',
      performedBy: userId,
      fieldChanged: 'followUpRule',
      newValue: `interval=${data.intervalDays ?? 14}d`,
    });
    return rule;
  }

  async getRule(executionFileId: string) {
    const rule = await this.prisma.followUpRule.findUnique({
      where: { executionFileId },
      include: { courtContact: true },
    });
    if (!rule) throw new NotFoundException('No follow-up rule for this execution file');
    return rule;
  }

  async updateRule(id: string, data: Record<string, any>, userId: string) {
    const rule = await this.prisma.followUpRule.update({
      where: { id },
      data,
      include: { courtContact: true },
    });
    await this.audit.log({
      entityType: 'execution_file',
      entityId: rule.executionFileId,
      action: 'update',
      performedBy: userId,
      fieldChanged: 'followUpRule',
    });
    return rule;
  }

  async deactivateRule(id: string, userId: string) {
    const rule = await this.prisma.followUpRule.update({
      where: { id },
      data: { isActive: false },
    });
    await this.audit.log({
      entityType: 'execution_file',
      entityId: rule.executionFileId,
      action: 'update',
      performedBy: userId,
      fieldChanged: 'followUpRule',
      newValue: 'deactivated',
    });
    return rule;
  }

  // ── Follow-Up Logs ────────────────────────────────────────

  async getLogs(params: { executionFileId?: string; status?: string; limit?: number }) {
    const where: any = {};
    if (params.executionFileId) where.executionFileId = params.executionFileId;
    if (params.status) where.status = params.status;

    return this.prisma.followUpLog.findMany({
      where,
      orderBy: { createdAt: 'desc' as const },
      take: params.limit ?? 50,
      include: { executionFile: { select: { fileNumber: true, court: true } } },
    });
  }

  // ── Court Contacts ────────────────────────────────────────

  async createCourtContact(data: {
    court: string;
    department?: string;
    contactName?: string;
    email: string;
    phone?: string;
  }) {
    return this.prisma.courtContact.create({ data });
  }

  async getCourtContacts() {
    return this.prisma.courtContact.findMany({
      where: { isActive: true },
      orderBy: { court: 'asc' as const },
    });
  }

  async updateCourtContact(id: string, data: Record<string, any>) {
    return this.prisma.courtContact.update({
      where: { id },
      data,
    });
  }

  async deactivateCourtContact(id: string) {
    return this.prisma.courtContact.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
