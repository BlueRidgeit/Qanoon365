import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectQueue('matter-onboarding') private matterOnboardingQueue: Queue,
    @InjectQueue('kyc-expiry') private kycExpiryQueue: Queue,
    @InjectQueue('inactivity-alert') private inactivityAlertQueue: Queue,
    @InjectQueue('enforcement-followup') private enforcementFollowupQueue: Queue,
    @InjectQueue('enforcement-stale-check') private enforcementStaleCheckQueue: Queue,
  ) {}

  async onModuleInit() {
    try {
      await this.scheduleRecurringJobs();
    } catch (error) {
      this.logger.error('Failed to schedule recurring jobs — app will continue without them', error);
    }
  }

  private async scheduleRecurringJobs() {
    // KYC expiry check: daily at 6 AM UTC
    const kycExisting = await this.kycExpiryQueue.getRepeatableJobs();
    if (kycExisting.length === 0) {
      await this.kycExpiryQueue.add(
        'check-expiry',
        {},
        { repeat: { cron: '0 6 * * *' } },
      );
      this.logger.log('Scheduled KYC expiry check (daily 6 AM UTC)');
    }

    // Inactivity alert: daily at 7 AM UTC
    const inactExisting = await this.inactivityAlertQueue.getRepeatableJobs();
    if (inactExisting.length === 0) {
      await this.inactivityAlertQueue.add(
        'check-inactivity',
        {},
        { repeat: { cron: '0 7 * * *' } },
      );
      this.logger.log('Scheduled inactivity alert (daily 7 AM UTC)');
    }

    // Enforcement follow-up: daily at 8 AM UTC (12 PM UAE)
    const followupExisting = await this.enforcementFollowupQueue.getRepeatableJobs();
    if (followupExisting.length === 0) {
      await this.enforcementFollowupQueue.add(
        'check-followups',
        {},
        { repeat: { cron: '0 8 * * *' } },
      );
      this.logger.log('Scheduled enforcement follow-up check (daily 8 AM UTC)');
    }

    // Enforcement stale check: daily at 6:30 AM UTC
    const staleExisting = await this.enforcementStaleCheckQueue.getRepeatableJobs();
    if (staleExisting.length === 0) {
      await this.enforcementStaleCheckQueue.add(
        'check-stale',
        {},
        { repeat: { cron: '30 6 * * *' } },
      );
      this.logger.log('Scheduled enforcement stale check (daily 6:30 AM UTC)');
    }
  }

  /**
   * Dispatch matter onboarding when an opportunity is won.
   */
  async dispatchMatterOnboarding(data: {
    opportunityId: string;
    clientId: string;
    userId: string;
    tenantId: string;
  }) {
    const job = await this.matterOnboardingQueue.add('onboard', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    this.logger.log(`Dispatched matter-onboarding job ${job.id} for opportunity ${data.opportunityId}`);
    return job;
  }

  /**
   * Manually trigger KYC expiry check (for testing).
   */
  async triggerKycExpiryCheck() {
    const job = await this.kycExpiryQueue.add('check-expiry-manual', {});
    this.logger.log(`Dispatched manual KYC expiry check job ${job.id}`);
    return job;
  }

  /**
   * Manually trigger inactivity alert (for testing).
   */
  async triggerInactivityAlert() {
    const job = await this.inactivityAlertQueue.add('check-inactivity-manual', {});
    this.logger.log(`Dispatched manual inactivity alert job ${job.id}`);
    return job;
  }

  /**
   * Manually trigger enforcement follow-up check (for testing).
   */
  async triggerEnforcementFollowup() {
    const job = await this.enforcementFollowupQueue.add('check-followups-manual', {});
    this.logger.log(`Dispatched manual enforcement follow-up job ${job.id}`);
    return job;
  }

  /**
   * Manually trigger enforcement stale check (for testing).
   */
  async triggerEnforcementStaleCheck() {
    const job = await this.enforcementStaleCheckQueue.add('check-stale-manual', {});
    this.logger.log(`Dispatched manual enforcement stale check job ${job.id}`);
    return job;
  }
}
