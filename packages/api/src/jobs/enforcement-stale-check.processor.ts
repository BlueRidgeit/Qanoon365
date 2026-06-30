import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';

@Processor('enforcement-stale-check')
export class EnforcementStaleCheckProcessor {
  private readonly logger = new Logger(EnforcementStaleCheckProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Process()
  async handleStaleCheck(job: Job) {
    this.logger.log('Running enforcement stale file check...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const staleFiles = await this.prisma.executionFile.findMany({
        where: {
          status: 'ongoing',
          isStalled: false,
          lastActivityDate: { lt: thirtyDaysAgo },
        },
      });

      this.logger.log(`Found ${staleFiles.length} stalled execution files`);

      for (const file of staleFiles) {
        await this.prisma.executionFile.update({
          where: { id: file.id },
          data: { isStalled: true },
        });

        await this.prisma.notification.create({
          data: {
            userId: file.assignedTo,
            title: `Stalled: Execution File #${file.fileNumber}`,
            body: `Execution file ${file.fileNumber} has had no activity for over 30 days. Please review and take action.`,
            entityType: 'execution_file',
            entityId: file.id,
          },
        });
      }

      this.logger.log(`Stale check complete: ${staleFiles.length} files marked as stalled`);
      return { stalledCount: staleFiles.length };
    } catch (error) {
      this.logger.error('Enforcement stale check failed', error);
      throw error;
    }
  }
}
