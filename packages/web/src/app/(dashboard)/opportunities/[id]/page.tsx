'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  FileCheck,
  Check,
  X,
  Building2,
  User,
  Briefcase,
  DollarSign,
  Calendar,
  Clock,
  Tag,
  StickyNote,
  Loader2,
  Send,
  MessageSquare,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import {
  useOpportunity,
  useLead,
  useUpdateOpportunity,
  useAdvanceStage,
  useConflicts,
  useResolveConflict,
  useRunConflictCheck,
  useKycRecords,
  useCreateKyc,
  useActivities,
  useCreateActivity,
  type Opportunity,
  type ConflictRecord,
  type Activity,
} from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { RecordDocumentsPanel } from '@/components/documents/record-documents-panel';
import { buildCourtIntelContextHref } from '@/lib/court-intel-context';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = ['inquiry', 'consultation', 'proposal', 'retainer', 'won'] as const;
type PipelineStage = (typeof PIPELINE_STAGES)[number];

const STAGE_META: Record<
  string,
  { label: string; gradient: string; activeBg: string; activeText: string }
> = {
  inquiry: {
    label: 'Inquiry',
    gradient: 'from-slate-400 to-slate-500',
    activeBg: 'bg-slate-100 dark:bg-slate-800/60',
    activeText: 'text-slate-700 dark:text-slate-300',
  },
  consultation: {
    label: 'Consultation',
    gradient: 'from-blue-400 to-blue-600',
    activeBg: 'bg-blue-50 dark:bg-blue-950/40',
    activeText: 'text-blue-700 dark:text-blue-300',
  },
  proposal: {
    label: 'Proposal',
    gradient: 'from-amber-400 to-amber-600',
    activeBg: 'bg-amber-50 dark:bg-amber-950/40',
    activeText: 'text-amber-700 dark:text-amber-300',
  },
  retainer: {
    label: 'Retainer',
    gradient: 'from-purple-400 to-purple-600',
    activeBg: 'bg-purple-50 dark:bg-purple-950/40',
    activeText: 'text-purple-700 dark:text-purple-300',
  },
  won: {
    label: 'Won',
    gradient: 'from-emerald-400 to-emerald-600',
    activeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    activeText: 'text-emerald-700 dark:text-emerald-300',
  },
  lost: {
    label: 'Lost',
    gradient: 'from-red-400 to-red-600',
    activeBg: 'bg-red-50 dark:bg-red-950/40',
    activeText: 'text-red-600 dark:text-red-400',
  },
};

const CONFLICT_CHECK_STYLES: Record<string, { color: string; label: string }> = {
  not_started: { color: 'text-slate-400', label: 'Not started' },
  in_progress: { color: 'text-amber-500', label: 'In progress' },
  cleared: { color: 'text-emerald-500', label: 'Cleared' },
  conflict_identified: { color: 'text-red-500', label: 'Conflict found' },
};

const KYC_STATUS_STYLES: Record<string, { color: string; label: string }> = {
  not_started: { color: 'text-slate-400', label: 'Not started' },
  documents_requested: { color: 'text-blue-400', label: 'Documents requested' },
  under_review: { color: 'text-amber-500', label: 'Under review' },
  verified: { color: 'text-emerald-500', label: 'Verified' },
  expired: { color: 'text-red-500', label: 'Expired' },
};

const PRACTICE_AREA_LABELS: Record<string, string> = {
  corporate: 'Corporate',
  litigation: 'Litigation',
  real_estate: 'Real Estate',
  employment: 'Employment',
  regulatory: 'Regulatory',
  ip: 'IP',
  banking_finance: 'Banking & Finance',
};

const ENGAGEMENT_TYPE_LABELS: Record<string, string> = {
  retainer: 'Retainer',
  fixed_fee: 'Fixed Fee',
  hourly: 'Hourly',
  contingency: 'Contingency',
  pro_bono: 'Pro Bono',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value?: number | string) {
  if (value === undefined || value === null) return '--';
  const num = Number(value);
  if (isNaN(num)) return '--';
  return `AED ${num.toLocaleString()}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stagePill(stage: string) {
  const meta = STAGE_META[stage];
  if (!meta) {
    return (
      <Badge variant="outline" className="capitalize">
        {stage}
      </Badge>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10',
        meta.activeBg,
        meta.activeText,
      )}
    >
      {meta.label}
    </span>
  );
}

function getNextStage(current: string): PipelineStage | null {
  const idx = PIPELINE_STAGES.indexOf(current as PipelineStage);
  if (idx === -1 || idx >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[idx + 1];
}

function getKycVerificationType(clientType?: string) {
  return clientType === 'individual' ? 'individual_kyc' : 'corporate_kyc';
}

function getAdvanceBlockReason(
  nextStage: PipelineStage | null,
  conflictCheckStatus: string,
  kycStatus: string,
  hasPendingConflicts: boolean,
) {
  if (!nextStage) return null;
  if (nextStage === 'proposal' && (conflictCheckStatus !== 'cleared' || hasPendingConflicts)) {
    return 'Resolve the conflict check before moving this engagement to proposal.';
  }
  if (nextStage === 'retainer' && kycStatus !== 'verified') {
    return 'Client KYC must be verified before moving to retainer.';
  }
  if (nextStage === 'won') {
    if (conflictCheckStatus !== 'cleared' || hasPendingConflicts) {
      return 'Resolve the conflict check before marking this engagement as won.';
    }
    if (kycStatus !== 'verified') {
      return 'Client KYC must be verified before marking this engagement as won.';
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Stage Progression Bar  -- signature UX element
// ---------------------------------------------------------------------------

function StageProgressionBar({
  currentStage,
  conflictCheckStatus,
  kycStatus,
}: {
  currentStage: string;
  conflictCheckStatus: string;
  kycStatus: string;
}) {
  const isLost = currentStage === 'lost';
  const currentIndex = PIPELINE_STAGES.indexOf(currentStage as PipelineStage);

  return (
    <div className="w-full">
      {/* Main progression track */}
      <div className="relative">
        {/* Background track line */}
        <div className="absolute top-5 left-0 right-0 h-[2px] bg-border" />
        {/* Filled track line */}
        {!isLost && currentIndex >= 0 && (
          <div
            className="absolute top-5 left-0 h-[2px] bg-gradient-to-r from-primary to-primary/80 transition-all duration-700 ease-out"
            style={{
              width: `${(currentIndex / (PIPELINE_STAGES.length - 1)) * 100}%`,
            }}
          />
        )}

        {/* Stage nodes */}
        <div className="relative flex items-start justify-between">
          {PIPELINE_STAGES.map((stage, index) => {
            const meta = STAGE_META[stage];
            const isCompleted = !isLost && currentIndex > index;
            const isCurrent = !isLost && currentIndex === index;
            const isFuture = isLost || currentIndex < index;

            // Gate indicators (shown between stages)
            const showConflictGate = stage === 'proposal';
            const showKycGate = stage === 'retainer';

            return (
              <div key={stage} className="flex flex-col items-center relative" style={{ width: `${100 / PIPELINE_STAGES.length}%` }}>
                {/* Gate indicators positioned above the connector line before this stage */}
                {(showConflictGate || showKycGate) && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              'flex items-center justify-center rounded-md p-1 transition-all',
                              showConflictGate && conflictCheckStatus === 'cleared' && 'bg-emerald-100 dark:bg-emerald-900/30',
                              showConflictGate && conflictCheckStatus === 'conflict_identified' && 'bg-red-100 dark:bg-red-900/30',
                              showConflictGate && conflictCheckStatus === 'in_progress' && 'bg-amber-100 dark:bg-amber-900/30',
                              showConflictGate && (conflictCheckStatus === 'not_started') && 'bg-slate-100 dark:bg-slate-800/50',
                              showKycGate && kycStatus === 'verified' && 'bg-emerald-100 dark:bg-emerald-900/30',
                              showKycGate && kycStatus === 'under_review' && 'bg-amber-100 dark:bg-amber-900/30',
                              showKycGate && kycStatus === 'documents_requested' && 'bg-blue-100 dark:bg-blue-900/30',
                              showKycGate && (kycStatus === 'not_started') && 'bg-slate-100 dark:bg-slate-800/50',
                              showKycGate && kycStatus === 'expired' && 'bg-red-100 dark:bg-red-900/30',
                            )}
                          >
                            {showConflictGate && (
                              <Shield
                                className={cn(
                                  'h-3.5 w-3.5',
                                  CONFLICT_CHECK_STYLES[conflictCheckStatus]?.color || 'text-slate-400',
                                )}
                              />
                            )}
                            {showKycGate && (
                              <FileCheck
                                className={cn(
                                  'h-3.5 w-3.5',
                                  KYC_STATUS_STYLES[kycStatus]?.color || 'text-slate-400',
                                )}
                              />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {showConflictGate && (
                            <span>
                              Conflict check: {CONFLICT_CHECK_STYLES[conflictCheckStatus]?.label || 'Not started'}
                            </span>
                          )}
                          {showKycGate && (
                            <span>
                              KYC: {KYC_STATUS_STYLES[kycStatus]?.label || 'Not started'}
                            </span>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {/* Node circle */}
                <div
                  className={cn(
                    'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-500',
                    // Completed: filled with gradient, checkmark
                    isCompleted && 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25',
                    // Current: prominent ring with pulse
                    isCurrent && 'border-primary bg-background shadow-lg shadow-primary/20',
                    // Future: muted
                    isFuture && 'border-muted-foreground/20 bg-muted text-muted-foreground/40',
                    // Lost special
                    isLost && 'border-muted-foreground/20 bg-muted text-muted-foreground/30',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4.5 w-4.5 stroke-[2.5]" />
                  ) : isCurrent ? (
                    <>
                      {/* Subtle pulsing ring */}
                      <span className="absolute inset-0 rounded-full animate-ping bg-primary/10" />
                      <span
                        className={cn(
                          'relative h-3 w-3 rounded-full bg-gradient-to-br',
                          meta.gradient,
                        )}
                      />
                    </>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'mt-2.5 text-xs font-medium transition-colors duration-300',
                    isCompleted && 'text-foreground',
                    isCurrent && 'text-foreground font-semibold',
                    isFuture && 'text-muted-foreground/60',
                  )}
                >
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lost indicator */}
      {isLost && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 p-3 border border-red-200/50 dark:border-red-800/30">
          <X className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            Not Instructed
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Grid Item
// ---------------------------------------------------------------------------

function DetailItem({
  icon: Icon,
  label,
  value,
  className: extraClass,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-3 py-3', extraClass)}>
      <div className="mt-0.5 rounded-lg bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium">
          {value || <span className="text-muted-foreground">--</span>}
        </p>
      </div>
    </div>
  );
}

function ResolveConflictDialog({
  conflict,
  opportunityId,
}: {
  conflict: ConflictRecord;
  opportunityId: string;
}) {
  const [open, setOpen] = useState(false);
  const [resolutionStatus, setResolutionStatus] = useState('');
  const [notes, setNotes] = useState('');
  const resolveConflict = useResolveConflict();

  const isWaiver = resolutionStatus === 'waived';
  const canSubmit = resolutionStatus.length > 0 && (!isWaiver || notes.trim().length > 0);

  async function handleResolve() {
    if (!canSubmit) return;

    try {
      await resolveConflict.mutateAsync({
        id: conflict.id,
        resolutionStatus,
        resolutionNotes: notes.trim() || undefined,
        opportunityId,
      });
      toast.success(
        resolutionStatus === 'cleared'
          ? 'Conflict cleared'
          : resolutionStatus === 'confirmed_conflict'
            ? 'Conflict confirmed'
            : 'Conflict waived',
      );
      setOpen(false);
      setResolutionStatus('');
      setNotes('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve conflict');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        Resolve
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resolve Conflict</DialogTitle>
          <DialogDescription>
            Mark this conflict as cleared, confirmed, or waived with an audit trail note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">
              {conflict.matchedEntityType} match via {conflict.matchSource}
            </p>
            {conflict.relationshipPath && (
              <p className="mt-1 text-muted-foreground">{conflict.relationshipPath}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Resolution</Label>
            <Select value={resolutionStatus} onValueChange={setResolutionStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select resolution" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cleared">Cleared</SelectItem>
                <SelectItem value="confirmed_conflict">Confirmed conflict</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`conflict-notes-${conflict.id}`}>
              Notes {isWaiver && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={`conflict-notes-${conflict.id}`}
              rows={4}
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Add a short rationale for the resolution..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleResolve} disabled={!canSubmit || resolveConflict.isPending}>
            {resolveConflict.isPending ? 'Saving...' : 'Save resolution'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OpportunityActionBar({
  opportunity,
  pendingConflicts,
  kycStatus,
  onJumpToConflicts,
}: {
  opportunity: Opportunity;
  pendingConflicts: ConflictRecord[];
  kycStatus: string;
  onJumpToConflicts: () => void;
}) {
  const runConflictCheck = useRunConflictCheck();
  const createKyc = useCreateKyc();
  const { data: sourceLead } = useLead(opportunity.leadId ?? '');
  const latestMatter = opportunity.matters?.[0];
  const aiResearchHref = buildCourtIntelContextHref({
    sourceEntityType: 'opportunity',
    sourceEntityId: opportunity.id,
    sourceTitle: opportunity.name,
    clientName: opportunity.client?.name,
    practiceArea: opportunity.practiceArea,
    jurisdiction: sourceLead?.jurisdiction,
    caseType: sourceLead?.caseType,
    defaultQueryType: 'contextual_case_law',
  });

  const canRunConflictCheck =
    opportunity.conflictCheckStatus === 'not_started' && pendingConflicts.length === 0;
  const canStartKyc = kycStatus === 'not_started';

  async function handleRunConflictCheck() {
    try {
      const result = await runConflictCheck.mutateAsync({ opportunityId: opportunity.id });
      toast.success(
        result.conflictsDetected > 0
          ? `${result.conflictsDetected} conflict${result.conflictsDetected === 1 ? '' : 's'} flagged`
          : 'Conflict check cleared',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to run conflict check');
    }
  }

  async function handleStartKyc() {
    try {
      await createKyc.mutateAsync({
        clientId: opportunity.clientId,
        verificationType: getKycVerificationType(opportunity.client?.clientType),
      });
      toast.success('KYC record created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start KYC');
    }
  }

  return (
    <Card className="border-border/60 bg-muted/20">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium">Blockers and next steps</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn('text-xs', CONFLICT_CHECK_STYLES[opportunity.conflictCheckStatus]?.color === 'text-emerald-500' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted')}>
              Conflict: {CONFLICT_CHECK_STYLES[opportunity.conflictCheckStatus]?.label ?? opportunity.conflictCheckStatus}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', KYC_STATUS_STYLES[kycStatus]?.color === 'text-emerald-500' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted')}>
              KYC: {KYC_STATUS_STYLES[kycStatus]?.label ?? kycStatus}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {pendingConflicts.length > 0
              ? `${pendingConflicts.length} pending conflict review${pendingConflicts.length === 1 ? '' : 's'} are blocking this engagement.`
              : kycStatus !== 'verified'
                ? 'KYC still needs to be started or completed before later stage moves.'
                : 'No immediate blocker is preventing progression.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canRunConflictCheck && (
            <Button onClick={handleRunConflictCheck} disabled={runConflictCheck.isPending}>
              {runConflictCheck.isPending ? 'Running...' : 'Run conflict check'}
            </Button>
          )}
          {pendingConflicts.length > 0 && (
            <Button variant="outline" onClick={onJumpToConflicts}>
              Review conflicts
            </Button>
          )}
          {canStartKyc && (
            <Button variant="outline" onClick={handleStartKyc} disabled={createKyc.isPending}>
              {createKyc.isPending ? 'Starting KYC...' : 'Start KYC'}
            </Button>
          )}
          {latestMatter && (
            <Button variant="outline" asChild>
              <Link href={`/matters/${latestMatter.id}`}>Open matter</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={aiResearchHref}>AI research</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/clients/${opportunity.clientId}`}>Open client</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Edit Engagement Dialog
// ---------------------------------------------------------------------------

function EditOpportunityDialog({
  open,
  onOpenChange,
  opportunity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity;
}) {
  const updateOpportunity = useUpdateOpportunity();

  const [form, setForm] = useState({
    name: opportunity.name || '',
    estimatedValue: opportunity.estimatedValue?.toString() || '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateOpportunity.mutateAsync({
        id: opportunity.id,
        name: form.name || undefined,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
      });
      toast.success('Engagement updated');
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update engagement',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Engagement</DialogTitle>
          <DialogDescription>Update engagement details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editName">Name</Label>
            <Input
              id="editName"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="editValue">Estimated Fees (AED)</Label>
            <Input
              id="editValue"
              type="number"
              min="0"
              step="1000"
              value={form.estimatedValue}
              onChange={(e) => updateField('estimatedValue', e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateOpportunity.isPending}>
              {updateOpportunity.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Details Tab
// ---------------------------------------------------------------------------

function DetailsTab({
  opportunity,
  currentKycStatus,
}: {
  opportunity: Opportunity;
  currentKycStatus: string;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const { data: sourceLead } = useLead(opportunity.leadId ?? '');
  const latestMatter = opportunity.matters?.[0];

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              Engagement Details
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
            <DetailItem
              icon={Briefcase}
              label="Name"
              value={opportunity.name}
            />
            <DetailItem
              icon={Building2}
              label="Client"
              value={opportunity.client?.name}
            />
            <DetailItem
              icon={Tag}
              label="Practice Area"
              value={
                opportunity.practiceArea
                  ? PRACTICE_AREA_LABELS[opportunity.practiceArea] || opportunity.practiceArea
                  : undefined
              }
            />
            <DetailItem
              icon={Tag}
              label="Engagement Type"
              value={
                opportunity.engagementType
                  ? ENGAGEMENT_TYPE_LABELS[opportunity.engagementType] || opportunity.engagementType
                  : undefined
              }
            />
            <DetailItem
              icon={DollarSign}
              label="Estimated Fees"
              value={formatCurrency(opportunity.estimatedValue)}
            />
            <DetailItem
              icon={User}
              label="Assigned Partner"
              value={opportunity.assignedPartner}
            />
            <DetailItem
              icon={Shield}
              label="Conflict Check"
              value={CONFLICT_CHECK_STYLES[opportunity.conflictCheckStatus]?.label || opportunity.conflictCheckStatus}
            />
            <DetailItem
              icon={FileCheck}
              label="KYC Status"
              value={KYC_STATUS_STYLES[currentKycStatus]?.label || currentKycStatus}
            />
            <DetailItem
              icon={Clock}
              label="Created"
              value={formatDate(opportunity.createdAt)}
            />
            <DetailItem
              icon={Clock}
              label="Updated"
              value={formatDate(opportunity.updatedAt)}
            />
            {opportunity.closedAt && (
              <DetailItem
                icon={Calendar}
                label="Closed At"
                value={formatDate(opportunity.closedAt)}
              />
            )}
            {opportunity.closeReason && (
              <DetailItem
                icon={StickyNote}
                label="Close Reason"
                value={opportunity.closeReason}
              />
            )}
            {opportunity.riskScore && (
              <DetailItem
                icon={AlertTriangle}
                label="Risk Score"
                value={opportunity.riskScore}
              />
            )}
          </div>
          {opportunity.courtIntelSummary && (
            <div className="mt-4 pt-4 border-t">
              <DetailItem
                icon={StickyNote}
                label="Court Intel Summary"
                value={opportunity.courtIntelSummary}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Linked Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Originating Enquiry
            </p>
            {sourceLead ? (
              <Link
                href={`/leads/${sourceLead.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {sourceLead.subject}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                {opportunity.leadId ? 'Loading enquiry...' : 'Not linked to an enquiry'}
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Created Matter
            </p>
            {latestMatter ? (
              <Link
                href={`/matters/${latestMatter.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Briefcase className="h-3.5 w-3.5" />
                {latestMatter.matterNumber} · {latestMatter.name}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                {opportunity.stage === 'won'
                  ? 'Matter creation is pending.'
                  : 'Matter will appear here after the engagement is won.'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <EditOpportunityDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        opportunity={opportunity}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Conflicts Tab
// ---------------------------------------------------------------------------

function ConflictsTab({
  opportunityId,
  conflictRecords,
}: {
  opportunityId: string;
  conflictRecords?: ConflictRecord[];
}) {
  // Use inline conflictRecords from the opportunity if available, otherwise fetch
  const { data: fetchedConflicts = [], isLoading } = useConflicts(opportunityId);
  const conflicts = conflictRecords && conflictRecords.length > 0 ? conflictRecords : fetchedConflicts;

  if (isLoading && (!conflictRecords || conflictRecords.length === 0)) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (conflicts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-4 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-sm font-medium">No conflicts found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This opportunity has passed conflict screening
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const resolutionStyles: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    waived: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    blocked: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };

  return (
    <div className="space-y-3">
      {conflicts.map((conflict: ConflictRecord) => (
        <Card key={conflict.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2 shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {conflict.matchedEntityType} / {conflict.matchedEntityId}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Source: {conflict.matchSource}
                  </p>
                  {conflict.matchField && (
                    <p className="text-xs text-muted-foreground">
                      Field: {conflict.matchField}
                    </p>
                  )}
                  {conflict.relationshipPath && (
                    <p className="text-xs text-muted-foreground">
                      Relationship: {conflict.relationshipPath}
                    </p>
                  )}
                  {conflict.courtCaseReference && (
                    <p className="text-xs text-muted-foreground">
                      Court ref: {conflict.courtCaseReference}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDateTime(conflict.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className="capitalize font-normal text-xs"
                >
                  {conflict.matchConfidence}
                  {conflict.confidenceScore !== undefined && ` (${conflict.confidenceScore}%)`}
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn(
                    'capitalize border-0 font-medium',
                    resolutionStyles[conflict.resolutionStatus] ||
                      'bg-muted text-muted-foreground',
                  )}
                >
                  {conflict.resolutionStatus}
                </Badge>
              </div>
            </div>
            {conflict.resolutionNotes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  {conflict.resolutionNotes}
                </p>
              </div>
            )}
            {conflict.resolutionStatus === 'pending' && (
              <div className="mt-3 pt-3 border-t">
                <ResolveConflictDialog
                  conflict={conflict}
                  opportunityId={opportunityId}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Tab
// ---------------------------------------------------------------------------

function ActivityTab({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const { data: activities = [], isLoading } = useActivities(
    entityType,
    entityId,
  );
  const createActivity = useCreateActivity();
  const [note, setNote] = useState('');

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await createActivity.mutateAsync({
        entityType,
        entityId,
        activityType: 'note',
        subject: 'Note added',
        body: note.trim(),
      });
      setNote('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  }

  const activityIcon: Record<string, React.ElementType> = {
    note: MessageSquare,
    system_event: CheckCircle2,
    meeting: User,
    phone_call: Phone,
    email: Mail,
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAddNote} className="flex gap-2">
          <Input
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!note.trim() || createActivity.isPending}
          >
            {createActivity.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No activity yet
          </p>
        ) : (
          <div className="space-y-1 divide-y">
            {activities.map((activity: Activity) => {
              const Icon = activityIcon[activity.activityType] || Clock;
              return (
                <div key={activity.id} className="flex items-start gap-3 py-3">
                  <div className="mt-0.5 rounded-full bg-muted p-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.subject}</p>
                    {activity.body && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {activity.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page Skeleton
// ---------------------------------------------------------------------------

function OpportunityDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-40" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: opportunity, isLoading } = useOpportunity(id);
  const { data: kycRecords = [] } = useKycRecords(opportunity?.clientId);
  const advanceStage = useAdvanceStage();
  const [activeTab, setActiveTab] = useState<'details' | 'conflicts' | 'documents' | 'activity'>('details');
  const shouldOpenMatterRef = useRef(false);
  const redirectedMatterId = useRef<string | null>(null);

  const nextStage = opportunity ? getNextStage(opportunity.stage) : null;
  const pendingConflicts =
    opportunity?.conflictRecords?.filter((conflict) => conflict.resolutionStatus === 'pending') ?? [];
  const currentKycStatus =
    kycRecords[0]?.status ?? opportunity?.client?.kycStatus ?? 'not_started';
  const advanceBlockReason = opportunity
    ? getAdvanceBlockReason(nextStage, opportunity.conflictCheckStatus, currentKycStatus, pendingConflicts.length > 0)
    : null;
  const latestMatter = opportunity?.matters?.[0];
  const latestMatterId = latestMatter?.id;

  useEffect(() => {
    if (!shouldOpenMatterRef.current || opportunity?.stage !== 'won' || !latestMatterId) return;
    if (redirectedMatterId.current === latestMatterId) return;
    redirectedMatterId.current = latestMatterId;
    shouldOpenMatterRef.current = false;
    router.push(`/matters/${latestMatterId}`);
  }, [latestMatterId, opportunity?.stage, router]);

  async function handleAdvanceStage() {
    if (!opportunity || !nextStage || advanceBlockReason) {
      if (advanceBlockReason) {
        toast.error(advanceBlockReason);
      }
      return;
    }
    try {
      await advanceStage.mutateAsync({ id: opportunity.id, stage: nextStage });
      toast.success(
        `Stage advanced to ${STAGE_META[nextStage]?.label || nextStage}`,
      );
      if (nextStage === 'won') {
        shouldOpenMatterRef.current = true;
      }
    } catch (err) {
      // Show gate-block specific error from API
      const message =
        err instanceof Error ? err.message : 'Failed to advance stage';
      toast.error(message);
    }
  }

  if (isLoading || !opportunity) return <OpportunityDetailSkeleton />;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Engagement Pipeline
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">
              {opportunity.name}
            </h1>
            {stagePill(opportunity.stage)}
          </div>
          <p className="text-muted-foreground">
            {opportunity.client?.name || 'Unknown client'}
            {opportunity.estimatedValue !== undefined &&
              opportunity.estimatedValue !== null &&
              ` \u00b7 ${formatCurrency(opportunity.estimatedValue)}`}
          </p>
        </div>

        {/* Advance Stage Button */}
        {nextStage && opportunity.stage !== 'lost' && (
          <div className="space-y-2">
            <Button
              onClick={handleAdvanceStage}
              disabled={advanceStage.isPending || !!advanceBlockReason}
              className="gap-2"
              title={advanceBlockReason ?? undefined}
            >
              {advanceStage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Advance to {STAGE_META[nextStage]?.label}
            </Button>
            {advanceBlockReason && (
              <p className="max-w-sm text-xs text-muted-foreground">
                {advanceBlockReason}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Stage Progression Bar */}
      <Card className="overflow-visible">
        <CardContent className="px-8 pt-12 pb-6">
          <StageProgressionBar
            currentStage={opportunity.stage}
            conflictCheckStatus={opportunity.conflictCheckStatus}
            kycStatus={currentKycStatus}
          />
        </CardContent>
      </Card>

      <OpportunityActionBar
        opportunity={opportunity}
        pendingConflicts={pendingConflicts}
        kycStatus={currentKycStatus}
        onJumpToConflicts={() => setActiveTab('conflicts')}
      />

      {/* Tabs: Details, Conflicts, Documents, Activity */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'details' | 'conflicts' | 'documents' | 'activity')}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <DetailsTab
            opportunity={opportunity}
            currentKycStatus={currentKycStatus}
          />
        </TabsContent>

        <TabsContent value="conflicts" className="mt-4">
          <ConflictsTab
            opportunityId={id}
            conflictRecords={opportunity.conflictRecords}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <RecordDocumentsPanel
            entityType="opportunity"
            entityId={id}
            emptyHint="No documents attached to this engagement yet"
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityTab entityType="opportunity" entityId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
