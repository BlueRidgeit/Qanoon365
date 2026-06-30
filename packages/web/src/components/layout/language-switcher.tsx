'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

function setLocaleCookie(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365}`;
}

export function LanguageSwitcher({ side = 'top' }: { side?: 'top' | 'right' | 'bottom' | 'left' }) {
  const locale = useLocale();
  const t = useTranslations('common');
  const [isPending, startTransition] = useTransition();

  const toggleLocale = () => {
    const next = locale === 'en' ? 'ar' : 'en';
    startTransition(() => {
      setLocaleCookie(next);
      window.location.reload();
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleLocale}
          disabled={isPending}
          className="text-muted-foreground hover:text-sidebar-foreground"
        >
          <Languages className="size-4" />
          <span className="sr-only">{t('language')}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side} sideOffset={8}>
        {locale === 'en' ? t('arabic') : t('english')}
      </TooltipContent>
    </Tooltip>
  );
}
