'use client';

import { useLocale } from 'next-intl';
import { ExternalLink, Sparkles } from 'lucide-react';

// The standalone "Daleel AI Search for SharePoint" app. Override at build time
// with NEXT_PUBLIC_DALEEL_APP_URL; falls back to the current dev deployment.
const DALEEL_APP_URL =
  process.env.NEXT_PUBLIC_DALEEL_APP_URL ||
  'https://albasti-search-chat.bravewave-69a972d2.uaenorth.azurecontainerapps.io/';

export default function DaleelPage() {
  const locale = useLocale();
  const ar = locale === 'ar';

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border bg-card p-10 text-center shadow-sm">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-8" />
        </div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {ar ? 'دليل — البحث القانوني بالذكاء الاصطناعي' : 'Daleel — AI Legal Research'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {ar
            ? 'يبحث دليل في مكتبة مستندات الشركة على SharePoint ويقدّم إجابات مع الاستشهادات. يفتح في مساحة عمل دليل المخصصة.'
            : 'Daleel searches your firm’s SharePoint document library and answers with citations. It opens in the dedicated Daleel workspace.'}
        </p>
        <a
          href={DALEEL_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          {ar ? 'افتح دليل' : 'Open Daleel'}
          <ExternalLink className="size-4" />
        </a>
        <p className="mt-4 text-xs text-muted-foreground">
          {ar ? 'تسجيل الدخول عبر حساب Microsoft الخاص بك' : 'Sign in with your Microsoft account'}
        </p>
      </div>
    </div>
  );
}
