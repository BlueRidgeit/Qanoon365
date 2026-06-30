import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class CourtCalendarService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Court Hearings ────────────────────────────────────────

  async createHearing(
    data: {
      matterId: string;
      eventType: string;
      title: string;
      description?: string;
      court?: string;
      courtRoom?: string;
      judge?: string;
      caseNumber?: string;
      scheduledDate: string;
      scheduledEndDate?: string;
      location?: string;
      reminderDays?: number;
      assignedTo?: string;
    },
    userId: string,
  ) {
    const hearing = await this.prisma.courtHearing.create({
      data: {
        matterId: data.matterId,
        eventType: data.eventType,
        title: data.title,
        description: data.description,
        court: data.court,
        courtRoom: data.courtRoom,
        judge: data.judge,
        caseNumber: data.caseNumber,
        scheduledDate: new Date(data.scheduledDate),
        scheduledEndDate: data.scheduledEndDate
          ? new Date(data.scheduledEndDate)
          : undefined,
        location: data.location,
        reminderDays: data.reminderDays ?? 3,
        assignedTo: data.assignedTo,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.audit.log({
      entityType: 'court_hearing',
      entityId: hearing.id,
      action: 'create',
      performedBy: userId,
    });

    return hearing;
  }

  async findHearings(params: {
    matterId?: string;
    status?: string;
    from?: string;
    to?: string;
    assignedTo?: string;
  }) {
    const where: any = {};
    if (params.matterId) where.matterId = params.matterId;
    if (params.status) where.status = params.status;
    if (params.assignedTo) where.assignedTo = params.assignedTo;
    if (params.from || params.to) {
      where.scheduledDate = {};
      if (params.from) where.scheduledDate.gte = new Date(params.from);
      if (params.to) where.scheduledDate.lte = new Date(params.to);
    }

    return this.prisma.courtHearing.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
      include: {
        matter: {
          select: { id: true, matterNumber: true, name: true, clientId: true },
        },
      },
    });
  }

  async findOneHearing(id: string) {
    const hearing = await this.prisma.courtHearing.findUnique({
      where: { id },
      include: {
        matter: {
          select: { id: true, matterNumber: true, name: true, clientId: true },
        },
      },
    });
    if (!hearing) throw new NotFoundException('Court hearing not found');
    return hearing;
  }

  async updateHearing(id: string, data: Record<string, any>, userId: string) {
    await this.findOneHearing(id);
    const hearing = await this.prisma.courtHearing.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });
    await this.audit.log({
      entityType: 'court_hearing',
      entityId: id,
      action: 'update',
      performedBy: userId,
    });
    return hearing;
  }

  // ── Court Deadlines ───────────────────────────────────────

  async createDeadline(
    data: {
      matterId: string;
      deadlineType: string;
      title: string;
      description?: string;
      dueDate: string;
      priority?: string;
      reminderDays?: number;
      assignedTo?: string;
    },
    userId: string,
  ) {
    const deadline = await this.prisma.courtDeadline.create({
      data: {
        matterId: data.matterId,
        deadlineType: data.deadlineType,
        title: data.title,
        description: data.description,
        dueDate: new Date(data.dueDate),
        priority: data.priority ?? 'normal',
        reminderDays: data.reminderDays ?? 3,
        assignedTo: data.assignedTo,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.audit.log({
      entityType: 'court_deadline',
      entityId: deadline.id,
      action: 'create',
      performedBy: userId,
    });

    return deadline;
  }

  async findDeadlines(params: {
    matterId?: string;
    status?: string;
    from?: string;
    to?: string;
    assignedTo?: string;
    priority?: string;
  }) {
    const where: any = {};
    if (params.matterId) where.matterId = params.matterId;
    if (params.status) where.status = params.status;
    if (params.assignedTo) where.assignedTo = params.assignedTo;
    if (params.priority) where.priority = params.priority;
    if (params.from || params.to) {
      where.dueDate = {};
      if (params.from) where.dueDate.gte = new Date(params.from);
      if (params.to) where.dueDate.lte = new Date(params.to);
    }

    return this.prisma.courtDeadline.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      include: {
        matter: {
          select: { id: true, matterNumber: true, name: true },
        },
      },
    });
  }

  async completeDeadline(id: string, userId: string) {
    const deadline = await this.prisma.courtDeadline.findUnique({
      where: { id },
    });
    if (!deadline) throw new NotFoundException('Court deadline not found');

    const updated = await this.prisma.courtDeadline.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        completedBy: userId,
        updatedBy: userId,
      },
    });

    await this.audit.log({
      entityType: 'court_deadline',
      entityId: id,
      action: 'stage_change',
      performedBy: userId,
      fieldChanged: 'status',
      oldValue: deadline.status,
      newValue: 'completed',
    });

    return updated;
  }

  // ── Calendar View (combined) ──────────────────────────────

  async getCalendarEvents(params: { from: string; to: string; matterId?: string }) {
    const dateFilter = {
      gte: new Date(params.from),
      lte: new Date(params.to),
    };
    const matterFilter = params.matterId
      ? { matterId: params.matterId }
      : {};

    const [hearings, deadlines] = await Promise.all([
      this.prisma.courtHearing.findMany({
        where: {
          scheduledDate: dateFilter,
          ...matterFilter,
        },
        include: {
          matter: { select: { id: true, matterNumber: true, name: true } },
        },
        orderBy: { scheduledDate: 'asc' },
      }),
      this.prisma.courtDeadline.findMany({
        where: {
          dueDate: dateFilter,
          ...matterFilter,
        },
        include: {
          matter: { select: { id: true, matterNumber: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    return {
      hearings,
      deadlines,
      total: hearings.length + deadlines.length,
    };
  }
}
