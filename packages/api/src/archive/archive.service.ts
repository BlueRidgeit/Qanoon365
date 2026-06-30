import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class ArchiveService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Archived Documents ────────────────────────────────────

  async getDocumentStats() {
    const [byCategory, byCourt, classifiedCount, total] = await Promise.all([
      this.prisma.archivedDocument.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
      this.prisma.archivedDocument.groupBy({
        by: ['court'],
        _count: { id: true },
        where: { court: { not: null } },
      }),
      this.prisma.archivedDocument.count({ where: { isClassified: true } }),
      this.prisma.archivedDocument.count(),
    ]);

    return {
      byCategory: Object.fromEntries(byCategory.map((c) => [c.category, c._count.id])),
      byCourt: Object.fromEntries(byCourt.map((c) => [c.court ?? 'unknown', c._count.id])),
      classifiedCount,
      total,
    };
  }

  async searchDocuments(params: {
    q?: string;
    category?: string;
    court?: string;
    caseStage?: string;
    dateFrom?: string;
    dateTo?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = params.limit ?? 50;
    const where: any = {};

    if (params.category) where.category = params.category;
    if (params.court) where.court = params.court;
    if (params.caseStage) where.caseStage = params.caseStage;
    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
        { content: { contains: params.q, mode: 'insensitive' } },
        { tags: { contains: params.q, mode: 'insensitive' } },
        { caseNumber: { contains: params.q, mode: 'insensitive' } },
      ];
    }
    if (params.dateFrom || params.dateTo) {
      where.archiveDate = {};
      if (params.dateFrom) where.archiveDate.gte = new Date(params.dateFrom);
      if (params.dateTo) where.archiveDate.lte = new Date(params.dateTo);
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

    const docs = await this.prisma.archivedDocument.findMany(query);
    return docs.map((d) => ({
      ...d,
      fileSizeBytes: d.fileSizeBytes != null ? Number(d.fileSizeBytes) : null,
    }));
  }

  async createDocument(
    data: {
      title: string;
      description?: string;
      category: string;
      tags?: string;
      content?: string;
      fileName: string;
      blobPath: string;
      fileSizeBytes?: number;
      contentType?: string;
      court?: string;
      caseNumber?: string;
      caseStage?: string;
      archiveDate?: string;
      clientId?: string;
      matterId?: string;
      isClassified?: boolean;
      classificationLabel?: string;
    },
    userId: string,
  ) {
    const doc = await this.prisma.archivedDocument.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags,
        content: data.content,
        fileName: data.fileName,
        blobPath: data.blobPath,
        fileSizeBytes: data.fileSizeBytes != null ? BigInt(data.fileSizeBytes) : undefined,
        contentType: data.contentType,
        court: data.court,
        caseNumber: data.caseNumber,
        caseStage: data.caseStage,
        archiveDate: data.archiveDate ? new Date(data.archiveDate) : new Date(),
        clientId: data.clientId,
        matterId: data.matterId,
        isClassified: data.isClassified ?? false,
        classificationLabel: data.classificationLabel,
        uploadedBy: userId,
      },
    });

    await this.audit.log({
      entityType: 'archived_document',
      entityId: doc.id,
      action: 'create',
      performedBy: userId,
    });

    return {
      ...doc,
      fileSizeBytes: doc.fileSizeBytes != null ? Number(doc.fileSizeBytes) : null,
    };
  }

  async findAllDocuments(params: {
    category?: string;
    court?: string;
    isClassified?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = params.limit ?? 50;
    const where: any = {};

    if (params.category) where.category = params.category;
    if (params.court) where.court = params.court;
    if (params.isClassified === 'true') where.isClassified = true;
    if (params.isClassified === 'false') where.isClassified = false;
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
        { fileName: { contains: params.search, mode: 'insensitive' } },
        { caseNumber: { contains: params.search, mode: 'insensitive' } },
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

    const docs = await this.prisma.archivedDocument.findMany(query);
    return docs.map((d) => ({
      ...d,
      fileSizeBytes: d.fileSizeBytes != null ? Number(d.fileSizeBytes) : null,
    }));
  }

  async findOneDocument(id: string) {
    const doc = await this.prisma.archivedDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Archived document not found');
    return {
      ...doc,
      fileSizeBytes: doc.fileSizeBytes != null ? Number(doc.fileSizeBytes) : null,
    };
  }

  async updateDocument(id: string, data: Record<string, any>, userId: string) {
    await this.findOneDocument(id);
    if (data.archiveDate) data.archiveDate = new Date(data.archiveDate);
    if (data.fileSizeBytes != null) data.fileSizeBytes = BigInt(data.fileSizeBytes);

    const doc = await this.prisma.archivedDocument.update({
      where: { id },
      data,
    });

    await this.audit.log({
      entityType: 'archived_document',
      entityId: id,
      action: 'update',
      performedBy: userId,
    });

    return {
      ...doc,
      fileSizeBytes: doc.fileSizeBytes != null ? Number(doc.fileSizeBytes) : null,
    };
  }

  async removeDocument(id: string, userId: string) {
    await this.findOneDocument(id);
    await this.prisma.archivedDocument.delete({ where: { id } });

    await this.audit.log({
      entityType: 'archived_document',
      entityId: id,
      action: 'delete',
      performedBy: userId,
    });

    return { deleted: true };
  }

  // ── Powers of Attorney ────────────────────────────────────

  async getPoaStats() {
    const [byType, byStatus, total] = await Promise.all([
      this.prisma.powerOfAttorney.groupBy({
        by: ['poaType'],
        _count: { id: true },
      }),
      this.prisma.powerOfAttorney.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.powerOfAttorney.count(),
    ]);

    const expiringSoon = await this.prisma.powerOfAttorney.count({
      where: {
        status: 'active',
        expiryDate: {
          not: null,
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
    });

    return {
      byType: Object.fromEntries(byType.map((t) => [t.poaType, t._count.id])),
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.id])),
      total,
      expiringSoon,
    };
  }

  async createPoa(
    data: {
      poaNumber: string;
      clientId?: string;
      matterId?: string;
      grantorName: string;
      grantorNameArabic?: string;
      granteeUserId?: string;
      poaType: string;
      issueDate: string;
      expiryDate?: string;
      notarizationNumber?: string;
      court?: string;
      status?: string;
      documentBlobPath?: string;
      notes?: string;
    },
    userId: string,
  ) {
    const poa = await this.prisma.powerOfAttorney.create({
      data: {
        poaNumber: data.poaNumber,
        clientId: data.clientId,
        matterId: data.matterId,
        grantorName: data.grantorName,
        grantorNameArabic: data.grantorNameArabic,
        granteeUserId: data.granteeUserId,
        poaType: data.poaType,
        issueDate: new Date(data.issueDate),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        notarizationNumber: data.notarizationNumber,
        court: data.court,
        status: data.status ?? 'active',
        documentBlobPath: data.documentBlobPath,
        notes: data.notes,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.audit.log({
      entityType: 'power_of_attorney',
      entityId: poa.id,
      action: 'create',
      performedBy: userId,
    });

    return poa;
  }

  async findAllPoas(params: {
    poaType?: string;
    status?: string;
    court?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = params.limit ?? 50;
    const where: any = {};

    if (params.poaType) where.poaType = params.poaType;
    if (params.status) where.status = params.status;
    if (params.court) where.court = params.court;
    if (params.search) {
      where.OR = [
        { poaNumber: { contains: params.search, mode: 'insensitive' } },
        { grantorName: { contains: params.search, mode: 'insensitive' } },
        { grantorNameArabic: { contains: params.search, mode: 'insensitive' } },
        { notarizationNumber: { contains: params.search, mode: 'insensitive' } },
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

    return this.prisma.powerOfAttorney.findMany(query);
  }

  async findOnePoa(id: string) {
    const poa = await this.prisma.powerOfAttorney.findUnique({ where: { id } });
    if (!poa) throw new NotFoundException('Power of Attorney not found');
    return poa;
  }

  async updatePoa(id: string, data: Record<string, any>, userId: string) {
    await this.findOnePoa(id);
    if (data.issueDate) data.issueDate = new Date(data.issueDate);
    if (data.expiryDate) data.expiryDate = new Date(data.expiryDate);

    const poa = await this.prisma.powerOfAttorney.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });

    await this.audit.log({
      entityType: 'power_of_attorney',
      entityId: id,
      action: 'update',
      performedBy: userId,
    });

    return poa;
  }

  async updatePoaStatus(id: string, status: string, userId: string) {
    const existing = await this.findOnePoa(id);

    const poa = await this.prisma.powerOfAttorney.update({
      where: { id },
      data: { status, updatedBy: userId },
    });

    await this.audit.log({
      entityType: 'power_of_attorney',
      entityId: id,
      action: 'stage_change',
      performedBy: userId,
      fieldChanged: 'status',
      oldValue: existing.status,
      newValue: status,
    });

    return poa;
  }

  async removePoa(id: string, userId: string) {
    await this.findOnePoa(id);
    await this.prisma.powerOfAttorney.delete({ where: { id } });

    await this.audit.log({
      entityType: 'power_of_attorney',
      entityId: id,
      action: 'delete',
      performedBy: userId,
    });

    return { deleted: true };
  }
}
