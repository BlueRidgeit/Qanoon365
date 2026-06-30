'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  useKycRecords,
  useCreateKyc,
  useUpdateKyc,
  useClients,
  type KycRecord,
  type Client,
} from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  Plus,
  Shield,
  User,
  XCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type StatusFilter = 'all' | 'verified' | 'under_review' | 'documents_requested' | 'expired' | 'rejected';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'verified', label: 'Verified' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'documents_requested', label: 'Docs Requested' },
  { value: 'expired', label: 'Expired' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_STYLES: Record<string, { className: string; label: string; icon: React.ElementType }> = {
  verified: {
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    label: 'Verified',
    icon: CheckCircle2,
  },
  under_review: {
    className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25',
    label: 'Under Review',
    icon: Clock,
  },
  documents_requested: {
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
    label: 'Documents Requested',
    icon: FileCheck,
  },
  expired: {
    className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25',
    label: 'Expired',
    icon: AlertTriangle,
  },
  rejected: {
    className: 'bg-red-600/15 text-red-800 dark:text-red-300 border-red-600/25',
    label: 'Rejected',
    icon: XCircle,
  },
};

const RISK_STYLES: Record<string, { className: string; label: string }> = {
  low: {
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    label: 'Low Risk',
  },
  medium: {
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
    label: 'Medium Risk',
  },
  high: {
    className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25',
    label: 'High Risk',
  },
  pep: {
    className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/25',
    label: 'PEP',
  },
};

const KYC_STATUSES = [
  { value: 'verified', label: 'Verified' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'documents_requested', label: 'Documents Requested' },
  { value: 'expired', label: 'Expired' },
  { value: 'rejected', label: 'Rejected' },
];

const RISK_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'pep', label: 'PEP (Politically Exposed Person)' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateString?: string): string {
  if (!dateString) return '\u2014';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysSince(dateString?: string): number | null {
  if (!dateString) return null;
  const diff = Date.now() - new Date(dateString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isExpired(record: KycRecord): boolean {
  if (!record.idExpiryDate) return false;
  return new Date(record.idExpiryDate).getTime() < Date.now();
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function KycSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-[240px] rounded-xl" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ filtered }: { filtered: boolean }) {
  const t = useTranslations('kyc');
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-xl bg-muted p-4 mb-4">
        <Shield className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">
        {filtered ? t('noMatchingRecords') : t('noRecords')}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filtered
          ? t('noMatchingRecords')
          : t('noRecords')}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New KYC Dialog
// ---------------------------------------------------------------------------

function NewKycDialog({ clients }: { clients: Client[] }) {
  const t = useTranslations('kyc');
  const tc = useTranslations('common');
  const tr = useTranslations('riskLevels');
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [riskRating, setRiskRating] = useState('');
  const [idExpiryDate, setIdExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const createKyc = useCreateKyc();

  const handleCreate = async () => {
    if (!clientId) return;

    try {
      await createKyc.mutateAsync({
        clientId,
        verificationType: 'standard',
        riskRating: riskRating || undefined,
        idExpiryDate: idExpiryDate || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success('KYC record created');
      setOpen(false);
      setClientId('');
      setRiskRating('');
      setIdExpiryDate('');
      setNotes('');
    } catch {
      toast.error('Failed to create KYC record');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          {t('newRecord')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('newRecord')}</DialogTitle>
          <DialogDescription>
            {t('createRecordDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{tc('client')}</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('selectClient')} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('riskRating')}</Label>
            <Select value={riskRating} onValueChange={setRiskRating}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('selectRisk')} />
              </SelectTrigger>
              <SelectContent>
                {RISK_LEVELS.map((rl) => (
                  <SelectItem key={rl.value} value={rl.value}>
                    {tr(rl.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('idExpiryDate')}</Label>
            <Input
              type="date"
              value={idExpiryDate}
              onChange={(e) => setIdExpiryDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{tc('notes')}</Label>
            <Textarea
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!clientId || createKyc.isPending}
          >
            {createKyc.isPending ? 'Creating...' : 'Create Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// KYC Card
// ---------------------------------------------------------------------------

function KycCard({
  record,
  clients,
}: {
  record: KycRecord;
  clients: Client[];
}) {
  const ts = useTranslations('statuses');
  const tr = useTranslations('riskLevels');
  const updateKyc = useUpdateKyc();
  const expired = isExpired(record);
  const daysSinceExpiry = expired ? getDaysSince(record.idExpiryDate) : null;

  const statusStyle = STATUS_STYLES[record.status] ?? STATUS_STYLES.under_review;
  const StatusIcon = statusStyle.icon;
  const riskStyle = RISK_STYLES[record.riskRating ?? 'low'] ?? RISK_STYLES.low;

  const clientName =
    record.client?.name ??
    clients.find((c) => c.id === record.clientId)?.name ??
    'Unknown Client';

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateKyc.mutateAsync({
        id: record.id,
        status: newStatus,
      });
      toast.success(`Status updated to ${STATUS_STYLES[newStatus]?.label ?? newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200 hover:shadow-md',
        expired && 'border-red-500/30',
      )}
    >
      {/* Expired indicator */}
      {expired && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-red-600" />
      )}

      <CardContent className="p-5">
        {/* Client name + risk badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <Link
            href={`/clients/${record.clientId}`}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {clientName}
            </span>
          </Link>
          <Badge variant="outline" className={cn('text-xs shrink-0', riskStyle.className)}>
            {tr(record.riskRating ?? 'low')}
          </Badge>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className={cn('text-xs gap-1', statusStyle.className)}>
            <StatusIcon className="h-3 w-3" />
            {ts(`kycStatus.${record.status}`)}
          </Badge>
        </div>

        {/* Expired warning */}
        {expired && daysSinceExpiry !== null && (
          <div className="flex items-center gap-2 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                Expired
              </p>
              <p className="text-[11px] text-red-600/80 dark:text-red-400/80">
                {daysSinceExpiry} day{daysSinceExpiry !== 1 ? 's' : ''} since expiry
              </p>
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>Verified: {formatDate(record.verificationDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>ID Expires: {formatDate(record.idExpiryDate)}</span>
          </div>
        </div>

        {/* Notes */}
        {record.notes && (
          <>
            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground line-clamp-2">
              {record.notes}
            </p>
          </>
        )}

        <Separator className="my-3" />

        {/* Status update */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Update Status</Label>
          <Select
            value={record.status}
            onValueChange={handleStatusChange}
            disabled={updateKyc.isPending}
          >
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KYC_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {ts(`kycStatus.${s.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function KycPage() {
  const t = useTranslations('kyc');
  const ts = useTranslations('statuses');
  const tc = useTranslations('common');
  const { data: kycRecords, isLoading } = useKycRecords();
  const { data: clients } = useClients();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filtered = useMemo(() => {
    if (!kycRecords) return [];
    let result = [...kycRecords];

    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }

    // Sort: expired first, then by date
    result.sort((a, b) => {
      const aExpired = isExpired(a);
      const bExpired = isExpired(b);
      if (aExpired && !bExpired) return -1;
      if (!aExpired && bExpired) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [kycRecords, statusFilter]);

  // Compliance stats
  const stats = useMemo(() => {
    if (!kycRecords || kycRecords.length === 0) return { rate: 0, total: 0, verified: 0, expired: 0 };
    const total = kycRecords.length;
    const verified = kycRecords.filter((r) => r.status === 'verified').length;
    const expired = kycRecords.filter((r) => isExpired(r)).length;
    const rate = total > 0 ? Math.round((verified / total) * 100) : 0;
    return { rate, total, verified, expired };
  }, [kycRecords]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-emerald-500/10 p-3">
            <FileCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">
              {t('title')}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-muted-foreground">
                {stats.total} client{stats.total !== 1 ? 's' : ''} tracked
              </p>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    stats.rate >= 80
                      ? 'bg-emerald-500'
                      : stats.rate >= 50
                        ? 'bg-amber-500'
                        : 'bg-red-500',
                  )}
                />
                <span className="text-sm font-semibold">
                  {stats.rate}% compliance rate
                </span>
              </div>
              {stats.expired > 0 && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {stats.expired} expired
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <NewKycDialog clients={clients ?? []} />
      </div>

      {/* Filter tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
      >
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.value === 'all' ? ts('all') : ts(`kycStatus.${tab.value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <KycSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState filtered={statusFilter !== 'all'} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((record) => (
            <KycCard
              key={record.id}
              record={record}
              clients={clients ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
