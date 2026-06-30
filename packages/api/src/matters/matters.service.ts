import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class MattersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(params: { cursor?: string; limit?: number; status?: string }) {
    const limit = params.limit ?? 20;
    const where: any = {};
    if (params.status) where.status = params.status;
    const query: any = {
      where,
      orderBy: { createdAt: 'desc' as const },
      take: limit,
      include: {
        client: { select: { id: true, name: true, kycStatus: true } },
        opportunity: {
          select: {
            id: true,
            leadId: true,
            name: true,
            stage: true,
            conflictCheckStatus: true,
            kycStatus: true,
            clientId: true,
          },
        },
      },
    };
    if (params.cursor) { query.cursor = { id: params.cursor }; query.skip = 1; }
    return this.prisma.matter.findMany(query);
  }

  async findOne(id: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, kycStatus: true } },
        opportunity: {
          select: {
            id: true,
            leadId: true,
            name: true,
            stage: true,
            conflictCheckStatus: true,
            kycStatus: true,
            clientId: true,
          },
        },
      },
    });
    if (!matter) throw new NotFoundException('Matter not found');
    return matter;
  }

  async update(id: string, data: Record<string, any>, userId: string) {
    await this.findOne(id);
    const matter = await this.prisma.matter.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });
    await this.audit.log({
      entityType: 'matter', entityId: id,
      action: 'update', performedBy: userId,
    });
    return matter;
  }

  async close(id: string, userId: string) {
    const matter = await this.findOne(id);

    if (matter.status === 'closed') {
      throw new BadRequestException('Matter is already closed');
    }

    const updated = await this.prisma.matter.update({
      where: { id },
      data: { status: 'closed', updatedBy: userId },
    });

    await this.audit.log({
      entityType: 'matter', entityId: id,
      action: 'stage_change', performedBy: userId,
      fieldChanged: 'status', oldValue: matter.status, newValue: 'closed',
    });

    return updated;
  }
}
