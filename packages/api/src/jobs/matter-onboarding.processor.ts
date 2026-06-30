import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

interface MatterOnboardingData {
  opportunityId: string;
  clientId: string;
  userId: string;
  tenantId: string;
}

@Processor('matter-onboarding')
export class MatterOnboardingProcessor {
  private readonly logger = new Logger(MatterOnboardingProcessor.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  @Process('onboard')
  async handleOnboarding(job: Job<MatterOnboardingData>) {
    const { opportunityId, clientId, userId } = job.data;
    this.logger.log(`Processing matter onboarding for opportunity ${opportunityId}`);

    try {
      // 1. Fetch the opportunity
      const opportunity = await this.prisma.opportunity.findUnique({
        where: { id: opportunityId },
      });

      if (!opportunity) {
        this.logger.warn(`Opportunity ${opportunityId} not found, skipping onboarding`);
        return;
      }

      // 2. Generate matter number (MAT-YYYY-NNNN)
      const year = new Date().getFullYear();
      const existingCount = await this.prisma.matter.count();
      const matterNumber = `MAT-${year}-${String(existingCount + 1).padStart(4, '0')}`;

      // 3. Create the matter
      const matter = await this.prisma.matter.create({
        data: {
          matterNumber,
          name: opportunity.name,
          clientId,
          opportunityId,
          status: 'active',
          practiceArea: opportunity.practiceArea,
          leadPartner: opportunity.assignedPartner,
          openDate: new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
      });

      this.logger.log(`Created matter ${matterNumber} (${matter.id})`);

      // 4. Log audit trail
      await this.audit.log({
        entityType: 'matter',
        entityId: matter.id,
        action: 'create',
        performedBy: userId,
        fieldChanged: 'status',
        newValue: 'active',
      });

      // 5. Create a system activity
      await this.prisma.activity.create({
        data: {
          entityType: 'matter',
          entityId: matter.id,
          activityType: 'system_event',
          subject: 'Matter created via onboarding',
          body: `Matter ${matterNumber} was automatically created when the engagement was instructed.`,
          activityDate: new Date(),
          isSystemGenerated: true,
        },
      });

      // 6. Create notification for the lead partner
      await this.prisma.notification.create({
        data: {
          userId,
          title: 'New Matter Created',
          body: `Matter ${matterNumber} "${opportunity.name}" has been created and is ready for onboarding.`,
          entityType: 'matter',
          entityId: matter.id,
          isRead: false,
        },
      });

      this.logger.log(`Matter onboarding complete for ${matterNumber}`);
      return { matterId: matter.id, matterNumber };
    } catch (error) {
      this.logger.error(`Matter onboarding failed for opportunity ${opportunityId}`, error);
      throw error;
    }
  }
}
