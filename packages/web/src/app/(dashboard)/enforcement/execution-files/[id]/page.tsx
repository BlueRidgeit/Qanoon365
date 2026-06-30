'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Edit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useExecutionFile, useUpdateExecutionFile } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExecutionFileForm } from '@/components/enforcement/execution-file-form';
import { FollowUpConfig } from '@/components/enforcement/follow-up-config';
import { FollowUpHistory } from '@/components/enforcement/follow-up-history';
import { StalledBadge } from '@/components/enforcement/stalled-badge';

const STATUS_STYLES: Record<string, string> = {
  ongoing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  stopped: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

function formatAmount(amount: number, currency = 'AED') {
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ExecutionFileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('enforcement');
  const tc = useTranslations('common');
  const { data: file, isLoading } = useExecutionFile(id);
  const updateFile = useUpdateExecutionFile();
  const [editOpen, setEditOpen] = useState(false);

  async function handleStatusChange(status: string) {
    try {
      await updateFile.mutateAsync({ id, status });
      toast.success(t('statusUpdated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('updateFailed'));
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (!file) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/enforcement/execution-files')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{file.fileNumber}</h1>
              <Badge variant="secondary" className={cn('border-0', STATUS_STYLES[file.status])}>
                {t(`executionStatuses.${file.status}`)}
              </Badge>
              {file.isStalled && <StalledBadge />}
            </div>
            <p className="text-muted-foreground">{t(`courts.${file.court}`)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={file.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ongoing">{t('executionStatuses.ongoing')}</SelectItem>
              <SelectItem value="completed">{t('executionStatuses.completed')}</SelectItem>
              <SelectItem value="stopped">{t('executionStatuses.stopped')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4" />
            {tc('edit')}
          </Button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4 space-y-4">
          <h3 className="text-sm font-semibold">{t('fileDetails')}</h3>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-muted-foreground">{t('fileNumber')}</span>
            <span className="font-medium">{file.fileNumber}</span>
            {file.caseNumber && <>
              <span className="text-muted-foreground">{t('caseNumber')}</span>
              <span className="font-medium">{file.caseNumber}</span>
            </>}
            <span className="text-muted-foreground">{t('court')}</span>
            <span className="font-medium">{t(`courts.${file.court}`)}</span>
            <span className="text-muted-foreground">{t('filingDate')}</span>
            <span className="font-medium">{formatDate(file.filingDate)}</span>
            <span className="text-muted-foreground">{t('lastActivity')}</span>
            <span className="font-medium">{formatDate(file.lastActivityDate)}</span>
          </div>
        </div>

        <div className="rounded-xl border p-4 space-y-4">
          <h3 className="text-sm font-semibold">{t('partiesAndAmounts')}</h3>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-muted-foreground">{t('debtorName')}</span>
            <span className="font-medium">{file.debtorName}</span>
            {file.debtorNameArabic && <>
              <span className="text-muted-foreground">{t('debtorNameArabic')}</span>
              <span className="font-medium" dir="rtl">{file.debtorNameArabic}</span>
            </>}
            <span className="text-muted-foreground">{t('creditorName')}</span>
            <span className="font-medium">{file.creditorName}</span>
            <span className="text-muted-foreground">{t('claimAmount')}</span>
            <span className="font-medium">{formatAmount(file.claimAmount, file.currency)}</span>
            <span className="text-muted-foreground">{t('collectedAmount')}</span>
            <span className="font-medium">{formatAmount(file.collectedAmount, file.currency)}</span>
          </div>
        </div>
      </div>

      {file.notes && (
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-2">{tc('notes')}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{file.notes}</p>
        </div>
      )}

      <Separator />

      {/* Follow-Up Configuration */}
      <div>
        <h3 className="text-sm font-semibold mb-3">{t('autoFollowUp')}</h3>
        <FollowUpConfig executionFileId={id} court={file.court} />
      </div>

      <Separator />

      {/* Follow-Up History */}
      <div>
        <h3 className="text-sm font-semibold mb-3">{t('followUpHistory')}</h3>
        <FollowUpHistory executionFileId={id} />
      </div>

      <ExecutionFileForm open={editOpen} onOpenChange={setEditOpen} editData={file} />
    </div>
  );
}
