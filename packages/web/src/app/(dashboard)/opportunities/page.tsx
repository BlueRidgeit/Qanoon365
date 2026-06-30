'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Plus,
  TrendingUp,
  Trophy,
  Target,
  DollarSign,
  Loader2,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import {
  useOpportunities,
  useCreateOpportunity,
  useClients,
  type Opportunity,
} from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STAGE_STYLES: Record<
  string,
  { bg: string; text: string; ring: string }
> = {
  inquiry: {
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-300',
    ring: 'ring-slate-200 dark:ring-slate-700',
  },
  consultation: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    ring: 'ring-blue-200 dark:ring-blue-800',
  },
  proposal: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-200 dark:ring-amber-800',
  },
  retainer: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    ring: 'ring-purple-200 dark:ring-purple-800',
  },
  won: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
  },
  lost: {
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-600 dark:text-red-400 line-through',
    ring: 'ring-red-200 dark:ring-red-800',
  },
};

const CONFLICT_DOT_STYLES: Record<string, string> = {
  not_started: 'bg-slate-400',
  in_progress: 'bg-amber-400 animate-pulse',
  cleared: 'bg-emerald-400',
  conflict_identified: 'bg-red-500',
};

const KYC_DOT_STYLES: Record<string, string> = {
  not_started: 'bg-slate-400',
  documents_requested: 'bg-blue-400',
  under_review: 'bg-amber-400 animate-pulse',
  verified: 'bg-emerald-400',
  expired: 'bg-red-500',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StagePill({ stage }: { stage: string }) {
  const ts = useTranslations('statuses.engagement');
  const styles = STAGE_STYLES[stage];
  if (!styles) {
    return (
      <Badge variant="outline" className="capitalize">
        {stage}
      </Badge>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        styles.bg,
        styles.text,
        styles.ring,
      )}
    >
      {ts(stage)}
    </span>
  );
}

function ConflictDot({ status }: { status: string }) {
  const tsc = useTranslations('statuses.conflict');
  const dot = CONFLICT_DOT_STYLES[status] || CONFLICT_DOT_STYLES.not_started;
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full shrink-0', dot)} />
      <span className="text-xs text-muted-foreground">{tsc(status)}</span>
    </div>
  );
}

function KycDot({ status }: { status: string }) {
  const tsk = useTranslations('statuses.kycStatus');
  const dot = KYC_DOT_STYLES[status] || KYC_DOT_STYLES.not_started;
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('h-2 w-2 rounded-full shrink-0', dot)} />
      <span className="text-xs text-muted-foreground">{tsk(status)}</span>
    </div>
  );
}

function formatCurrency(value?: number | string) {
  if (value === undefined || value === null) return '--';
  const num = Number(value);
  if (isNaN(num)) return '--';
  if (num >= 1_000_000) return `AED ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `AED ${(num / 1_000).toFixed(0)}K`;
  return `AED ${num.toLocaleString()}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Metric Cards
// ---------------------------------------------------------------------------

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-semibold tracking-tight">{value}</p>
          </div>
          <div
            className="rounded-xl p-3 transition-colors"
            style={{
              backgroundColor: color ? `${color}15` : 'var(--accent)',
            }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: color || 'var(--muted-foreground)' }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Opportunities Table
// ---------------------------------------------------------------------------

function OpportunityTable({
  opportunities,
  isLoading,
}: {
  opportunities: Opportunity[];
  isLoading: boolean;
}) {
  const router = useRouter();
  const t = useTranslations('opportunities');
  const tc = useTranslations('common');
  const tp = useTranslations('practiceAreas');

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-xl bg-muted p-4 mb-4">
          <Briefcase className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{t('noEngagements')}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('noEngagementsHint')}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{tc('name')}</TableHead>
          <TableHead>{tc('client')}</TableHead>
          <TableHead>{t('stage')}</TableHead>
          <TableHead>{t('practiceArea')}</TableHead>
          <TableHead className="text-right">{t('estFees')}</TableHead>
          <TableHead>{t('conflictCheck')}</TableHead>
          <TableHead>{t('kyc')}</TableHead>
          <TableHead>{tc('created')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {opportunities.map((opp) => (
          <TableRow
            key={opp.id}
            className="cursor-pointer"
            onClick={() => router.push(`/opportunities/${opp.id}`)}
          >
            <TableCell className="font-medium">{opp.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {opp.client?.name || '--'}
            </TableCell>
            <TableCell><StagePill stage={opp.stage} /></TableCell>
            <TableCell>
              {opp.practiceArea ? (
                <Badge variant="outline" className="font-normal capitalize">
                  {tp(opp.practiceArea)}
                </Badge>
              ) : (
                <span className="text-muted-foreground">--</span>
              )}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatCurrency(opp.estimatedValue)}
            </TableCell>
            <TableCell><ConflictDot status={opp.conflictCheckStatus} /></TableCell>
            <TableCell><KycDot status={opp.kycStatus} /></TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDate(opp.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// New Opportunity Dialog
// ---------------------------------------------------------------------------

function NewOpportunityDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('opportunities');
  const tc = useTranslations('common');
  const tp = useTranslations('practiceAreas');
  const tf = useTranslations('feeArrangements');
  const createOpportunity = useCreateOpportunity();
  const { data: clients = [] } = useClients();

  const [form, setForm] = useState({
    name: '',
    clientId: '',
    practiceArea: '',
    assignedPartner: '',
    engagementType: '',
    estimatedValue: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm({
      name: '',
      clientId: '',
      practiceArea: '',
      assignedPartner: '',
      engagementType: '',
      estimatedValue: '',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId || !form.name || !form.practiceArea || !form.assignedPartner) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await createOpportunity.mutateAsync({
        clientId: form.clientId,
        name: form.name,
        practiceArea: form.practiceArea,
        assignedPartner: form.assignedPartner,
        engagementType: form.engagementType || undefined,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      });
      toast.success('Engagement created successfully');
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create engagement',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('newEngagement')}</DialogTitle>
          <DialogDescription>
            {t('createEngagementDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="oppName">{tc('name')} *</Label>
              <Input
                id="oppName"
                placeholder={t('engagementNamePlaceholder')}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />
            </div>

            {/* Client */}
            <div className="space-y-2">
              <Label>{tc('client')} *</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => updateField('clientId', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectClient')} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Practice Area */}
            <div className="space-y-2">
              <Label>{t('practiceArea')} *</Label>
              <Select
                value={form.practiceArea}
                onValueChange={(v) => updateField('practiceArea', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectPracticeArea')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate">{tp('corporate')}</SelectItem>
                  <SelectItem value="litigation">{tp('litigation')}</SelectItem>
                  <SelectItem value="real_estate">{tp('real_estate')}</SelectItem>
                  <SelectItem value="employment">{tp('employment')}</SelectItem>
                  <SelectItem value="regulatory">{tp('regulatory')}</SelectItem>
                  <SelectItem value="ip">{tp('ip')}</SelectItem>
                  <SelectItem value="banking_finance">
                    {tp('banking_finance')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned Partner */}
            <div className="space-y-2">
              <Label htmlFor="oppPartner">Assigned Partner (UUID) *</Label>
              <Input
                id="oppPartner"
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                value={form.assignedPartner}
                onChange={(e) => updateField('assignedPartner', e.target.value)}
                required
              />
            </div>

            {/* Engagement Type */}
            <div className="space-y-2">
              <Label>{t('feeArrangement')}</Label>
              <Select
                value={form.engagementType}
                onValueChange={(v) => updateField('engagementType', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectFeeArrangement')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retainer">{tf('retainer')}</SelectItem>
                  <SelectItem value="fixed_fee">{tf('fixed_fee')}</SelectItem>
                  <SelectItem value="hourly">{tf('hourly')}</SelectItem>
                  <SelectItem value="contingency">{tf('contingency')}</SelectItem>
                  <SelectItem value="pro_bono">{tf('pro_bono')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Value */}
            <div className="space-y-2">
              <Label htmlFor="oppValue">{t('estFees')} (AED)</Label>
              <Input
                id="oppValue"
                type="number"
                min="0"
                step="1000"
                placeholder="500000"
                value={form.estimatedValue}
                onChange={(e) => updateField('estimatedValue', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={createOpportunity.isPending}>
              {createOpportunity.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tc('loading')}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {t('newEngagement')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OpportunitiesPage() {
  const { data: opportunities = [], isLoading } = useOpportunities();
  const [dialogOpen, setDialogOpen] = useState(false);
  const t = useTranslations('opportunities');

  // Compute metrics
  const totalValue = opportunities.reduce(
    (sum, o) => sum + (Number(o.estimatedValue) || 0),
    0,
  );
  const wonCount = opportunities.filter((o) => o.stage === 'won').length;
  const closedCount = opportunities.filter(
    (o) => o.stage === 'won' || o.stage === 'lost',
  ).length;
  const conversionRate =
    closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Button variant="pink" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('newEngagement')}
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t('totalInstructions')}
          value={opportunities.length}
          icon={Target}
          color="var(--chart-1)"
        />
        <MetricCard
          title={t('estimatedFees')}
          value={formatCurrency(totalValue)}
          icon={DollarSign}
          color="var(--chart-2)"
        />
        <MetricCard
          title={t('instructed')}
          value={wonCount}
          icon={Trophy}
          color="var(--chart-2)"
        />
        <MetricCard
          title={t('instructionRate')}
          value={`${conversionRate}%`}
          icon={TrendingUp}
          color="var(--chart-4)"
        />
      </div>

      {/* Table */}
      <OpportunityTable
        opportunities={opportunities}
        isLoading={isLoading}
      />

      {/* Dialog */}
      <NewOpportunityDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
