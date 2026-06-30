'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const UAE_COURTS = [
  'dubai', 'sharjah', 'ajman', 'abu_dhabi', 'ras_al_khaimah',
  'fujairah', 'umm_al_quwain', 'dubai_rent', 'sharjah_rent',
] as const;

export function CourtGrid({ data }: { data: Record<string, number> }) {
  const t = useTranslations('enforcement');

  return (
    <div className="grid grid-cols-3 gap-3">
      {UAE_COURTS.map((court) => {
        const count = data[court] ?? 0;
        return (
          <div
            key={court}
            className={cn(
              'rounded-lg border p-3 text-center transition-colors',
              count > 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/50',
            )}
          >
            <p className="text-xs font-medium text-muted-foreground truncate">
              {t(`courts.${court}`)}
            </p>
            <p className={cn('text-xl font-bold mt-1', count > 0 ? 'text-primary' : 'text-muted-foreground')}>
              {count}
            </p>
          </div>
        );
      })}
    </div>
  );
}
