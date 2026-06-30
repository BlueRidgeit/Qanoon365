import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class KycService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(data: {
    clientId: string;
    verificationType: string;
    idDocumentType?: string;
    idDocumentNumber?: string;
    idExpiryDate?: string;
    riskRating?: string;
    notes?: string;
  }, userId: string) {
    // Verify client exists
    const client = await this.prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new NotFoundException('Client not found');

    const record = await this.prisma.kycRecord.create({
      data: {
        ...data,
        idExpiryDate: data.idExpiryDate ? new Date(data.idExpiryDate) : null,
        status: 'documents_requested',
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Update client KYC status if it was not_started
    if (client.kycStatus === 'not_started') {
      await this.prisma.client.update({
        where: { id: data.clientId },
        data: { kycStatus: 'documents_requested' },
      });
      await this.prisma.opportunity.updateMany({
        where: { clientId: data.clientId },
        data: { kycStatus: 'documents_requested' },
      });
    }

    await this.audit.log({
      entityType: 'kyc_record', entityId: record.id,
      action: 'create', performedBy: userId,
    });

    return record;
  }

  async findAll(clientId?: string) {
    const where: any = {};
    if (clientId) where.clientId = clientId;
    return this.prisma.kycRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { id: true, name: true, kycStatus: true } } },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.kycRecord.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true, kycStatus: true } } },
    });
    if (!record) throw new NotFoundException('KYC record not found');
    return record;
  }

  async update(id: string, data: {
    status?: string;
    idDocumentType?: string;
    idDocumentNumber?: string;
    idExpiryDate?: string;
    riskRating?: string;
    notes?: string;
  }, userId: string) {
    const record = await this.findOne(id);
    const oldStatus = record.status;

    const updateData: any = { ...data, updatedBy: userId };
    if (data.idExpiryDate) {
      updateData.idExpiryDate = new Date(data.idExpiryDate);
    }

    // If verifying, set verification date and verifier
    if (data.status === 'verified') {
      updateData.verificationDate = new Date();
      updateData.verifiedBy = userId;
    }

    const updated = await this.prisma.kycRecord.update({
      where: { id },
      data: updateData,
    });

    // Log status change
    if (data.status && data.status !== oldStatus) {
      await this.audit.log({
        entityType: 'kyc_record', entityId: id,
        action: 'kyc_verify', performedBy: userId,
        fieldChanged: 'status', oldValue: oldStatus, newValue: data.status,
      });

      // Sync client KYC status
      await this.syncClientKycStatus(record.clientId, userId);
    } else {
      await this.audit.log({
        entityType: 'kyc_record', entityId: id,
        action: 'update', performedBy: userId,
      });
    }

    return updated;
  }

  async checkExpiry() {
    // Find KYC records that have expired
    const now = new Date();
    const expired = await this.prisma.kycRecord.findMany({
      where: {
        status: 'verified',
        idExpiryDate: { lt: now },
      },
    });

    for (const record of expired) {
      await this.prisma.kycRecord.update({
        where: { id: record.id },
        data: { status: 'expired' },
      });
      await this.syncClientKycStatus(record.clientId, 'system');
    }

    return { expiredCount: expired.length };
  }

  private async syncClientKycStatus(clientId: string, userId: string) {
    const records = await this.prisma.kycRecord.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });

    if (records.length === 0) return;

    // Client KYC status = best status among records
    // verified > under_review > documents_requested > not_started
    // But if any record is expired or rejected, that takes priority
    const hasExpired = records.some(r => r.status === 'expired');
    const hasRejected = records.some(r => r.status === 'rejected');
    const hasVerified = records.some(r => r.status === 'verified');
    const hasUnderReview = records.some(r => r.status === 'under_review');

    let newStatus: string;
    if (hasExpired) {
      newStatus = 'expired';
    } else if (hasRejected && !hasVerified) {
      newStatus = 'rejected';
    } else if (hasVerified) {
      newStatus = 'verified';
    } else if (hasUnderReview) {
      newStatus = 'under_review';
    } else {
      newStatus = 'documents_requested';
    }

    await this.prisma.client.update({
      where: { id: clientId },
      data: { kycStatus: newStatus },
    });

    await this.prisma.opportunity.updateMany({
      where: { clientId },
      data: { kycStatus: newStatus },
    });
  }
}
