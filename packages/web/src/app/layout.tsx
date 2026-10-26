import type { Metadata } from 'next';
import { Inter, Geist_Mono, Montserrat, Noto_Sans_Arabic, Tajawal } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ThemeProvider } from '@/providers/theme-provider';
import { QueryProvider } from '@/providers/query-provider';
import { BrandingProvider } from '@/components/branding-provider';
import { buildThemeCss, logoSrc } from '@/lib/branding';
import { getApiBase, getBranding } from '@/lib/branding-server';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

// Optional font offered in Settings > Branding; only downloaded when it is selected.
const tajawal = Tajawal({
  variable: '--font-tajawal',
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  preload: false,
});

const notoArabic = Noto_Sans_Arabic({
  variable: '--font-arabic',
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const icon = branding.logos.favicon
    ? logoSrc(getApiBase(), 'favicon', branding.logos.favicon)
    : '/favicon.png';
  const name = branding.appName ?? 'Qanoon365';
  return {
    title: `${name} | Legal Intelligence Platform`,
    description: `${name} — AI-Powered Legal Intelligence Platform — منصة الذكاء القانوني`,
    icons: { icon, shortcut: icon, apple: icon },
  };
}

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const branding = await getBranding();
  const themeCss = buildThemeCss(branding);
  const apiBase = getApiBase();
  const publicBranding = {
    appName: branding.appName,
    logos: Object.fromEntries(
      (Object.entries(branding.logos) as Array<[keyof typeof branding.logos, number]>).map(([slot, version]) => [
        slot,
        logoSrc(apiBase, slot, version),
      ]),
    ),
  };
  const qanoonRuntimePublicEnv = {
    nextPublicAzureTenantId: process.env.NEXT_PUBLIC_AZURE_TENANT_ID,
    nextPublicAzureClientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID,
    nextPublicAzureApiScope: process.env.NEXT_PUBLIC_AZURE_API_SCOPE,
    nextPublicAzureRedirectPath: process.env.NEXT_PUBLIC_AZURE_REDIRECT_PATH,
  };
  const runtimePublicEnv = {
    nextPublicDaleelAzureTenantId: process.env.NEXT_PUBLIC_DALEEL_AZURE_TENANT_ID,
    nextPublicDaleelAzureClientId: process.env.NEXT_PUBLIC_DALEEL_AZURE_CLIENT_ID,
    nextPublicDaleelAzureApiScope: process.env.NEXT_PUBLIC_DALEEL_AZURE_API_SCOPE,
    nextPublicDaleelAzureRedirectPath: process.env.NEXT_PUBLIC_DALEEL_AZURE_REDIRECT_PATH,
  };

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${inter.variable} ${tajawal.variable} ${geistMono.variable} ${montserrat.variable} ${notoArabic.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {themeCss ? <style id="branding-theme" dangerouslySetInnerHTML={{ __html: themeCss }} /> : null}
      </head>
      <body className={`${inter.variable} ${tajawal.variable} ${geistMono.variable} ${montserrat.variable} ${notoArabic.variable} h-full antialiased ${locale === 'ar' ? 'font-arabic' : ''}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__QANOON_PUBLIC_ENV__ = ${JSON.stringify(qanoonRuntimePublicEnv).replace(/</g, '\\u003c')};`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__QANOON_DALEEL_PUBLIC_ENV__ = ${JSON.stringify(runtimePublicEnv).replace(/</g, '\\u003c')};`,
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <QueryProvider>
              <BrandingProvider value={publicBranding}>
                <TooltipProvider delayDuration={0}>
                  {children}
                  <Toaster richColors position={locale === 'ar' ? 'top-left' : 'top-right'} />
                </TooltipProvider>
              </BrandingProvider>
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
