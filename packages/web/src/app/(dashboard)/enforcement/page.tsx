'use client';

import { useTranslations } from 'next-intl';
import { Gavel, FileWarning, AlertTriangle, AlertOctagon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEnforcementDashboard } from '@/hooks/use-api';
import { EnforcementStatCard } from '@/components/enforcement/enforcement-stat-card';
import { CourtGrid } from '@/components/enforcement/court-grid';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

const STATUS_STYLES: Record<string, string> = {
  ongoing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  stopped: 'bg-red-500/10 text-red-600 dark:text-red-400',
  new: 'bg-yellow-400/20 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300 status-new-sparkle',
  under_investigation: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  referred_to_prosecution: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  closed: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

function formatAmount(amount: number, currency = 'AED') {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function EnforcementDashboardPage() {
  const t = useTranslations('enforcement');
  const tc = useTranslations('common');
  const { data, isLoading } = useEnforcementDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('dashboardTitle')}</h1>
          <p className="text-muted-foreground">{t('dashboardSubtitle')}</p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const myStats = data?.myStats ?? { myFiles: 0, myComplaints: 0 };
  const overallStats = data?.overallStats ?? { stalledCount: 0, byStatus: {} as Record<string, number>, byCourt: {} };
  const courtGrid = data?.courtGrid ?? {};
  const complaintStats = data?.complaintStats ?? { byType: {} as Record<string, number>, byStatus: {} };
  const latestFiles = data?.latestFiles ?? [];
  const latestComplaints = data?.latestComplaints ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('dashboardTitle')}</h1>
        <p className="text-muted-foreground">{t('dashboardSubtitle')}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <EnforcementStatCard
          title={t('myExecutionFiles')}
          value={myStats.myFiles}
          icon={FileWarning}
        />
        <EnforcementStatCard
          title={t('myComplaints')}
          value={myStats.myComplaints}
          icon={AlertTriangle}
        />
        <EnforcementStatCard
          title={t('stalledFiles')}
          value={overallStats.stalledCount}
          icon={AlertOctagon}
          variant={overallStats.stalledCount > 0 ? 'warning' : 'default'}
        />
        <EnforcementStatCard
          title={t('totalActive')}
          value={overallStats.byStatus?.ongoing ?? 0}
          icon={Gavel}
        />
      </div>

      {/* Court Grid + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-3">{t('filesByCourt')}</h3>
          <CourtGrid data={courtGrid} />
        </div>
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-3">{t('complaintsByType')}</h3>
          <div className="space-y-2">
            {Object.entries(complaintStats.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm">{t(`complaintTypes.${type}`)}</span>
                <Badge variant="secondary">{count as number}</Badge>
              </div>
            ))}
            {Object.keys(complaintStats.byType).length === 0 && (
              <p className="text-sm text-muted-foreground">{t('noComplaints')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Latest Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold">{t('latestFiles')}</h3>
          </div>
          {latestFiles.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{t('noFiles')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('fileNumber')}</TableHead>
                  <TableHead>{t('debtorName')}</TableHead>
                  <TableHead>{t('claimAmount')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">{file.fileNumber}</TableCell>
                    <TableCell className="truncate max-w-[150px]">{file.debtorName}</TableCell>
                    <TableCell>{formatAmount(file.claimAmount, file.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('border-0', STATUS_STYLES[file.status])}>
                        {t(`executionStatuses.${file.status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="rounded-xl border">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold">{t('latestComplaints')}</h3>
          </div>
          {latestComplaints.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">{t('noComplaints')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('complaintNumber')}</TableHead>
                  <TableHead>{t('respondentName')}</TableHead>
                  <TableHead>{t('complaintType')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestComplaints.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.complaintNumber}</TableCell>
                    <TableCell className="truncate max-w-[150px]">{c.respondentName}</TableCell>
                    <TableCell>{t(`complaintTypes.${c.complaintType}`)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('border-0', STATUS_STYLES[c.status])}>
                        {t(`complaintStatuses.${c.status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
