import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<number>('SMTP_PORT', 587) === 465,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log(`SMTP configured: ${host}`);
    } else {
      this.logger.warn('SMTP not configured — emails will be logged only');
    }
  }

  async send(params: {
    to: string;
    cc?: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const from = this.config.get<string>('SMTP_FROM', 'noreply@albasti.dev');

    if (!this.transporter) {
      this.logger.log(`[DRY RUN] Email to=${params.to} subject="${params.subject}"`);
      return { success: true, messageId: 'dry-run' };
    }

    try {
      const info = await this.transporter.sendMail({
        from,
        to: params.to,
        cc: params.cc,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
      this.logger.log(`Email sent: ${info.messageId} to ${params.to}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      this.logger.error(`Email failed: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
