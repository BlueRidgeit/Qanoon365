'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function StalledBadge() {
  const t = useTranslations('enforcement');
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" />
      {t('stalled')}
    </Badge>
  );
}
