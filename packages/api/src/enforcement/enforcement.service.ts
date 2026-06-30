import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class EnforcementService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(
    data: {
      fileNumber: string;
      caseNumber?: string;
      court: string;
      filingDate: string;
      claimAmount: number;
      currency?: string;
      debtorName: string;
      debtorNameArabic?: string;
      creditorName: string;
      creditorNameArabic?: string;
      matterId?: string;
      clientId?: string;
      assignedTo: string;
      notes?: string;
    },
    userId: string,
  ) {
    const file = await this.prisma.executionFile.create({
      data: {
        fileNumber: data.fileNumber,
        caseNumber: data.caseNumber,
        court: data.court,
        filingDate: new Date(data.filingDate),
        claimAmount: data.claimAmount,
        currency: data.currency ?? 'AED',
        debtorName: data.debtorName,
        debtorNameArabic: data.debtorNameArabic,
        creditorName: data.creditorName,
        creditorNameArabic: data.creditorNameArabic,
        matterId: data.matterId,
        clientId: data.clientId,
        assignedTo: data.assignedTo,
        notes: data.notes,
        lastActivityDate: new Date(),
        createdBy: userId,
        updatedBy: userId,
      },
    });
    await this.audit.log({
      entityType: 'execution_file',
      entityId: file.id,
      action: 'create',
      performedBy: userId,
    });
    return file;
  }

  async findAll(params: {
    court?: string;
    status?: string;
    assignedTo?: string;
    isStalled?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = params.limit ?? 50;
    const where: any = {};

    if (params.court) where.court = params.court;
    if (params.status) where.status = params.status;
    if (params.assignedTo) where.assignedTo = params.assignedTo;
    if (params.isStalled === 'true') where.isStalled = true;
    if (params.search) {
      where.OR = [
        { fileNumber: { contains: params.search, mode: 'insensitive' } },
        { caseNumber: { contains: params.search, mode: 'insensitive' } },
        { debtorName: { contains: params.search, mode: 'insensitive' } },
        { creditorName: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.dateFrom || params.dateTo) {
      where.filingDate = {};
      if (params.dateFrom) where.filingDate.gte = new Date(params.dateFrom);
      if (params.dateTo) where.filingDate.lte = new Date(params.dateTo);
    }

    const query: any = {
      where,
      orderBy: { createdAt: 'desc' as const },
      take: limit,
      include: { followUpRule: true },
    };
    if (params.cursor) {
      query.cursor = { id: params.cursor };
      query.skip = 1;
    }

    return this.prisma.executionFile.findMany(query);
  }

  async findOne(id: string) {
    const file = await this.prisma.executionFile.findUnique({
      where: { id },
      include: {
        followUpRule: { include: { courtContact: true } },
        followUpLogs: { orderBy: { createdAt: 'desc' as const }, take: 20 },
      },
    });
    if (!file) throw new NotFoundException('Execution file not found');
    return file;
  }

  async update(id: string, data: Record<string, any>, userId: string) {
    await this.findOne(id);
    const file = await this.prisma.executionFile.update({
      where: { id },
      data: {
        ...data,
        lastActivityDate: new Date(),
        isStalled: false,
        updatedBy: userId,
      },
    });
    await this.audit.log({
      entityType: 'execution_file',
      entityId: id,
      action: 'update',
      performedBy: userId,
    });
    return file;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    const file = await this.prisma.executionFile.update({
      where: { id },
      data: { status: 'stopped', updatedBy: userId },
    });
    await this.audit.log({
      entityType: 'execution_file',
      entityId: id,
      action: 'delete',
      performedBy: userId,
    });
    return file;
  }

  async getStats() {
    const [byStatus, byCourt, stalledCount, total] = await Promise.all([
      this.prisma.executionFile.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.executionFile.groupBy({
        by: ['court'],
        _count: { id: true },
        where: { status: 'ongoing' },
      }),
      this.prisma.executionFile.count({ where: { isStalled: true } }),
      this.prisma.executionFile.count(),
    ]);

    return {
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
      byCourt: Object.fromEntries(byCourt.map((c) => [c.court, c._count.id])),
      stalledCount,
      total,
    };
  }

  async getMyStats(userId: string) {
    const [myFiles, myStalled, myComplaints] = await Promise.all([
      this.prisma.executionFile.count({ where: { assignedTo: userId } }),
      this.prisma.executionFile.count({ where: { assignedTo: userId, isStalled: true } }),
      this.prisma.criminalComplaint.count({ where: { assignedTo: userId } }),
    ]);
    return { myFiles, myStalled, myComplaints };
  }

  async getDashboard(userId: string) {
    const [myStats, overallStats, complaintStats, courtGrid, latestFiles, latestComplaints] =
      await Promise.all([
        this.getMyStats(userId),
        this.getStats(),
        this.getComplaintStats(),
        this.prisma.executionFile.groupBy({
          by: ['court'],
          _count: { id: true },
        }),
        this.prisma.executionFile.findMany({
          orderBy: { createdAt: 'desc' as const },
          take: 10,
        }),
        this.prisma.criminalComplaint.findMany({
          orderBy: { createdAt: 'desc' as const },
          take: 10,
        }),
      ]);

    return {
      myStats,
      overallStats,
      complaintStats,
      courtGrid: Object.fromEntries(courtGrid.map((c) => [c.court, c._count.id])),
      latestFiles,
      latestComplaints,
    };
  }

  async getReports(params: { month?: string; year?: string }) {
    const now = new Date();
    const year = params.year ? parseInt(params.year) : now.getFullYear();
    const month = params.month ? parseInt(params.month) - 1 : now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59);

    const [files, complaints, followUps] = await Promise.all([
      this.prisma.executionFile.groupBy({
        by: ['assignedTo'],
        _count: { id: true },
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.criminalComplaint.groupBy({
        by: ['assignedTo'],
        _count: { id: true },
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.followUpLog.groupBy({
        by: ['executionFileId'],
        _count: { id: true },
        where: { createdAt: { gte: start, lte: end }, status: 'sent' },
      }),
    ]);

    return { period: { year, month: month + 1 }, files, complaints, followUps };
  }

  private async getComplaintStats() {
    const [byStatus, byType] = await Promise.all([
      this.prisma.criminalComplaint.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.criminalComplaint.groupBy({
        by: ['complaintType'],
        _count: { id: true },
      }),
    ]);
    return {
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
      byType: Object.fromEntries(byType.map((t) => [t.complaintType, t._count.id])),
    };
  }
}
