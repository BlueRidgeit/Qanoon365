import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';

@Processor('inactivity-alert')
export class InactivityAlertProcessor {
  private readonly logger = new Logger(InactivityAlertProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Process()
  async handleInactivityCheck(job: Job) {
    this.logger.log('Running inactivity alert check...');

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Find stale leads (no update in 7+ days, still active)
      const staleLeads = await this.prisma.lead.findMany({
        where: {
          status: { in: ['new', 'contacted'] },
          updatedAt: { lt: sevenDaysAgo },
        },
      });

      this.logger.log(`Found ${staleLeads.length} stale enquiries (no activity > 7 days)`);

      // Find stale opportunities (no update in 14+ days, still in pipeline)
      const staleOpportunities = await this.prisma.opportunity.findMany({
        where: {
          stage: { in: ['inquiry', 'consultation', 'proposal', 'retainer'] },
          updatedAt: { lt: fourteenDaysAgo },
        },
        include: {
          client: { select: { name: true } },
        },
      });

      this.logger.log(`Found ${staleOpportunities.length} stale engagements (no activity > 14 days)`);

      let notificationsCreated = 0;

      // Create notifications for stale leads
      for (const lead of staleLeads) {
        const daysSinceUpdate = Math.floor(
          (now.getTime() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
        );

        await this.prisma.notification.create({
          data: {
            userId: lead.assignedTo || lead.createdBy || 'system',
            title: `Stale Enquiry: ${lead.subject}`,
            body: `No activity on this enquiry for ${daysSinceUpdate} days. Please follow up or disqualify.`,
            entityType: 'lead',
            entityId: lead.id,
            isRead: false,
          },
        });
        notificationsCreated++;
      }

      // Create notifications for stale opportunities
      for (const opp of staleOpportunities) {
        const daysSinceUpdate = Math.floor(
          (now.getTime() - new Date(opp.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
        );

        await this.prisma.notification.create({
          data: {
            userId: opp.assignedPartner || opp.createdBy || 'system',
            title: `Stale Engagement: ${opp.name}`,
            body: `No activity on engagement for ${opp.client?.name || 'unknown client'} for ${daysSinceUpdate} days (stage: ${opp.stage}).`,
            entityType: 'opportunity',
            entityId: opp.id,
            isRead: false,
          },
        });
        notificationsCreated++;
      }

      this.logger.log(`Inactivity check complete: ${notificationsCreated} alerts created`);

      return {
        staleLeads: staleLeads.length,
        staleOpportunities: staleOpportunities.length,
        notificationsCreated,
      };
    } catch (error) {
      this.logger.error('Inactivity alert check failed', error);
      throw error;
    }
  }
}
