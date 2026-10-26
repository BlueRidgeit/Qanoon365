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

  // Microsoft Graph sendMail (app-only, Mail.Send) from MAIL_FROM. Used when MAIL_CLIENT_ID,
  // MAIL_CLIENT_SECRET and MAIL_FROM are set; otherwise SMTP (if configured) or a dry run.
  private graphToken: { token: string; expires: number } | null = null;

  // Invitations only go out through Graph (MAIL_*), so existing SMTP setups are not affected.
  get graphConfigured(): boolean {
    return Boolean(
      this.config.get<string>('MAIL_CLIENT_ID') &&
        this.config.get<string>('MAIL_CLIENT_SECRET') &&
        this.config.get<string>('MAIL_FROM') &&
        (this.config.get<string>('MAIL_TENANT_ID') || this.config.get<string>('MICROSOFT_TENANT_ID')),
    );
  }

  get canSendMail(): boolean {
    return this.graphConfigured || this.transporter !== null;
  }

  private async getGraphToken(): Promise<string> {
    if (this.graphToken && this.graphToken.expires > Date.now() + 60_000) {
      return this.graphToken.token;
    }
    const tenant =
      this.config.get<string>('MAIL_TENANT_ID') || this.config.get<string>('MICROSOFT_TENANT_ID');
    const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.getOrThrow<string>('MAIL_CLIENT_ID'),
        client_secret: this.config.getOrThrow<string>('MAIL_CLIENT_SECRET'),
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!res.ok || !data.access_token) {
      throw new Error(`Could not get a mail token: ${data.error_description?.split('\r')[0] ?? res.status}`);
    }
    this.graphToken = { token: data.access_token, expires: Date.now() + (data.expires_in ?? 3600) * 1000 };
    return this.graphToken.token;
  }

  private async sendViaGraph(params: {
    to: string;
    cc?: string;
    subject: string;
    html: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const token = await this.getGraphToken();
      const from = this.config.getOrThrow<string>('MAIL_FROM');
      const res = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: params.subject,
            body: { contentType: 'HTML', content: params.html },
            toRecipients: [{ emailAddress: { address: params.to } }],
            ...(params.cc ? { ccRecipients: [{ emailAddress: { address: params.cc } }] } : {}),
          },
          saveToSentItems: false,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
        const detail = body.error?.message ?? body.error?.code ?? `HTTP ${res.status}`;
        this.logger.error(`Graph sendMail failed (${res.status}): ${detail}`);
        return { success: false, error: detail };
      }
      this.logger.log(`Email sent via Graph to ${params.to}`);
      return { success: true, messageId: 'graph' };
    } catch (error: any) {
      this.logger.error(`Graph email failed: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  async send(params: {
    to: string;
    cc?: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (this.graphConfigured) {
      return this.sendViaGraph(params);
    }

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
