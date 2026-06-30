import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';

@Processor('kyc-expiry')
export class KycExpiryProcessor {
  private readonly logger = new Logger(KycExpiryProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Process()
  async handleExpiryCheck(job: Job) {
    this.logger.log('Running KYC expiry check...');

    try {
      const now = new Date();
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      );
      const sixtyDaysFromNow = new Date(
        now.getTime() + 60 * 24 * 60 * 60 * 1000,
      );
      const ninetyDaysFromNow = new Date(
        now.getTime() + 90 * 24 * 60 * 60 * 1000,
      );

      // Find KYC records that are verified but expiring soon
      const expiringRecords = await this.prisma.kycRecord.findMany({
        where: {
          status: 'verified',
          idExpiryDate: {
            lte: ninetyDaysFromNow,
            gte: now,
          },
        },
        include: {
          client: { select: { id: true, name: true } },
        },
      });

      this.logger.log(
        `Found ${expiringRecords.length} KYC records expiring within 90 days`,
      );

      // Find already expired records
      const expiredRecords = await this.prisma.kycRecord.findMany({
        where: {
          status: 'verified',
          idExpiryDate: { lt: now },
        },
        include: {
          client: { select: { id: true, name: true } },
        },
      });

      // Update expired records status
      for (const record of expiredRecords) {
        await this.prisma.kycRecord.update({
          where: { id: record.id },
          data: { status: 'expired' },
        });

        // Update client KYC status
        await this.prisma.client.update({
          where: { id: record.clientId },
          data: { kycStatus: 'expired' },
        });

        this.logger.log(
          `Marked KYC record ${record.id} as expired for client ${record.client?.name}`,
        );
      }

      // Create notifications for expiring records
      let notificationsCreated = 0;
      for (const record of expiringRecords) {
        if (!record.idExpiryDate) {
          continue;
        }

        const daysUntilExpiry = Math.ceil(
          (record.idExpiryDate.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        let urgency = 'info';
        if (daysUntilExpiry <= 30) urgency = 'critical';
        else if (daysUntilExpiry <= 60) urgency = 'warning';

        // Create notification (will be consumed by notification-dispatch in future)
        await this.prisma.notification.create({
          data: {
            userId: record.verifiedBy || 'system',
            title: `KYC Expiring: ${record.client?.name}`,
            body: `KYC verification for ${record.client?.name} expires in ${daysUntilExpiry} days (${record.verificationType}).`,
            entityType: 'kyc',
            entityId: record.id,
            isRead: false,
          },
        });
        notificationsCreated++;
      }

      this.logger.log(
        `KYC expiry check complete: ${expiredRecords.length} expired, ${notificationsCreated} notifications created`,
      );

      return {
        expiredCount: expiredRecords.length,
        expiringCount: expiringRecords.length,
        notificationsCreated,
      };
    } catch (error) {
      this.logger.error('KYC expiry check failed', error);
      throw error;
    }
  }
}
