'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuthStore } from '@/lib/auth';
import {
  getMicrosoftAccount,
  getMicrosoftApiAccessToken,
  initializeMicrosoftMsal,
  isMicrosoftAuthConfigured,
  loginWithMicrosoftRedirect,
} from '@/lib/microsoft-auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function MicrosoftMark() {
  return (
    <span className="grid grid-cols-2 gap-0.5 rounded-sm bg-white/10 p-0.5">
      <span className="h-2.5 w-2.5 bg-[#f25022]" />
      <span className="h-2.5 w-2.5 bg-[#7fba00]" />
      <span className="h-2.5 w-2.5 bg-[#00a4ef]" />
      <span className="h-2.5 w-2.5 bg-[#ffb900]" />
    </span>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const t = useTranslations('login');
  const requestedReturnTo = searchParams.get('returnTo') || '/';
  const returnTo = requestedReturnTo.startsWith('/') ? requestedReturnTo : '/';

  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isConfigured, setIsConfigured] = useState(isMicrosoftAuthConfigured());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace(returnTo);
    }
  }, [isAuthenticated, returnTo, router]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      if (isAuthenticated()) {
        return;
      }

      setError(null);
      setIsBootstrapping(true);

      try {
        const configured = isMicrosoftAuthConfigured();
        if (!active) {
          return;
        }

        setIsConfigured(configured);
        if (!configured) {
          return;
        }

        await initializeMicrosoftMsal();
        const account = await getMicrosoftAccount();

        if (!account) {
          return;
        }

        const didExchange = await exchangeMicrosoftSession();
        if (didExchange && active) {
          router.replace(returnTo);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : t('microsoftError'));
        }
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [isAuthenticated, returnTo, router, t]);

  async function exchangeMicrosoftSession() {
    const accessToken = await getMicrosoftApiAccessToken();
    if (!accessToken) {
      return false;
    }

    const res = await fetch(`${API_BASE}/auth/microsoft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message || t('microsoftError'));
    }

    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
    return true;
  }

  async function handleMicrosoftSignIn() {
    setError(null);
    setIsLoading(true);

    try {
      await loginWithMicrosoftRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('microsoftError'));
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#1c75bc] via-[#287fbe] to-[#f3f6f9] px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 49px, rgb(255 255 255 / 0.2) 49px, rgb(255 255 255 / 0.2) 50px),
            repeating-linear-gradient(90deg, transparent, transparent 49px, rgb(255 255 255 / 0.2) 49px, rgb(255 255 255 / 0.2) 50px)
          `,
        }}
      />

      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgb(28_117_188_/_0.14)] blur-[150px]" />
      <div className="pointer-events-none absolute left-1/2 top-2/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgb(247_148_30_/_0.12)] blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }}
        className="relative z-10 w-full max-w-[440px]"
      >
        <Card className="border-[rgb(255_255_255_/_0.45)] bg-[rgb(255_255_255_/_0.92)] shadow-[0_24px_60px_rgba(28,117,188,0.22)] backdrop-blur-xl">
          <CardHeader className="pb-3 pt-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <Image
                src="/login-screen-logo.png"
                alt="Qanoon365"
                width={170}
                height={170}
                priority
                className="object-contain"
              />

              <Image
                src="/logo-text-under.png"
                alt={`${t('brandName')} ${t('brandDescriptor')}`}
                width={420}
                height={132}
                priority
                className="h-auto w-[300px] object-contain sm:w-[350px]"
              />

              <div className="space-y-1">
                <span className="font-tagline block text-sm font-semibold text-[#585d64]">
                  {t('taglineEn')}
                </span>
                <span
                  className="font-tagline block text-sm font-semibold text-[#585d64]"
                  dir="rtl"
                >
                  {t('taglineAr')}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <div className="flex flex-col gap-5">
              <div className="rounded-[1.6rem] border border-[rgb(28_117_188_/_0.18)] bg-[#dad9d9] px-5 py-4 text-center shadow-[0_16px_32px_rgba(88,93,100,0.12)]">
                <p className="text-base font-semibold text-primary">
                  {t('microsoftTitle')}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#585d64]">
                  {t('microsoftSubtitle')}
                </p>
              </div>

              {!isConfigured && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  {t('microsoftNotConfigured')}
                </div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  {error}
                </motion.div>
              )}

              <Button
                type="button"
                size="lg"
                disabled={isLoading || isBootstrapping || !isConfigured}
                onClick={handleMicrosoftSignIn}
                className="mt-1 flex h-11 w-full items-center gap-3 border border-[rgb(28_117_188_/_0.1)] bg-[#1c75bc] text-sm font-semibold tracking-wide text-white shadow-[0_16px_32px_rgba(28,117,188,0.28)] hover:bg-[#1668a9]"
              >
                {isLoading || isBootstrapping ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t('microsoftSigningIn')}
                  </>
                ) : (
                  <>
                    <MicrosoftMark />
                    {t('microsoftSignIn')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>

          <div className="pb-6 pt-0 text-center">
            <div className="mx-8 mb-4 h-px bg-gradient-to-r from-transparent via-[rgb(88_93_100_/_0.3)] to-transparent" />
            <p className="font-tagline text-xs text-[#585d64]">{t('footer')}</p>
            <p className="mt-1 text-[10px] tracking-[0.18em] text-[#585d64]">v0.9</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
