import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class AppealDeadlinesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getStats() {
    const today = new Date();
    const [byStatus, byType, total] = await Promise.all([
      this.prisma.appealDeadline.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.appealDeadline.groupBy({
        by: ['appealType'],
        _count: { id: true },
      }),
      this.prisma.appealDeadline.count(),
    ]);

    const upcoming = await this.prisma.appealDeadline.count({
      where: {
        status: { in: ['upcoming', 'warning', 'critical'] },
        deadlineDate: { gte: today },
      },
    });

    const missed = await this.prisma.appealDeadline.count({
      where: { status: 'missed' },
    });

    return {
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
      byType: Object.fromEntries(byType.map((t) => [t.appealType, t._count.id])),
      total,
      upcoming,
      missed,
    };
  }

  async getUrgent(days?: number) {
    const withinDays = days ?? 7;
    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(today.getDate() + withinDays);

    return this.prisma.appealDeadline.findMany({
      where: {
        status: { in: ['upcoming', 'warning', 'critical'] },
        deadlineDate: { gte: today, lte: cutoff },
      },
      orderBy: { deadlineDate: 'asc' },
      include: { matter: true },
    });
  }

  async create(
    data: {
      matterId?: string;
      fileNumber?: string;
      caseNumber?: string;
      clientName?: string;
      clientNameArabic?: string;
      court?: string;
      judgmentDate: string;
      appealType: string;
      appealPeriodDays: number;
      deadlineDate: string;
      status?: string;
      filedDate?: string;
      assignedTo?: string;
      reminderDays?: number;
      notes?: string;
    },
    userId: string,
  ) {
    const deadline = await this.prisma.appealDeadline.create({
      data: {
        matterId: data.matterId,
        fileNumber: data.fileNumber,
        caseNumber: data.caseNumber,
        clientName: data.clientName,
        clientNameArabic: data.clientNameArabic,
        court: data.court,
        judgmentDate: new Date(data.judgmentDate),
        appealType: data.appealType,
        appealPeriodDays: data.appealPeriodDays,
        deadlineDate: new Date(data.deadlineDate),
        status: data.status ?? 'upcoming',
        filedDate: data.filedDate ? new Date(data.filedDate) : undefined,
        assignedTo: data.assignedTo,
        reminderDays: data.reminderDays ?? 7,
        notes: data.notes,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.audit.log({
      entityType: 'appeal_deadline',
      entityId: deadline.id,
      action: 'create',
      performedBy: userId,
    });

    return deadline;
  }

  async findAll(params: {
    status?: string;
    appealType?: string;
    court?: string;
    assignedTo?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = params.limit ?? 50;
    const where: any = {};

    if (params.status) where.status = params.status;
    if (params.appealType) where.appealType = params.appealType;
    if (params.court) where.court = params.court;
    if (params.assignedTo) where.assignedTo = params.assignedTo;
    if (params.search) {
      where.OR = [
        { fileNumber: { contains: params.search, mode: 'insensitive' } },
        { caseNumber: { contains: params.search, mode: 'insensitive' } },
        { clientName: { contains: params.search, mode: 'insensitive' } },
        { clientNameArabic: { contains: params.search, mode: 'insensitive' } },
        { court: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const query: any = {
      where,
      orderBy: { deadlineDate: 'asc' as const },
      take: limit,
      include: { matter: true },
    };
    if (params.cursor) {
      query.cursor = { id: params.cursor };
      query.skip = 1;
    }

    return this.prisma.appealDeadline.findMany(query);
  }

  async findOne(id: string) {
    const deadline = await this.prisma.appealDeadline.findUnique({
      where: { id },
      include: { matter: true },
    });
    if (!deadline) throw new NotFoundException('Appeal deadline not found');
    return deadline;
  }

  async update(id: string, data: Record<string, any>, userId: string) {
    await this.findOne(id);
    if (data.judgmentDate) data.judgmentDate = new Date(data.judgmentDate);
    if (data.deadlineDate) data.deadlineDate = new Date(data.deadlineDate);
    if (data.filedDate) data.filedDate = new Date(data.filedDate);

    const deadline = await this.prisma.appealDeadline.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });

    await this.audit.log({
      entityType: 'appeal_deadline',
      entityId: id,
      action: 'update',
      performedBy: userId,
    });

    return deadline;
  }

  async updateStatus(
    id: string,
    body: { status: string; filedDate?: string },
    userId: string,
  ) {
    const existing = await this.findOne(id);
    const data: any = { status: body.status, updatedBy: userId };
    if (body.filedDate) data.filedDate = new Date(body.filedDate);

    const deadline = await this.prisma.appealDeadline.update({
      where: { id },
      data,
    });

    await this.audit.log({
      entityType: 'appeal_deadline',
      entityId: id,
      action: 'stage_change',
      performedBy: userId,
      fieldChanged: 'status',
      oldValue: existing.status,
      newValue: body.status,
    });

    return deadline;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    await this.prisma.appealDeadline.delete({ where: { id } });

    await this.audit.log({
      entityType: 'appeal_deadline',
      entityId: id,
      action: 'delete',
      performedBy: userId,
    });

    return { deleted: true };
  }
}
