'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Scale,
  MapPin,
  AlertTriangle,
  User,
  Users,
  DollarSign,
  FileText,
  Calendar,
  Clock,
  Globe,
  Shield,
  CheckCircle2,
  XCircle,
  ArrowRightCircle,
  Loader2,
  Send,
  MessageSquare,
  Mail,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import {
  useLead,
  useClients,
  useUpdateLead,
  useQualifyLead,
  useActivities,
  useCreateActivity,
  type Lead,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-yellow-400/20 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300 status-new-sparkle',
  contacted: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  qualified: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  disqualified: 'bg-red-500/10 text-red-600 dark:text-red-400',
  converted: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

const CASE_TYPE_LABELS: Record<string, string> = {
  corporate: 'Corporate',
  litigation: 'Litigation',
  real_estate: 'Real Estate',
  employment: 'Employment',
  regulatory: 'Regulatory',
  ip: 'IP',
  banking_finance: 'Banking & Finance',
  other: 'Other',
};

const JURISDICTION_LABELS: Record<string, string> = {
  uae_onshore: 'UAE Onshore',
  difc: 'DIFC',
  adgm: 'ADGM',
  multi_jurisdictional: 'Multi-Jurisdictional',
  international: 'International',
};

const URGENCY_LABELS: Record<string, string> = {
  standard: 'Standard',
  urgent: 'Urgent',
  emergency: 'Emergency',
};

const URGENCY_STYLES: Record<string, string> = {
  standard: 'bg-muted text-muted-foreground',
  urgent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  emergency: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const UPDATABLE_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'disqualified', label: 'Disqualified' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: string) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'capitalize border-0 font-medium',
        STATUS_STYLES[status] || 'bg-muted text-muted-foreground',
      )}
    >
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

function urgencyBadge(urgency: string) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'border-0 font-medium',
        URGENCY_STYLES[urgency] || 'bg-muted text-muted-foreground',
      )}
    >
      {(urgency === 'urgent' || urgency === 'emergency') && (
        <AlertTriangle className="inline h-3 w-3 mr-1" />
      )}
      {URGENCY_LABELS[urgency] || urgency}
    </Badge>
  );
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

function formatValue(value?: number) {
  if (value == null) return undefined;
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Detail Grid Item
// ---------------------------------------------------------------------------

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
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

// ---------------------------------------------------------------------------
// Qualify Dialog
// ---------------------------------------------------------------------------

function QualifyDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}) {
  const router = useRouter();
  const { data: clients = [] } = useClients();
  const qualifyLead = useQualifyLead();

  const [qualificationMode, setQualificationMode] = useState<'new' | 'existing'>('new');
  const [clientName, setClientName] = useState(lead.clientName || '');
  const [clientType, setClientType] = useState('company');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const query = clientSearch.toLowerCase();
    return clients.filter((client) =>
      [
        client.name,
        client.clientType,
        client.registrationNumber,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [clients, clientSearch]);

  const canSubmit =
    qualificationMode === 'existing'
      ? !!selectedClientId
      : clientName.trim().length > 0;

  async function handleQualify(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      const result = await qualifyLead.mutateAsync(
        qualificationMode === 'existing'
          ? {
              id: lead.id,
              clientId: selectedClientId,
            }
          : {
              id: lead.id,
              clientName: clientName.trim(),
              clientType,
            },
      );
      toast.success('Enquiry qualified! Client and engagement created.');
      onOpenChange(false);
      setQualificationMode('new');
      setClientSearch('');
      setSelectedClientId('');
      // Navigate to the newly created opportunity
      if (result?.opportunity?.id) {
        router.push(`/opportunities/${result.opportunity.id}`);
      } else {
        router.push(`/opportunities`);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to qualify enquiry',
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) {
          setQualificationMode('new');
          setClientSearch('');
          setSelectedClientId('');
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Qualify Enquiry</DialogTitle>
          <DialogDescription>
            Convert this enquiry into a client and create an engagement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleQualify} className="space-y-4">
          <div className="space-y-2">
            <Label>Client Selection</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={qualificationMode === 'new' ? 'default' : 'outline'}
                onClick={() => setQualificationMode('new')}
                className="flex-1"
              >
                New client
              </Button>
              <Button
                type="button"
                variant={qualificationMode === 'existing' ? 'default' : 'outline'}
                onClick={() => setQualificationMode('existing')}
                className="flex-1"
              >
                Existing client
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose whether this enquiry should create a new client or attach to an existing one.
            </p>
          </div>

          {qualificationMode === 'new' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Client Type</Label>
                <Select value={clientType} onValueChange={setClientType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="government_entity">
                      Government Entity
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="existingClientSearch">Find existing client</Label>
              <Input
                id="existingClientSearch"
                placeholder="Search by client name or registration number"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={clients.length ? 'Select client' : 'No clients available'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                      {client.registrationNumber ? ` · ${client.registrationNumber}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No clients exist yet, so create a new one instead.
                </p>
              ) : filteredClients.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No clients match your search.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Attach this enquiry to an existing client record.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={qualifyLead.isPending || !canSubmit}>
              {qualifyLead.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Qualifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Qualify Enquiry
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
// Activity Timeline
// ---------------------------------------------------------------------------

function ActivityTimeline({
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
        {/* Add Note */}
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

        {/* Timeline */}
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

function LeadDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
      <Skeleton className="h-[200px] rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: lead, isLoading } = useLead(id);
  const updateLead = useUpdateLead();
  const [qualifyOpen, setQualifyOpen] = useState(false);

  async function handleStatusChange(newStatus: string) {
    if (!lead) return;
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        status: newStatus,
      } as Parameters<typeof updateLead.mutateAsync>[0] & { status: string });
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update status',
      );
    }
  }

  if (isLoading || !lead) return <LeadDetailSkeleton />;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/leads"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Enquiries
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">
              {lead.subject}
            </h1>
            {statusBadge(lead.status)}
            {urgencyBadge(lead.urgency)}
          </div>
          <p className="text-muted-foreground">
            {CASE_TYPE_LABELS[lead.caseType] || lead.caseType}
            {' -- '}
            {JURISDICTION_LABELS[lead.jurisdiction] || lead.jurisdiction}
            {lead.clientName && ` -- ${lead.clientName}`}
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Enquiry Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              <DetailItem
                icon={Scale}
                label="Case Type"
                value={CASE_TYPE_LABELS[lead.caseType] || lead.caseType}
              />
              <DetailItem
                icon={MapPin}
                label="Jurisdiction"
                value={JURISDICTION_LABELS[lead.jurisdiction] || lead.jurisdiction}
              />
              <DetailItem
                icon={AlertTriangle}
                label="Urgency"
                value={URGENCY_LABELS[lead.urgency] || lead.urgency}
              />
              <DetailItem
                icon={User}
                label="Client Name"
                value={lead.clientName}
              />
              <DetailItem
                icon={Users}
                label="Client Type"
                value={lead.clientType}
              />
              <DetailItem
                icon={Users}
                label="Opposing Party"
                value={lead.opposingPartyNames}
              />
              <DetailItem
                icon={DollarSign}
                label="Estimated Value"
                value={formatValue(lead.estimatedValue)}
              />
              <DetailItem
                icon={Globe}
                label="Referral Source"
                value={lead.referralSource}
              />
              <DetailItem
                icon={Shield}
                label="Court Intel Flag"
                value={lead.courtIntelFlag ? 'Yes' : 'No'}
              />
              <DetailItem
                icon={Calendar}
                label="Created"
                value={formatDate(lead.createdAt)}
              />
              <DetailItem
                icon={Clock}
                label="Last Updated"
                value={formatDate(lead.updatedAt)}
              />
            </div>

            {/* Case Summary */}
            {lead.caseSummary && (
              <div className="mt-4 pt-4 border-t">
                <DetailItem
                  icon={FileText}
                  label="Case Summary"
                  value={lead.caseSummary}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Actions Panel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Update Status (for new / contacted) */}
            {(lead.status === 'new' || lead.status === 'contacted') && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Update Status
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <ArrowRightCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                      Change Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {UPDATABLE_STATUSES.filter(
                      (s) => s.value !== lead.status,
                    ).map((s) => (
                      <DropdownMenuItem
                        key={s.value}
                        onClick={() => handleStatusChange(s.value)}
                      >
                        {s.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Qualify Button (for contacted) */}
            {lead.status === 'contacted' && (
              <Button
                className="w-full"
                size="lg"
                onClick={() => setQualifyOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4" />
                Qualify Enquiry
              </Button>
            )}

            {/* Converted state */}
            {(lead.status === 'qualified' || lead.status === 'converted') && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Enquiry Converted</span>
                </div>
                {lead.convertedOpportunityId && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/opportunities/${lead.convertedOpportunityId}`}>
                      View Engagement
                    </Link>
                  </Button>
                )}
              </div>
            )}

            {/* Disqualified state */}
            {lead.status === 'disqualified' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">Disqualified</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline entityType="lead" entityId={id} />

      {/* Qualify Dialog */}
      {lead.status === 'contacted' && (
        <QualifyDialog
          open={qualifyOpen}
          onOpenChange={setQualifyOpen}
          lead={lead}
        />
      )}
    </div>
  );
}
