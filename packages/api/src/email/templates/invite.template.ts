export interface InviteTemplateData {
  appName: string;
  appUrl: string;
  logoUrl: string;
  headerBg: string;
  buttonBg: string;
  buttonText: string;
  to: string;
  name?: string;
  roleEn: string;
  roleAr: string;
  invitedBy?: string;
}

const FONT = "'Segoe UI',Arial,sans-serif";

const esc = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

// Bilingual invitation: logo on a coloured header band, an Open button, Arabic block below.
export function generateInviteEmail(data: InviteTemplateData): { subject: string; html: string } {
  const app = esc(data.appName);
  const name = data.name?.trim() ? ` ${esc(data.name.trim())}` : '';
  const inviter = data.invitedBy ? `${esc(data.invitedBy)} has given you access` : 'You have been given access';
  const link = esc(data.appUrl);

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>body,td,p,a{font-family:${FONT}}</style></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:${FONT};color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td align="center" bgcolor="${data.headerBg}" style="background:${data.headerBg};padding:22px 24px"><img src="${esc(data.logoUrl)}" alt="${app}" width="220" style="display:block;max-width:220px;height:auto;border:0"></td></tr>
<tr><td style="padding:28px 28px 8px;font-size:15px;line-height:1.6;font-family:${FONT}">
<p style="margin:0 0 12px">Hello${name},</p>
<p style="margin:0 0 12px">${inviter} to <strong>${app}</strong> as ${esc(data.roleEn)}.</p>
<p style="margin:0 0 20px">Sign in with your Microsoft work account (${esc(data.to)}).</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 24px"><tr><td align="center" bgcolor="${data.buttonBg}" style="background-color:${data.buttonBg};border-radius:8px;padding:12px 28px;font-family:${FONT}"><a href="${link}" style="color:${data.buttonText};text-decoration:none;font-weight:bold;font-size:15px;font-family:${FONT}">Open ${app}</a></td></tr></table>
</td></tr>
<tr><td dir="rtl" style="padding:0 28px 24px;font-size:15px;line-height:1.7;text-align:right;border-top:1px solid #e5e7eb;font-family:${FONT}">
<p style="margin:16px 0 8px">مرحبًا${name}،</p>
<p style="margin:0 0 8px">تم منحك صلاحية الوصول إلى <strong>${app}</strong> بصفة ${esc(data.roleAr)}. سجّل الدخول باستخدام حساب Microsoft الخاص بعملك.</p>
<p style="margin:0"><a href="${link}" style="color:${data.buttonBg}">${link}</a></p>
</td></tr>
<tr><td style="background:#f9fafb;padding:12px 28px;font-size:12px;color:#6b7280;text-align:center;font-family:${FONT}">If you did not expect this message you can ignore it.</td></tr>
</table></td></tr></table></body></html>`;

  return { subject: `You've been invited to ${data.appName} | دعوة للانضمام`, html };
}
