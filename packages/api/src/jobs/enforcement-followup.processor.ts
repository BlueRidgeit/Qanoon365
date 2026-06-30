import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { generateFollowUpEmail } from '../email/templates/follow-up.template.js';

@Processor('enforcement-followup')
export class EnforcementFollowupProcessor {
  private readonly logger = new Logger(EnforcementFollowupProcessor.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  @Process()
  async handleFollowUps(job: Job) {
    this.logger.log('Running enforcement follow-up check...');

    try {
      const now = new Date();

      const dueRules = await this.prisma.followUpRule.findMany({
        where: {
          isActive: true,
          nextFollowUpDate: { lte: now },
        },
        include: {
          executionFile: true,
          courtContact: true,
        },
      });

      this.logger.log(`Found ${dueRules.length} follow-ups due`);

      let sentCount = 0;
      let failedCount = 0;

      for (const rule of dueRules) {
        const file = rule.executionFile;
        const contact = rule.courtContact;

        if (file.status !== 'ongoing') {
          this.logger.log(`Skipping file ${file.fileNumber} — status is ${file.status}`);
          continue;
        }

        const templateData = {
          fileNumber: file.fileNumber,
          court: file.court,
          debtorName: file.debtorName,
          claimAmount: `${file.currency} ${file.claimAmount}`,
          filingDate: file.filingDate.toISOString().split('T')[0],
          firmName: 'Al Basti & Associates',
        };

        const lang = (rule.templateLanguage as 'en' | 'ar' | 'both') || 'both';
        const emailContent = generateFollowUpEmail(templateData, lang);

        // Create log entry
        const log = await this.prisma.followUpLog.create({
          data: {
            executionFileId: file.id,
            status: 'scheduled',
            recipientEmail: contact.email,
            subject: emailContent.subject,
            body: emailContent.html,
          },
        });

        // Look up the assigned lawyer's email for CC
        let ccEmail: string | undefined;
        try {
          const assignedUser = await this.prisma.user.findUnique({
            where: { id: file.assignedTo },
            select: { email: true },
          });
          ccEmail = assignedUser?.email;
        } catch {
          // user lookup is best-effort
        }

        // Send email
        const result = await this.email.send({
          to: contact.email,
          cc: ccEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });

        if (result.success) {
          await this.prisma.followUpLog.update({
            where: { id: log.id },
            data: { status: 'sent', sentAt: new Date() },
          });
          sentCount++;
        } else {
          await this.prisma.followUpLog.update({
            where: { id: log.id },
            data: { status: 'failed', errorMessage: result.error },
          });
          failedCount++;
        }

        // Advance next follow-up date
        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + rule.intervalDays);
        await this.prisma.followUpRule.update({
          where: { id: rule.id },
          data: { nextFollowUpDate: nextDate },
        });

        // Create in-app notification
        await this.prisma.notification.create({
          data: {
            userId: file.assignedTo,
            title: `Follow-up ${result.success ? 'sent' : 'failed'}: File #${file.fileNumber}`,
            body: result.success
              ? `Automated follow-up email sent to ${contact.email} for execution file ${file.fileNumber}.`
              : `Follow-up email failed for execution file ${file.fileNumber}: ${result.error}`,
            entityType: 'execution_file',
            entityId: file.id,
          },
        });
      }

      this.logger.log(`Follow-up check complete: ${sentCount} sent, ${failedCount} failed`);
      return { dueCount: dueRules.length, sentCount, failedCount };
    } catch (error) {
      this.logger.error('Enforcement follow-up check failed', error);
      throw error;
    }
  }
}
