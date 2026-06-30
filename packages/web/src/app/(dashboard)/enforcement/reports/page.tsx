'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BarChart3 } from 'lucide-react';
import { useEnforcementReports } from '@/hooks/use-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

export default function EnforcementReportsPage() {
  const t = useTranslations('enforcement');
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));

  const params: Record<string, string> = {};
  if (month) params.month = month;
  if (year) params.year = year;

  const { data, isLoading } = useEnforcementReports(params);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('reportsTitle')}</h1>
        <p className="text-muted-foreground">{t('reportsSubtitle')}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="space-y-1">
          <Label className="text-xs">{t('month')}</Label>
          <Input type="number" min="1" max="12" value={month} onChange={(e) => setMonth(e.target.value)} className="w-24" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('year')}</Label>
          <Input type="number" min="2020" max="2030" value={year} onChange={(e) => setYear(e.target.value)} className="w-24" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-xl bg-muted p-4 mb-4"><BarChart3 className="h-8 w-8 text-muted-foreground" /></div>
          <p className="text-sm font-medium">{t('noReports')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border">
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold">{t('executionFilesPerUser')}</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('assignedTo')}</TableHead>
                  <TableHead className="text-right">{t('filesCount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data as any).files?.map((entry: any) => (
                  <TableRow key={entry.assignedTo}>
                    <TableCell className="font-medium">{entry.assignedTo}</TableCell>
                    <TableCell className="text-right">{entry._count?.id ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-xl border">
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold">{t('complaintsPerUser')}</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('assignedTo')}</TableHead>
                  <TableHead className="text-right">{t('complaintsCount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data as any).complaints?.map((entry: any) => (
                  <TableRow key={entry.assignedTo}>
                    <TableCell className="font-medium">{entry.assignedTo}</TableCell>
                    <TableCell className="text-right">{entry._count?.id ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
