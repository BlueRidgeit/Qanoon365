import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    entityType: string;
    entityId: string;
    action: string;
    performedBy: string;
    fieldChanged?: string;
    oldValue?: string;
    newValue?: string;
    ipAddress?: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        performedBy: params.performedBy,
        fieldChanged: params.fieldChanged,
        oldValue: params.oldValue,
        newValue: params.newValue,
        ipAddress: params.ipAddress,
      },
    });
  }
}
