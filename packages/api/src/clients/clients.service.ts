import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(data: {
    name: string;
    clientType: string;
    registrationNumber?: string;
    industry?: string;
    preferredLanguage?: string;
    riskRating?: string;
    notes?: string;
  }, userId: string) {
    const client = await this.prisma.client.create({
      data: {
        ...data,
        preferredLanguage: data.preferredLanguage ?? 'english',
        createdBy: userId,
        updatedBy: userId,
      },
    });
    await this.audit.log({
      entityType: 'client', entityId: client.id,
      action: 'create', performedBy: userId,
    });
    return client;
  }

  async findAll(params: { cursor?: string; limit?: number }) {
    const limit = params.limit ?? 20;
    const where = { isActive: true };
    const query: any = { where, orderBy: { createdAt: 'desc' as const }, take: limit };
    if (params.cursor) {
      query.cursor = { id: params.cursor };
      query.skip = 1;
    }
    return this.prisma.client.findMany(query);
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        contacts: { orderBy: { createdAt: 'desc' } },
        kycRecords: { orderBy: { createdAt: 'desc' } },
        opportunities: { orderBy: { createdAt: 'desc' } },
        matters: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async update(id: string, data: Record<string, any>, userId: string) {
    await this.findOne(id);
    const client = await this.prisma.client.update({
      where: { id },
      data: { ...data, updatedBy: userId },
    });
    await this.audit.log({
      entityType: 'client', entityId: id,
      action: 'update', performedBy: userId,
    });
    return client;
  }
}
