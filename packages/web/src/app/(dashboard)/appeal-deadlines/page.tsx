'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Clock,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Plus,
  Search,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EnforcementStatCard } from '@/components/enforcement/enforcement-stat-card';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useAppealDeadlines,
  useAppealDeadlineStats,
  useUrgentDeadlines,
  useCreateAppealDeadline,
  type AppealDeadline,
} from '@/hooks/use-api';

const STATUS_STYLES: Record<string, string> = {
  upcoming: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400',
  filed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  missed: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  waived: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

const TAB_KEYS = ['all', 'upcoming', 'warning', 'critical', 'filed', 'missed', 'waived'] as const;

const COURTS = [
  'dubai',
  'sharjah',
  'ajman',
  'abu_dhabi',
  'ras_al_khaimah',
  'fujairah',
  'umm_al_quwain',
  'dubai_rent',
  'sharjah_rent',
] as const;

const APPEAL_TYPES = ['first_appeal', 'cassation', 'review'] as const;

function getDaysRemaining(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AppealDeadlinesPage() {
  const t = useTranslations('appealDeadlines');
  const tc = useTranslations('common');
  const te = useTranslations('enforcement');

  const { data: deadlines, isLoading } = useAppealDeadlines();
  const { data: stats } = useAppealDeadlineStats();
  const { data: urgentDeadlines } = useUrgentDeadlines();
  const createDeadline = useCreateAppealDeadline();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [fileNumber, setFileNumber] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientNameArabic, setClientNameArabic] = useState('');
  const [court, setCourt] = useState('');
  const [judgmentDate, setJudgmentDate] = useState('');
  const [appealType, setAppealType] = useState('');
  const [appealPeriodDays, setAppealPeriodDays] = useState('30');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = useMemo(() => {
    if (!deadlines) return [];
    return deadlines.filter((d) => {
      const matchesSearch =
        !search ||
        d.fileNumber.toLowerCase().includes(search.toLowerCase()) ||
        d.clientName.toLowerCase().includes(search.toLowerCase()) ||
        d.caseNumber?.toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeTab === 'all' || d.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [deadlines, search, activeTab]);

  const resetForm = () => {
    setFileNumber('');
    setCaseNumber('');
    setClientName('');
    setClientNameArabic('');
    setCourt('');
    setJudgmentDate('');
    setAppealType('');
    setAppealPeriodDays('30');
    setAssignedTo('');
    setNotes('');
  };

  const handleCreate = async () => {
    await createDeadline.mutateAsync({
      fileNumber,
      caseNumber,
      clientName,
      clientNameArabic: clientNameArabic || undefined,
      court,
      judgmentDate,
      appealType,
      appealPeriodDays: parseInt(appealPeriodDays, 10),
      assignedTo,
      notes: notes || undefined,
    });
    resetForm();
    setDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white font-heading">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white font-heading">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
          <div className="mt-2 h-1 w-24 rounded-full bg-gradient-to-r from-primary via-pink-500 to-amber-400" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('newDeadline')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('newDeadline')}</DialogTitle>
              <DialogDescription>{t('newDeadlineDesc')}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t('fileNumber')}</Label>
                <Input
                  value={fileNumber}
                  onChange={(e) => setFileNumber(e.target.value)}
                  placeholder={te('fileNumberPlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('caseNumber')}</Label>
                <Input
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder={te('caseNumberPlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('clientName')}</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t('clientNamePlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('clientNameArabic')}</Label>
                <Input
                  dir="rtl"
                  value={clientNameArabic}
                  onChange={(e) => setClientNameArabic(e.target.value)}
                  placeholder={t('clientNameArabicPlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label>{te('court')}</Label>
                <Select value={court} onValueChange={setCourt}>
                  <SelectTrigger>
                    <SelectValue placeholder={te('selectCourt')} />
                  </SelectTrigger>
                  <SelectContent>
                    {COURTS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {te(`courts.${c}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('judgmentDate')}</Label>
                <Input
                  type="date"
                  value={judgmentDate}
                  onChange={(e) => setJudgmentDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('appealType')}</Label>
                <Select value={appealType} onValueChange={setAppealType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectAppealType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {APPEAL_TYPES.map((at) => (
                      <SelectItem key={at} value={at}>
                        {t(`appealTypes.${at}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('appealPeriodDays')}</Label>
                <Input
                  type="number"
                  value={appealPeriodDays}
                  onChange={(e) => setAppealPeriodDays(e.target.value)}
                  min={1}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('assignedTo')}</Label>
                <Input
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder={t('assignedToPlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label>{tc('notes')}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('notesPlaceholder')}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {tc('cancel')}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!fileNumber || !clientName || !court || !judgmentDate || !appealType || !assignedTo || createDeadline.isPending}
              >
                {createDeadline.isPending ? tc('loading') : tc('create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <EnforcementStatCard
          title={t('totalDeadlines')}
          value={stats?.total ?? 0}
          icon={Clock}
        />
        <EnforcementStatCard
          title={t('criticalExpired')}
          value={stats?.critical ?? 0}
          icon={AlertOctagon}
          variant="warning"
        />
        <EnforcementStatCard
          title={t('warningDeadlines')}
          value={stats?.warning ?? 0}
          icon={AlertTriangle}
        />
        <EnforcementStatCard
          title={t('filedDeadlines')}
          value={stats?.filed ?? 0}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Urgent Deadlines Section */}
      {urgentDeadlines && urgentDeadlines.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {t('urgentDeadlines')}
            </h3>
            <Badge variant="secondary" className="bg-amber-200/50 text-amber-800 dark:bg-amber-800/30 dark:text-amber-300 border-0">
              {urgentDeadlines.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentDeadlines.map((d: AppealDeadline) => {
              const days = getDaysRemaining(d.deadlineDate);
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border bg-white dark:bg-gray-900 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{d.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.fileNumber} &middot; {te(`courts.${d.court}`)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn('border-0 shrink-0 ml-2', days <= 0 ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600')}
                  >
                    {days <= 0 ? t('expired') : t('daysRemaining', { days })}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search + Filter Tabs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchDeadlines')}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {TAB_KEYS.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className="whitespace-nowrap"
            >
              {t(`statuses.${tab}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CalendarClock className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">{search ? t('noMatchingDeadlines') : t('noDeadlines')}</p>
            {!search && <p className="text-xs mt-1">{t('noDeadlinesHint')}</p>}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc('status')}</TableHead>
                <TableHead>{t('fileNumber')}</TableHead>
                <TableHead>{t('clientName')}</TableHead>
                <TableHead>{t('caseNumber')}</TableHead>
                <TableHead>{te('court')}</TableHead>
                <TableHead>{t('appealType')}</TableHead>
                <TableHead>{t('deadlineDate')}</TableHead>
                <TableHead>{t('daysLeft')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => {
                const days = getDaysRemaining(d.deadlineDate);
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn('border-0', STATUS_STYLES[d.status])}
                      >
                        {t(`statuses.${d.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{d.fileNumber}</TableCell>
                    <TableCell className="truncate max-w-[150px]">{d.clientName}</TableCell>
                    <TableCell>{d.caseNumber || '-'}</TableCell>
                    <TableCell>{te(`courts.${d.court}`)}</TableCell>
                    <TableCell>{t(`appealTypes.${d.appealType}`)}</TableCell>
                    <TableCell>{new Date(d.deadlineDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'text-sm font-medium',
                          days <= 0
                            ? 'text-red-600 dark:text-red-400'
                            : days <= 7
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-muted-foreground',
                        )}
                      >
                        {days <= 0 ? t('expired') : days}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
