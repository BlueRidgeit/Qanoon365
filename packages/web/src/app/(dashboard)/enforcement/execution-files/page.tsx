'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExecutionFiles, type ExecutionFile } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ExecutionFileForm } from '@/components/enforcement/execution-file-form';
import { StalledBadge } from '@/components/enforcement/stalled-badge';
import { CourtFilter } from '@/components/enforcement/court-filter';

const STATUS_STYLES: Record<string, string> = {
  ongoing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  stopped: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

function formatAmount(amount: number, currency = 'AED') {
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function FileTable({ files, isLoading }: { files: ExecutionFile[]; isLoading: boolean }) {
  const router = useRouter();
  const t = useTranslations('enforcement');
  const tc = useTranslations('common');

  if (isLoading) {
    return <div className="space-y-3 pt-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-xl bg-muted p-4 mb-4"><FileWarning className="h-8 w-8 text-muted-foreground" /></div>
        <p className="text-sm font-medium">{t('noFiles')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('noFilesHint')}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('fileNumber')}</TableHead>
          <TableHead>{t('court')}</TableHead>
          <TableHead>{t('debtorName')}</TableHead>
          <TableHead>{t('claimAmount')}</TableHead>
          <TableHead>{t('filingDate')}</TableHead>
          <TableHead>{tc('status')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {files.map((file) => (
          <TableRow key={file.id} className="cursor-pointer" onClick={() => router.push(`/enforcement/execution-files/${file.id}`)}>
            <TableCell className="font-medium">{file.fileNumber}</TableCell>
            <TableCell>{t(`courts.${file.court}`)}</TableCell>
            <TableCell className="truncate max-w-[200px]">{file.debtorName}</TableCell>
            <TableCell>{formatAmount(file.claimAmount, file.currency)}</TableCell>
            <TableCell>{formatDate(file.filingDate)}</TableCell>
            <TableCell className="flex items-center gap-2">
              <Badge variant="secondary" className={cn('border-0', STATUS_STYLES[file.status])}>
                {t(`executionStatuses.${file.status}`)}
              </Badge>
              {file.isStalled && <StalledBadge />}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FilteredFiles({ status, court, search }: { status: string; court: string; search: string }) {
  const params: Record<string, string> = {};
  if (status !== 'all') params.status = status;
  if (court !== 'all') params.court = court;
  if (search) params.search = search;
  if (status === 'stalled') {
    delete params.status;
    params.isStalled = 'true';
  }

  const { data: files = [], isLoading } = useExecutionFiles(Object.keys(params).length ? params : undefined);
  return <FileTable files={files} isLoading={isLoading} />;
}

export default function ExecutionFilesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [court, setCourt] = useState('all');
  const [search, setSearch] = useState('');
  const t = useTranslations('enforcement');

  const statusTabs = [
    { value: 'all', label: t('allFiles') },
    { value: 'ongoing', label: t('executionStatuses.ongoing') },
    { value: 'completed', label: t('executionStatuses.completed') },
    { value: 'stopped', label: t('executionStatuses.stopped') },
    { value: 'stalled', label: t('stalled') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('executionFilesTitle')}</h1>
          <p className="text-muted-foreground">{t('executionFilesSubtitle')}</p>
        </div>
        <Button variant="pink" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('newFile')}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input placeholder={t('searchFiles')} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <CourtFilter value={court} onChange={setCourt} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
        {statusTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <FilteredFiles status={tab.value} court={court} search={search} />
          </TabsContent>
        ))}
      </Tabs>

      <ExecutionFileForm open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
