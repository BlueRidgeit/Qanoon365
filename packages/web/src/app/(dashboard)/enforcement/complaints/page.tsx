'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComplaints, type CriminalComplaint } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { ComplaintForm } from '@/components/enforcement/complaint-form';
import { CourtFilter } from '@/components/enforcement/court-filter';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-yellow-400/20 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300 status-new-sparkle',
  under_investigation: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  referred_to_prosecution: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  closed: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ComplaintTable({ complaints, isLoading }: { complaints: CriminalComplaint[]; isLoading: boolean }) {
  const router = useRouter();
  const t = useTranslations('enforcement');
  const tc = useTranslations('common');

  if (isLoading) {
    return <div className="space-y-3 pt-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>;
  }

  if (complaints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-xl bg-muted p-4 mb-4"><AlertTriangle className="h-8 w-8 text-muted-foreground" /></div>
        <p className="text-sm font-medium">{t('noComplaints')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('noComplaintsHint')}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('complaintNumber')}</TableHead>
          <TableHead>{t('complaintType')}</TableHead>
          <TableHead>{t('court')}</TableHead>
          <TableHead>{t('respondentName')}</TableHead>
          <TableHead>{t('filedDate')}</TableHead>
          <TableHead>{tc('status')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {complaints.map((c) => (
          <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/enforcement/complaints/${c.id}`)}>
            <TableCell className="font-medium">{c.complaintNumber}</TableCell>
            <TableCell>{t(`complaintTypes.${c.complaintType}`)}</TableCell>
            <TableCell>{t(`courts.${c.court}`)}</TableCell>
            <TableCell className="truncate max-w-[200px]">{c.respondentName}</TableCell>
            <TableCell>{formatDate(c.filedDate)}</TableCell>
            <TableCell>
              <Badge variant="secondary" className={cn('border-0', STATUS_STYLES[c.status])}>
                {t(`complaintStatuses.${c.status}`)}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FilteredComplaints({ status, court, search }: { status: string; court: string; search: string }) {
  const params: Record<string, string> = {};
  if (status !== 'all') params.status = status;
  if (court !== 'all') params.court = court;
  if (search) params.search = search;

  const { data: complaints = [], isLoading } = useComplaints(Object.keys(params).length ? params : undefined);
  return <ComplaintTable complaints={complaints} isLoading={isLoading} />;
}

export default function ComplaintsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [court, setCourt] = useState('all');
  const [search, setSearch] = useState('');
  const t = useTranslations('enforcement');

  const statusTabs = [
    { value: 'all', label: t('allComplaints') },
    { value: 'new', label: t('complaintStatuses.new') },
    { value: 'under_investigation', label: t('complaintStatuses.under_investigation') },
    { value: 'referred_to_prosecution', label: t('complaintStatuses.referred_to_prosecution') },
    { value: 'closed', label: t('complaintStatuses.closed') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('complaintsTitle')}</h1>
          <p className="text-muted-foreground">{t('complaintsSubtitle')}</p>
        </div>
        <Button variant="pink" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('newComplaint')}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input placeholder={t('searchComplaints')} value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
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
            <FilteredComplaints status={tab.value} court={court} search={search} />
          </TabsContent>
        ))}
      </Tabs>

      <ComplaintForm open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
