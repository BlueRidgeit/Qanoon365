'use client';

import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const UAE_COURTS = [
  'dubai', 'sharjah', 'ajman', 'abu_dhabi', 'ras_al_khaimah',
  'fujairah', 'umm_al_quwain', 'dubai_rent', 'sharjah_rent',
] as const;

export function CourtFilter({
  value,
  onChange,
  includeAll = true,
}: {
  value: string;
  onChange: (court: string) => void;
  includeAll?: boolean;
}) {
  const t = useTranslations('enforcement');
  const tc = useTranslations('common');

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={t('selectCourt')} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && <SelectItem value="all">{tc('all')}</SelectItem>}
        {UAE_COURTS.map((court) => (
          <SelectItem key={court} value={court}>
            {t(`courts.${court}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
