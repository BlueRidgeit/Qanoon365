'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  useConflicts,
  useResolveConflict,
  type ConflictRecord,
} from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  CheckCircle2,
  Clock,
  ExternalLink,
  Gavel,
  GitMerge,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  User,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type StatusFilter = 'all' | 'pending' | 'cleared' | 'confirmed_conflict' | 'waived';

const STATUS_TABS: { value: StatusFilter; label: string; icon: React.ElementType }[] = [
  { value: 'pending', label: 'Under Review', icon: Clock },
  { value: 'cleared', label: 'Cleared', icon: ShieldCheck },
  { value: 'confirmed_conflict', label: 'Conflict Identified', icon: ShieldX },
  { value: 'waived', label: 'Waiver Granted', icon: ShieldAlert },
  { value: 'all', label: 'All', icon: Shield },
];

const STATUS_STYLES: Record<string, { className: string; label: string; icon: React.ElementType }> = {
  pending: {
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
    label: 'Under Review',
    icon: Clock,
  },
  cleared: {
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    label: 'Cleared',
    icon: ShieldCheck,
  },
  confirmed_conflict: {
    className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25',
    label: 'Conflict Identified',
    icon: ShieldX,
  },
  waived: {
    className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/25',
    label: 'Waiver Granted',
    icon: ShieldAlert,
  },
};

const CONFIDENCE_STYLES: Record<string, { className: string; label: string }> = {
  high: {
    className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25',
    label: 'High Confidence',
  },
  medium: {
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
    label: 'Medium Confidence',
  },
  low: {
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    label: 'Low Confidence',
  },
};

const SOURCE_LABELS: Record<string, { label: string; className: string }> = {
  crm_data: {
    label: 'CRM Data',
    className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25',
  },
  court_records: {
    label: 'Court Records',
    className: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/25',
  },
  both: {
    label: 'CRM + Court Records',
    className: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/25',
  },
};

const RESOLUTION_OPTIONS = [
  { value: 'cleared', label: 'Cleared \u2014 No actual conflict' },
  { value: 'confirmed_conflict', label: 'Conflict Identified \u2014 Cannot proceed' },
  { value: 'waived', label: 'Waiver Granted \u2014 Proceed with acknowledgment' },
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

function formatDateTime(dateString?: string): string {
  if (!dateString) return '\u2014';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ConflictsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-[280px] rounded-xl" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ status }: { status: StatusFilter }) {
  const t = useTranslations('conflicts');

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-2xl bg-emerald-500/10 p-5 mb-5">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-xl font-semibold">{t('queueClear')}</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {t('queueClearDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-2xl bg-muted p-5 mb-5">
        <Shield className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{t('noConflicts')}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {t('noConflicts')}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resolve Dialog
// ---------------------------------------------------------------------------

function ResolveDialog({ conflict }: { conflict: ConflictRecord }) {
  const t = useTranslations('conflicts');
  const tres = useTranslations('resolutions');
  const [open, setOpen] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState('');
  const [notes, setNotes] = useState('');
  const resolveConflict = useResolveConflict();

  const isWaiver = resolutionStatus === 'waived';
  const canSubmit = resolutionStatus && (!isWaiver || notes.trim().length > 0);

  const handleResolve = async () => {
    if (!canSubmit) return;

    try {
      await resolveConflict.mutateAsync({
        id: conflict.id,
        resolutionStatus,
        resolutionNotes: notes.trim() || undefined,
      });
      toast.success(
        resolutionStatus === 'cleared'
          ? 'Conflict cleared successfully'
          : resolutionStatus === 'confirmed_conflict'
            ? 'Conflict confirmed \u2014 opportunity blocked'
            : 'Conflict waived \u2014 proceed with caution',
      );
      setOpen(false);
      setResolutionStatus('');
      setNotes('');
    } catch {
      toast.error('Failed to resolve conflict');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full mt-3">
          <Gavel className="mr-1.5 h-3.5 w-3.5" />
          {t('resolveConflict')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            {t('resolveConflict')}
          </DialogTitle>
          <DialogDescription>
            {t('resolveConflictDesc')}
          </DialogDescription>
        </DialogHeader>

        {/* Conflict summary */}
        <div className="rounded-lg bg-muted/50 border p-4 space-y-2 text-sm">
          <p className="font-medium">
            {conflict.matchedEntityType} match via {conflict.matchSource}
          </p>
          {conflict.matchField && (
            <p className="text-muted-foreground">
              Match field: <span className="font-mono text-foreground">{conflict.matchField}</span>
            </p>
          )}
          {conflict.courtCaseReference && (
            <p className="text-muted-foreground">
              Court ref: <span className="font-mono text-foreground">{conflict.courtCaseReference}</span>
            </p>
          )}
        </div>

        <div className="space-y-4">
          {/* Resolution select */}
          <div className="space-y-2">
            <Label>{t('resolution')}</Label>
            <Select value={resolutionStatus} onValueChange={setResolutionStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('selectResolution')} />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {tres(opt.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resolution notes */}
          <div className="space-y-2">
            <Label>
              {t('resolutionNotes')}
              {isWaiver && (
                <span className="ml-1 text-red-500 text-xs">(required for waiver)</span>
              )}
            </Label>
            <Textarea
              placeholder={t('resolutionNotesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={cn(
                isWaiver && !notes.trim() && 'border-red-500/50 focus-visible:border-red-500',
              )}
            />
            {isWaiver && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Waivers require documented justification per firm compliance policy.
                This will be included in the audit trail.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleResolve}
            disabled={!canSubmit || resolveConflict.isPending}
            className={cn(
              resolutionStatus === 'confirmed_conflict' && 'bg-red-600 hover:bg-red-700',
              resolutionStatus === 'waived' && 'bg-purple-600 hover:bg-purple-700',
            )}
          >
            {resolveConflict.isPending
              ? t('resolving')
              : t('resolve')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Conflict Card
// ---------------------------------------------------------------------------

function ConflictCard({ conflict }: { conflict: ConflictRecord }) {
  const ts = useTranslations('statuses');
  const tcf = useTranslations('confidenceLevels');
  const tms = useTranslations('matchSources');
  const isPending = conflict.resolutionStatus === 'pending';
  const statusStyle = STATUS_STYLES[conflict.resolutionStatus] ?? STATUS_STYLES.pending;
  const StatusIcon = statusStyle.icon;
  const confidenceStyle = CONFIDENCE_STYLES[conflict.matchConfidence ?? 'medium'] ?? CONFIDENCE_STYLES.medium;
  const sourceStyle = SOURCE_LABELS[conflict.matchSource ?? 'crm_data'] ?? SOURCE_LABELS.crm_data;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        isPending && 'border-amber-500/30 shadow-amber-500/5 shadow-lg hover:shadow-amber-500/10',
        !isPending && 'hover:shadow-md',
      )}
    >
      {/* Urgency indicator for pending */}
      {isPending && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
      )}

      <CardContent className="p-5">
        {/* Status + confidence row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge variant="outline" className={cn('text-xs gap-1', statusStyle.className)}>
            <StatusIcon className="h-3 w-3" />
            {ts(`conflict.${conflict.resolutionStatus}`)}
          </Badge>
          <Badge variant="outline" className={cn('text-xs', confidenceStyle.className)}>
            {tcf(conflict.matchConfidence ?? 'medium')}
          </Badge>
        </div>

        {/* Description — derived from matched entity + source */}
        <p className="text-sm font-medium leading-relaxed mb-3">
          {conflict.matchedEntityType} match via {conflict.matchSource}
          {conflict.confidenceScore != null && (
            <span className="text-muted-foreground"> ({conflict.confidenceScore}%)</span>
          )}
        </p>

        {/* Details */}
        <div className="space-y-2 text-xs text-muted-foreground">
          {/* Source */}
          <div className="flex items-center gap-2">
            <GitMerge className="h-3.5 w-3.5 shrink-0" />
            <span>Source:</span>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', sourceStyle.className)}>
              {tms(conflict.matchSource ?? 'crm_data')}
            </Badge>
          </div>

          {/* Matched entity */}
          {conflict.matchedEntityType && (
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>
                Matched: {conflict.matchedEntityType}
                {conflict.matchedEntityId && (
                  <span className="font-mono ml-1">{conflict.matchedEntityId.slice(0, 8)}</span>
                )}
              </span>
            </div>
          )}

          {/* Match field */}
          {conflict.matchField && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                Field: <span className="font-mono text-foreground">{conflict.matchField}</span>
              </span>
            </div>
          )}

          {/* Relationship path */}
          {conflict.relationshipPath && (
            <div className="flex items-center gap-2">
              <GitMerge className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                Path: <span className="font-mono text-foreground">{conflict.relationshipPath}</span>
              </span>
            </div>
          )}

          {/* Court case reference */}
          {conflict.courtCaseReference && (
            <div className="flex items-center gap-2">
              <Gavel className="h-3.5 w-3.5 shrink-0" />
              <span>
                Court Ref: <span className="font-mono text-foreground">{conflict.courtCaseReference}</span>
              </span>
            </div>
          )}
        </div>

        <Separator className="my-3" />

        {/* Opportunity link */}
        {conflict.opportunity ? (
          <Link
            href={`/opportunities/${conflict.opportunity.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mb-3"
          >
            <ExternalLink className="h-3 w-3" />
            {conflict.opportunity.name} ({conflict.opportunity.stage})
          </Link>
        ) : conflict.opportunityId ? (
          <Link
            href={`/opportunities/${conflict.opportunityId}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mb-3"
          >
            <ExternalLink className="h-3 w-3" />
            View Opportunity
          </Link>
        ) : null}

        {/* Dates */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Flagged {formatDate(conflict.createdAt)}</span>
        </div>

        {/* Actions or resolution info */}
        {isPending ? (
          <ResolveDialog conflict={conflict} />
        ) : (
          <div className="mt-3 rounded-lg bg-muted/50 p-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <StatusIcon className="h-3.5 w-3.5" />
              {ts(`conflict.${conflict.resolutionStatus}`)}
            </div>
            {conflict.resolutionNotes && (
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {conflict.resolutionNotes}
              </p>
            )}
            <div className="flex items-center gap-3 text-muted-foreground pt-1">
              {conflict.resolvedAt && <span>{formatDateTime(conflict.resolvedAt)}</span>}
              {conflict.resolvedBy && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {conflict.resolvedBy}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ConflictsPage() {
  const t = useTranslations('conflicts');
  const ts = useTranslations('statuses');
  const tc = useTranslations('common');
  const { data: conflicts, isLoading } = useConflicts();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

  const filtered = useMemo(() => {
    if (!conflicts) return [];
    let result = [...conflicts];

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.resolutionStatus === statusFilter);
    }

    // Pending first, then by date descending
    result.sort((a, b) => {
      if (a.resolutionStatus === 'pending' && b.resolutionStatus !== 'pending') return -1;
      if (a.resolutionStatus !== 'pending' && b.resolutionStatus === 'pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [conflicts, statusFilter]);

  const pendingCount = useMemo(
    () => conflicts?.filter((c) => c.resolutionStatus === 'pending').length ?? 0,
    [conflicts],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-amber-500/10 p-3">
          <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">
              {t('title')}
            </h1>
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                {pendingCount} pending
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Warning banner for pending */}
      {pendingCount > 0 && statusFilter === 'pending' && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {t('awaitingClearance', { count: pendingCount })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Opportunities with unresolved conflicts cannot proceed through the
              pipeline. Review each case and provide your determination.
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as StatusFilter)}
      >
        <TabsList>
          {STATUS_TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value}>
                <TabIcon className="mr-1.5 h-3.5 w-3.5" />
                {tab.value === 'all' ? ts('all') : ts(`conflict.${tab.value}`)}
                {tab.value === 'pending' && pendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Content */}
      {isLoading ? (
        <ConflictsSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState status={statusFilter} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((conflict) => (
            <ConflictCard key={conflict.id} conflict={conflict} />
          ))}
        </div>
      )}
    </div>
  );
}
