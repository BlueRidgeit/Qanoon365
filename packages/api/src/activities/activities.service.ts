import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    entityType: string;
    entityId: string;
    activityType: string;
    subject: string;
    body?: string;
    activityDate?: string;
  }, userId: string) {
    return this.prisma.activity.create({
      data: {
        ...data,
        activityDate: data.activityDate ? new Date(data.activityDate) : new Date(),
        completedBy: userId,
        isSystemGenerated: false,
      },
    });
  }

  async logSystemEvent(entityType: string, entityId: string, subject: string, userId: string) {
    return this.prisma.activity.create({
      data: {
        entityType,
        entityId,
        activityType: 'system_event',
        subject,
        activityDate: new Date(),
        completedBy: userId,
        isSystemGenerated: true,
      },
    });
  }

  async findAll(entityType?: string, entityId?: string) {
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    return this.prisma.activity.findMany({ where, orderBy: { activityDate: 'desc' } });
  }
}
