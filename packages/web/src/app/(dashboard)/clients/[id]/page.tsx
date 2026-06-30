'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  useClient,
  useUpdateClient,
  useContacts,
  useCreateContact,
  useActivities,
  useCreateActivity,
  type Client,
  type Contact,
  type Opportunity,
  type Matter,
  type Activity,
  type UpdateClientRequest,
  type CreateContactRequest,
  type CreateActivityRequest,
} from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Pencil,
  Plus,
  Mail,
  Phone,
  User,
  Clock,
  MessageSquare,
  PhoneCall,
  Video,
  FileText,
  Building2,
  Shield,
  Globe,
  Hash,
  AlertTriangle,
  CalendarDays,
  Briefcase,
  Scale,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RecordDocumentsPanel } from '@/components/documents/record-documents-panel';
import { buildCourtIntelContextHref } from '@/lib/court-intel-context';

// ---------------------------------------------------------------------------
// KYC / Type / Risk badges (shared styling)
// ---------------------------------------------------------------------------

const KYC_CONFIG: Record<string, { label: string; className: string }> = {
  verified: {
    label: 'Verified',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
  },
  not_started: {
    label: 'Not Started',
    className: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700',
  },
  expired: {
    label: 'Expired',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  },
  documents_requested: {
    label: 'Docs Requested',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
  },
  under_review: {
    label: 'Under Review',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  },
};

function KycBadge({ status }: { status?: string }) {
  const config = KYC_CONFIG[status || 'not_started'] || KYC_CONFIG.not_started;
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

const RISK_CONFIG: Record<string, { label: string; className: string }> = {
  low: {
    label: 'Low',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  },
  high: {
    label: 'High',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  },
  pep: {
    label: 'PEP',
    className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800',
  },
};

function RiskBadge({ rating }: { rating?: string }) {
  if (!rating) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const config = RISK_CONFIG[rating] || { label: rating, className: '' };
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium', config.className)}>
      {config.label}
    </Badge>
  );
}

const TYPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  company: 'Company',
  government_entity: 'Government',
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  ar: 'Arabic',
  fr: 'French',
};

function TypeBadge({ clientType }: { clientType: string }) {
  return (
    <Badge variant="secondary" className="text-[11px] font-medium capitalize">
      {TYPE_LABELS[clientType] || clientType}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Edit Client Dialog
// ---------------------------------------------------------------------------

function EditClientDialog({
  client,
  children,
}: {
  client: Client;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const updateClient = useUpdateClient();

  const [form, setForm] = useState({
    name: client.name,
    clientType: client.clientType,
    registrationNumber: client.registrationNumber || '',
    industry: client.industry || '',
    preferredLanguage: client.preferredLanguage || 'en',
    riskRating: client.riskRating || '',
    notes: client.notes || '',
  });

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Client name is required');
      return;
    }

    try {
      const payload: UpdateClientRequest = {
        id: client.id,
        name: form.name.trim(),
        clientType: form.clientType,
      };
      if (form.registrationNumber) payload.registrationNumber = form.registrationNumber.trim();
      if (form.industry) payload.industry = form.industry.trim();
      if (form.preferredLanguage) payload.preferredLanguage = form.preferredLanguage;
      if (form.riskRating) payload.riskRating = form.riskRating;
      if (form.notes) payload.notes = form.notes.trim();

      await updateClient.mutateAsync(payload);
      toast.success('Client updated successfully');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update client');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-clientType">Client Type</Label>
              <Select value={form.clientType} onValueChange={(v) => update('clientType', v)}>
                <SelectTrigger id="edit-clientType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="government_entity">Government Entity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-industry">Industry</Label>
              <Input
                id="edit-industry"
                value={form.industry}
                onChange={(e) => update('industry', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-registrationNumber">Registration Number</Label>
              <Input
                id="edit-registrationNumber"
                value={form.registrationNumber}
                onChange={(e) => update('registrationNumber', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-preferredLanguage">Preferred Language</Label>
              <Select value={form.preferredLanguage} onValueChange={(v) => update('preferredLanguage', v)}>
                <SelectTrigger id="edit-preferredLanguage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-riskRating">Risk Rating</Label>
              <Select value={form.riskRating || ''} onValueChange={(v) => update('riskRating', v)}>
                <SelectTrigger id="edit-riskRating">
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="pep">PEP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={updateClient.isPending}>
              {updateClient.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add Contact Dialog
// ---------------------------------------------------------------------------

function AddContactDialog({
  clientId,
  children,
}: {
  clientId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const createContact = useCreateContact();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
  });

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm({ firstName: '', lastName: '', email: '', phone: '', jobTitle: '' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }

    try {
      await createContact.mutateAsync({
        clientId,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email || undefined,
        phone: form.phone || undefined,
        jobTitle: form.jobTitle || undefined,
      } as CreateContactRequest);
      toast.success('Contact added successfully');
      resetForm();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add contact');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-firstName">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="c-firstName"
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => update('firstName', e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-lastName">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="c-lastName"
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => update('lastName', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                placeholder="+971 50 000 0000"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-jobTitle">Job Title</Label>
            <Input
              id="c-jobTitle"
              placeholder="e.g. General Counsel"
              value={form.jobTitle}
              onChange={(e) => update('jobTitle', e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createContact.isPending}>
              {createContact.isPending ? 'Adding...' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add Activity Dialog
// ---------------------------------------------------------------------------

function AddActivityDialog({
  clientId,
  children,
}: {
  clientId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const createActivity = useCreateActivity();

  const [form, setForm] = useState({
    activityType: 'note',
    subject: '',
    body: '',
  });

  function resetForm() {
    setForm({ activityType: 'note', subject: '', body: '' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.body.trim()) {
      toast.error('Description is required');
      return;
    }

    try {
      await createActivity.mutateAsync({
        entityType: 'client',
        entityId: clientId,
        activityType: form.activityType,
        subject: form.subject.trim() || form.activityType.replace(/_/g, ' '),
        body: form.body.trim(),
      } as CreateActivityRequest);
      toast.success('Activity added');
      resetForm();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add activity');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="a-type">Type</Label>
              <Select value={form.activityType} onValueChange={(v) => setForm((p) => ({ ...p, activityType: v }))}>
                <SelectTrigger id="a-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="phone_call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="system_event">System Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-subject">Subject</Label>
              <Input
                id="a-subject"
                placeholder="Brief subject"
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="a-body">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="a-body"
              rows={4}
              placeholder="What happened?"
              value={form.body}
              onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createActivity.isPending}>
              {createActivity.isPending ? 'Saving...' : 'Add Activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({ client }: { client: Client }) {
  return (
    <div className="space-y-6">
      <Card className="rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-medium">Client Details</CardTitle>
          <EditClientDialog client={client}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>
          </EditClientDialog>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <DetailRow icon={Building2} label="Industry" value={client.industry} />
            <DetailRow icon={Hash} label="Registration Number" value={client.registrationNumber} />
            <DetailRow
              icon={Globe}
              label="Preferred Language"
              value={LANGUAGE_LABELS[client.preferredLanguage] || client.preferredLanguage}
            />
            <DetailRow icon={Shield} label="KYC Status">
              <KycBadge status={client.kycStatus} />
            </DetailRow>
            <DetailRow icon={AlertTriangle} label="Risk Rating">
              <RiskBadge rating={client.riskRating} />
            </DetailRow>
            {client.kycExpiryDate && (
              <DetailRow
                icon={CalendarDays}
                label="KYC Expiry"
                value={new Date(client.kycExpiryDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              />
            )}
            <DetailRow
              icon={Clock}
              label="Active"
              value={client.isActive ? 'Yes' : 'No'}
            />
            <DetailRow
              icon={CalendarDays}
              label="Last Updated"
              value={new Date(client.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            />
          </div>
          {client.notes && (
            <>
              <Separator className="my-6" />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{client.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-muted p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {children ? (
          <div className="mt-0.5">{children}</div>
        ) : (
          <p className="text-sm mt-0.5 truncate">{value || '\u2014'}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contacts Tab
// ---------------------------------------------------------------------------

function ContactsTab({ clientId, embeddedContacts }: { clientId: string; embeddedContacts?: Contact[] }) {
  const { data: fetchedContacts, isLoading } = useContacts(clientId);
  const contacts = fetchedContacts ?? embeddedContacts;

  if (isLoading && !embeddedContacts) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {contacts?.length || 0} contact{contacts?.length !== 1 ? 's' : ''}
        </p>
        <AddContactDialog clientId={clientId}>
          <Button size="sm">
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Contact
          </Button>
        </AddContactDialog>
      </div>

      {(!contacts || contacts.length === 0) ? (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center py-16">
            <div className="rounded-2xl bg-muted p-4 mb-4">
              <User className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium">No contacts</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a contact to this client
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <Card className="rounded-xl transition-all duration-200 hover:shadow-md hover:border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {contact.firstName[0]}
            {contact.lastName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">
                {contact.firstName} {contact.lastName}
              </p>
              {contact.isPrimary && (
                <Badge variant="outline" className="text-[10px] shrink-0">Primary</Badge>
              )}
            </div>
            {contact.jobTitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {contact.jobTitle}
              </p>
            )}
          </div>
        </div>
        <Separator className="my-3" />
        <div className="space-y-2">
          {contact.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{contact.phone}</span>
            </div>
          )}
          {!contact.email && !contact.phone && (
            <p className="text-xs text-muted-foreground italic">No contact info</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Opportunities Tab
// ---------------------------------------------------------------------------

const STAGE_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800 status-new-sparkle' },
  conflict_check: { label: 'Conflict Check', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' },
  kyc_pending: { label: 'KYC Pending', className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800' },
  engagement_letter: { label: 'Engagement Letter', className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800' },
  won: { label: 'Won', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' },
  lost: { label: 'Lost', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' },
};

function OpportunitiesTab({ opportunities }: { opportunities?: Opportunity[] }) {
  if (!opportunities || opportunities.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="flex flex-col items-center py-16">
          <div className="rounded-2xl bg-muted p-4 mb-4">
            <Briefcase className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium">No opportunities</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No opportunities linked to this client yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {opportunities.length} opportunit{opportunities.length !== 1 ? 'ies' : 'y'}
      </p>
      <Card className="rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Practice Area</TableHead>
                <TableHead>Assigned Partner</TableHead>
                <TableHead className="pr-6 text-right">Est. Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((opp) => {
                const stageConf = STAGE_CONFIG[opp.stage] || { label: opp.stage, className: '' };
                return (
                  <TableRow key={opp.id}>
                    <TableCell className="pl-6 font-medium">
                      <Link
                        href={`/opportunities/${opp.id}`}
                        className="hover:underline"
                      >
                        {opp.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[11px] font-medium', stageConf.className)}>
                        {stageConf.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{opp.practiceArea}</TableCell>
                    <TableCell className="text-muted-foreground">{opp.assignedPartner}</TableCell>
                    <TableCell className="pr-6 text-right text-muted-foreground">
                      {opp.estimatedValue != null
                        ? new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(Number(opp.estimatedValue))
                        : '\u2014'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Matters Tab
// ---------------------------------------------------------------------------

const MATTER_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800' },
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' },
  on_hold: { label: 'On Hold', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' },
  closed: { label: 'Closed', className: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700' },
};

function MattersTab({ matters }: { matters?: Matter[] }) {
  if (!matters || matters.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="flex flex-col items-center py-16">
          <div className="rounded-2xl bg-muted p-4 mb-4">
            <Scale className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium">No matters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No matters linked to this client yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {matters.length} matter{matters.length !== 1 ? 's' : ''}
      </p>
      <Card className="rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Matter #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Practice Area</TableHead>
                <TableHead>Lead Partner</TableHead>
                <TableHead className="pr-6 text-right">Opened</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matters.map((matter) => {
                const statusConf = MATTER_STATUS_CONFIG[matter.status] || { label: matter.status, className: '' };
                return (
                  <TableRow key={matter.id}>
                    <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                      {matter.matterNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/matters/${matter.id}`}
                        className="hover:underline"
                      >
                        {matter.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[11px] font-medium', statusConf.className)}>
                        {statusConf.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{matter.practiceArea || '\u2014'}</TableCell>
                    <TableCell className="text-muted-foreground">{matter.leadPartner}</TableCell>
                    <TableCell className="pr-6 text-right text-muted-foreground">
                      {new Date(matter.openDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Tab
// ---------------------------------------------------------------------------

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  note: MessageSquare,
  meeting: Video,
  phone_call: PhoneCall,
  email: Mail,
  system_event: FileText,
};

const ACTIVITY_COLORS: Record<string, string> = {
  note: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  meeting: 'bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-400',
  phone_call: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
  email: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400',
  system_event: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function ActivityTab({ clientId }: { clientId: string }) {
  const { data: activities, isLoading } = useActivities('client', clientId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {activities?.length || 0} activit{activities?.length !== 1 ? 'ies' : 'y'}
        </p>
        <AddActivityDialog clientId={clientId}>
          <Button size="sm">
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Note
          </Button>
        </AddActivityDialog>
      </div>

      {(!activities || activities.length === 0) ? (
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center py-16">
            <div className="rounded-2xl bg-muted p-4 mb-4">
              <Clock className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium">No activity yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a note or log an interaction
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-1">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const Icon = ACTIVITY_ICONS[activity.activityType] || Clock;
  const colorClass = ACTIVITY_COLORS[activity.activityType] || ACTIVITY_COLORS.system_event;

  return (
    <div className="relative flex gap-4 py-3 pl-1">
      <div
        className={cn(
          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          colorClass,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{activity.subject}</p>
            {activity.body && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                {activity.body}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(activity.activityDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-[300px] rounded-xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: client, isLoading } = useClient(id);

  if (isLoading) return <DetailPageSkeleton />;

  if (!client) {
    return (
      <div className="space-y-6">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Client Directory
        </Link>
        <Card className="rounded-xl">
          <CardContent className="flex flex-col items-center py-20">
            <p className="text-lg font-medium">Client not found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The client you are looking for does not exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Client Directory
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{client.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <TypeBadge clientType={client.clientType} />
            <KycBadge status={client.kycStatus} />
            <RiskBadge rating={client.riskRating} />
            {!client.isActive && (
              <Badge variant="outline" className="text-[11px] font-medium bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700">
                Inactive
              </Badge>
            )}
          </div>
        </div>
        <Button asChild>
          <Link
            href={buildCourtIntelContextHref({
              sourceEntityType: 'client',
              sourceEntityId: client.id,
              sourceTitle: client.name,
              clientName: client.name,
              defaultQueryType: 'party_intelligence',
            })}
          >
            AI Research
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts
            {client.contacts && client.contacts.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">({client.contacts.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="opportunities">
            Opportunities
            {client.opportunities && client.opportunities.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">({client.opportunities.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="matters">
            Matters
            {client.matters && client.matters.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">({client.matters.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab client={client} />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsTab clientId={id} embeddedContacts={client.contacts} />
        </TabsContent>

        <TabsContent value="opportunities">
          <OpportunitiesTab opportunities={client.opportunities} />
        </TabsContent>

        <TabsContent value="matters">
          <MattersTab matters={client.matters} />
        </TabsContent>

        <TabsContent value="documents">
          <RecordDocumentsPanel
            entityType="client"
            entityId={id}
            emptyHint="No documents attached to this client yet"
          />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTab clientId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
