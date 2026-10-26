import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrandingService } from '../branding/branding.service.js';
import { EmailService } from '../email/email.service.js';
import { generateInviteEmail } from '../email/templates/invite.template.js';

const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  admin: { en: 'an administrator', ar: 'مسؤول' },
  partner: { en: 'a partner', ar: 'شريك' },
  compliance: { en: 'a compliance user', ar: 'مسؤول امتثال' },
  lawyer: { en: 'a lawyer', ar: 'محامٍ' },
  bd: { en: 'a business development user', ar: 'تطوير الأعمال' },
};

export type InviteOutcome =
  | { status: 'sent' }
  | { status: 'not_configured' }
  | { status: 'failed'; error: string };

const luminanceText = (hex: string) => {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l =
    0.2126 * ch(parseInt(hex.slice(1, 3), 16)) +
    0.7152 * ch(parseInt(hex.slice(3, 5), 16)) +
    0.0722 * ch(parseInt(hex.slice(5, 7), 16));
  return l > 0.45 ? '#111827' : '#ffffff';
};

@Injectable()
export class InvitationService {
  constructor(
    private email: EmailService,
    private branding: BrandingService,
    private config: ConfigService,
  ) {}

  // Never throws: adding the user must succeed even if the email cannot be sent.
  async invite(args: {
    to: string;
    name?: string;
    role: string;
    invitedBy?: string;
    apiOrigin: string;
  }): Promise<InviteOutcome> {
    if (!this.email.graphConfigured) {
      return { status: 'not_configured' };
    }
    try {
      const branding = await this.branding.get();
      const appUrl = (this.config.get<string>('APP_BASE_URL') ?? '').replace(/\/$/, '');
      const apiOrigin = (this.config.get<string>('API_PUBLIC_URL') ?? args.apiOrigin).replace(/\/$/, '');
      const wordmark = branding.logos.sidebarWordmark;
      // The built-in wordmark is white artwork made for the coloured header band used here.
      const logoUrl = wordmark
        ? `${apiOrigin}/api/branding/asset/sidebarWordmark?v=${wordmark}`
        : `${appUrl}/white-logo-text-under.png`;
      const buttonBg = branding.colors.primary ?? '#1c75bc';
      const role = ROLE_LABELS[args.role] ?? { en: 'a team member', ar: 'عضو فريق' };

      const { subject, html } = generateInviteEmail({
        appName: branding.appName ?? 'Qanoon365',
        appUrl: appUrl || apiOrigin,
        logoUrl,
        headerBg: branding.colors.navBg ?? '#1c75bc',
        buttonBg,
        buttonText: branding.colors.primaryText ?? luminanceText(buttonBg),
        to: args.to,
        name: args.name,
        roleEn: role.en,
        roleAr: role.ar,
        invitedBy: args.invitedBy,
      });

      const result = await this.email.send({ to: args.to, subject, html });
      return result.success ? { status: 'sent' } : { status: 'failed', error: result.error ?? 'Unknown error' };
    } catch (error: any) {
      return { status: 'failed', error: error?.message ?? 'Unknown error' };
    }
  }
}
