export interface FollowUpTemplateData {
  fileNumber: string;
  court: string;
  debtorName: string;
  claimAmount: string;
  filingDate: string;
  firmName: string;
}

export function generateFollowUpEmail(
  data: FollowUpTemplateData,
  language: 'en' | 'ar' | 'both',
): { subject: string; html: string; text: string } {
  const enSubject = `Follow-up: Execution File ${data.fileNumber} — ${data.court}`;
  const arSubject = `متابعة: ملف التنفيذ ${data.fileNumber} — ${data.court}`;

  const subject = language === 'ar' ? arSubject : enSubject;

  const enBlock = `
    <div style="font-family: Arial, sans-serif; direction: ltr; text-align: left;">
      <p>Dear Court Registry,</p>
      <p>We are writing on behalf of <strong>${data.firmName}</strong> to respectfully follow up on the status of the following execution file:</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 12px; font-weight: bold;">File Number:</td><td style="padding: 4px 12px;">${data.fileNumber}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">Court:</td><td style="padding: 4px 12px;">${data.court}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">Debtor:</td><td style="padding: 4px 12px;">${data.debtorName}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">Claim Amount:</td><td style="padding: 4px 12px;">${data.claimAmount}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">Filing Date:</td><td style="padding: 4px 12px;">${data.filingDate}</td></tr>
      </table>
      <p>We kindly request an update on the current status of enforcement measures and any actions taken.</p>
      <p>Thank you for your cooperation.</p>
      <p>Best regards,<br/>${data.firmName}</p>
    </div>
  `;

  const arBlock = `
    <div style="font-family: 'Noto Sans Arabic', Arial, sans-serif; direction: rtl; text-align: right;">
      <p>حضرة قلم المحكمة الموقر،</p>
      <p>نكتب إليكم بالنيابة عن <strong>${data.firmName}</strong> للمتابعة باحترام بشأن حالة ملف التنفيذ التالي:</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 12px; font-weight: bold;">رقم الملف:</td><td style="padding: 4px 12px;">${data.fileNumber}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">المحكمة:</td><td style="padding: 4px 12px;">${data.court}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">المدين:</td><td style="padding: 4px 12px;">${data.debtorName}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">مبلغ المطالبة:</td><td style="padding: 4px 12px;">${data.claimAmount}</td></tr>
        <tr><td style="padding: 4px 12px; font-weight: bold;">تاريخ الإيداع:</td><td style="padding: 4px 12px;">${data.filingDate}</td></tr>
      </table>
      <p>نرجو تزويدنا بآخر المستجدات حول إجراءات التنفيذ المتخذة.</p>
      <p>شاكرين لكم حسن تعاونكم.</p>
      <p>مع أطيب التحيات،<br/>${data.firmName}</p>
    </div>
  `;

  let html: string;
  if (language === 'both') {
    html = `<div>${enBlock}<hr style="margin: 24px 0; border: none; border-top: 1px solid #ccc;" />${arBlock}</div>`;
  } else if (language === 'ar') {
    html = arBlock;
  } else {
    html = enBlock;
  }

  const text = `Follow-up: Execution File ${data.fileNumber}
Court: ${data.court}
Debtor: ${data.debtorName}
Claim Amount: ${data.claimAmount}
Filing Date: ${data.filingDate}
From: ${data.firmName}`;

  return { subject, html, text };
}
