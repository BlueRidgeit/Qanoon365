'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  useMatter,
  useCloseMatter,
  useLead,
  useActivities,
  useCreateActivity,
  type Matter,
} from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RecordDocumentsPanel } from '@/components/documents/record-documents-panel';
import { buildCourtIntelContextHref } from '@/lib/court-intel-context';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  FileText,
  Lock,
  MessageSquarePlus,
  MessageSquare,
  Plus,
  User,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE_STYLES: Record<
  string,
  { className: string; label: string }
> = {
  active: {
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    label: 'Active',
  },
  on_hold: {
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
    label: 'On Hold',
  },
  closed: {
    className: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25',
    label: 'Closed',
  },
  archived: {
    className: 'bg-muted text-muted-foreground border-muted',
    label: 'Archived',
  },
};

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
// Loading state
// ---------------------------------------------------------------------------

function MatterDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-96" />
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[300px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Close Matter Dialog
// ---------------------------------------------------------------------------

function CloseMatterDialog({
  matterId,
  matterName,
}: {
  matterId: string;
  matterName: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const closeMatter = useCloseMatter();

  const handleClose = async () => {
    try {
      await closeMatter.mutateAsync(matterId);
      toast.success('Matter closed successfully');
      setOpen(false);
      setNote('');
    } catch {
      toast.error('Failed to close matter');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-700">
          <Lock className="mr-2 h-4 w-4" />
          Close Matter
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close Matter</DialogTitle>
          <DialogDescription>
            You are about to close &ldquo;{matterName}&rdquo;. This action can
            be reversed but will update all associated records.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="close-note">Closing Note</Label>
          <Textarea
            id="close-note"
            placeholder="Reason for closing this matter..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleClose}
            disabled={closeMatter.isPending}
          >
            {closeMatter.isPending ? 'Closing...' : 'Confirm Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewField({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn('text-sm', mono && 'font-mono')}>
        {value || '\u2014'}
      </p>
    </div>
  );
}

function OverviewTab({ matter }: { matter: Matter }) {
  const { data: originatingLead } = useLead(matter.opportunity?.leadId || '');

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Matter Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <OverviewField label="Matter Number" value={matter.matterNumber} mono />
          <OverviewField label="Status" value={
            <Badge
              variant="outline"
              className={cn('text-xs', STATUS_BADGE_STYLES[matter.status]?.className)}
            >
              {STATUS_BADGE_STYLES[matter.status]?.label ?? matter.status}
            </Badge>
          } />
          <OverviewField label="Practice Area" value={matter.practiceArea} />
          <OverviewField label="Lead Partner" value={matter.leadPartner} />
          <OverviewField label="Open Date" value={formatDate(matter.openDate)} />
          <OverviewField label="Target Close Date" value={formatDate(matter.targetCloseDate)} />
          <div className="col-span-full">
            <OverviewField label="Notes" value={matter.notes} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Linked Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Client
            </p>
            {matter.client ? (
              <Link
                href={`/clients/${matter.client.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <User className="h-3.5 w-3.5" />
                {matter.client.name}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">{'\u2014'}</p>
            )}
          </div>

          <Separator />

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Opportunity
            </p>
            {matter.opportunity ? (
              <Link
                href={`/opportunities/${matter.opportunity.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Briefcase className="h-3.5 w-3.5" />
                {matter.opportunity.name}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">{'\u2014'}</p>
            )}
          </div>

          <Separator />

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Originating Enquiry
            </p>
            {originatingLead ? (
              <Link
                href={`/leads/${originatingLead.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {originatingLead.subject}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                {matter.opportunity?.leadId
                  ? 'Loading originating enquiry...'
                  : matter.opportunity
                    ? 'No enquiry linked to this engagement'
                    : 'No originating enquiry available'}
              </p>
            )}
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <OverviewField label="Created" value={formatDateTime(matter.createdAt)} />
            <OverviewField label="Last Updated" value={formatDateTime(matter.updatedAt)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Documents Tab
// ---------------------------------------------------------------------------

function DocumentsTab({ matterId }: { matterId: string }) {
  return (
    <RecordDocumentsPanel
      entityType="matter"
      entityId={matterId}
      emptyHint="No documents attached to this matter yet"
    />
  );
}

// ---------------------------------------------------------------------------
// Activity Tab
// ---------------------------------------------------------------------------

function ActivityTab({ matterId }: { matterId: string }) {
  const { data: activities, isLoading } = useActivities('matter', matterId);
  const createActivity = useCreateActivity();
  const [note, setNote] = useState('');

  const handleAddNote = async () => {
    if (!note.trim()) return;

    try {
      await createActivity.mutateAsync({
        entityType: 'matter',
        entityId: matterId,
        activityType: 'note',
        subject: 'Note added',
        body: note.trim(),
      });
      toast.success('Note added');
      setNote('');
    } catch {
      toast.error('Failed to add note');
    }
  };

  const sortedActivities = useMemo(() => {
    if (!activities) return [];
    return [...activities].sort(
      (a, b) =>
        new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime(),
    );
  }, [activities]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add note */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-primary/10 p-2">
              <MessageSquarePlus className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="Add a note to this matter..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!note.trim() || createActivity.isPending}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {createActivity.isPending ? 'Adding...' : 'Add Note'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {sortedActivities.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No activity recorded for this matter yet
          </p>
        </div>
      ) : (
        <div className="relative ml-4 border-l border-muted-foreground/20 pl-6">
          {sortedActivities.map((activity) => (
            <div key={activity.id} className="relative pb-8 last:pb-0">
              {/* Dot */}
              <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-background bg-muted-foreground/30" />

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{activity.subject}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {activity.activityType.replace(/_/g, ' ')}
                  </Badge>
                </div>
                {activity.body && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {activity.body}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDateTime(activity.activityDate)}</span>
                  {activity.completedBy && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {activity.completedBy}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MatterDetailPage() {
  const params = useParams<{ id: string }>();
  const matterId = params.id;
  const { data: matter, isLoading } = useMatter(matterId);
  const { data: sourceLead } = useLead(matter?.opportunity?.leadId || '');

  if (isLoading || !matter) {
    return <MatterDetailSkeleton />;
  }

  const statusStyle = STATUS_BADGE_STYLES[matter.status] ?? {
    className: 'bg-muted text-muted-foreground',
    label: matter.status,
  };
  const aiResearchHref = buildCourtIntelContextHref({
    sourceEntityType: 'matter',
    sourceEntityId: matter.id,
    sourceTitle: matter.name,
    clientName: matter.client?.name,
    practiceArea: matter.practiceArea,
    jurisdiction: sourceLead?.jurisdiction,
    caseType: sourceLead?.caseType,
    defaultQueryType: 'contextual_case_law',
  });

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/matters"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Matters
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono text-sm text-muted-foreground">
            {matter.matterNumber}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">
            {matter.name}
          </h1>
          <Badge
            variant="outline"
            className={cn('text-xs mt-1', statusStyle.className)}
          >
            {statusStyle.label}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={aiResearchHref}>AI Research</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/tasks">Task Center</Link>
          </Button>
          {matter.status === 'active' && (
            <CloseMatterDialog matterId={matter.id} matterName={matter.name} />
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <Briefcase className="mr-1.5 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-1.5 h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Calendar className="mr-1.5 h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab matter={matter} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsTab matterId={matter.id} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityTab matterId={matter.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
