import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class ComplaintsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(
    data: {
      complaintNumber: string;
      complaintType: string;
      court: string;
      complainantName: string;
      complainantNameArabic?: string;
      respondentName: string;
      respondentNameArabic?: string;
      filedDate: string;
      referralDate?: string;
      matterId?: string;
      clientId?: string;
      assignedTo: string;
      notes?: string;
    },
    userId: string,
  ) {
    const complaint = await this.prisma.criminalComplaint.create({
      data: {
        complaintNumber: data.complaintNumber,
        complaintType: data.complaintType,
        court: data.court,
        complainantName: data.complainantName,
        complainantNameArabic: data.complainantNameArabic,
        respondentName: data.respondentName,
        respondentNameArabic: data.respondentNameArabic,
        filedDate: new Date(data.filedDate),
        referralDate: data.referralDate ? new Date(data.referralDate) : undefined,
        matterId: data.matterId,
        clientId: data.clientId,
        assignedTo: data.assignedTo,
        notes: data.notes,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    await this.audit.log({
      entityType: 'criminal_complaint',
      entityId: complaint.id,
      action: 'create',
      performedBy: userId,
    });
    return complaint;
  }

  async findAll(params: {
    status?: string;
    complaintType?: string;
    court?: string;
    assignedTo?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = params.limit ?? 50;
    const where: any = {};

    if (params.status) where.status = params.status;
    if (params.complaintType) where.complaintType = params.complaintType;
    if (params.court) where.court = params.court;
    if (params.assignedTo) where.assignedTo = params.assignedTo;
    if (params.search) {
      where.OR = [
        { complaintNumber: { contains: params.search, mode: 'insensitive' } },
        { complainantName: { contains: params.search, mode: 'insensitive' } },
        { respondentName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const query: any = {
      where,
      orderBy: { createdAt: 'desc' as const },
      take: limit,
    };
    if (params.cursor) {
      query.cursor = { id: params.cursor };
      query.skip = 1;
    }

    return this.prisma.criminalComplaint.findMany(query);
  }

  async findOne(id: string) {
    const complaint = await this.prisma.criminalComplaint.findUnique({
      where: { id },
    });
    if (!complaint) throw new NotFoundException('Criminal complaint not found');
    return complaint;
  }

  async update(id: string, data: Record<string, any>, userId: string) {
    await this.findOne(id);
    const complaint = await this.prisma.criminalComplaint.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });
    await this.audit.log({
      entityType: 'criminal_complaint',
      entityId: id,
      action: 'update',
      performedBy: userId,
    });
    return complaint;
  }

  async getStats() {
    const [byStatus, byType, total] = await Promise.all([
      this.prisma.criminalComplaint.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.criminalComplaint.groupBy({
        by: ['complaintType'],
        _count: { id: true },
      }),
      this.prisma.criminalComplaint.count(),
    ]);

    return {
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
      byType: Object.fromEntries(byType.map((t) => [t.complaintType, t._count.id])),
      total,
    };
  }

  async getMyStats(userId: string) {
    const [myComplaints, myNew, myUnderInvestigation] = await Promise.all([
      this.prisma.criminalComplaint.count({ where: { assignedTo: userId } }),
      this.prisma.criminalComplaint.count({ where: { assignedTo: userId, status: 'new' } }),
      this.prisma.criminalComplaint.count({
        where: { assignedTo: userId, status: 'under_investigation' },
      }),
    ]);
    return { myComplaints, myNew, myUnderInvestigation };
  }
}
