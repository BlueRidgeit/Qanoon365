'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Scale,
  MapPin,
  AlertTriangle,
  DollarSign,
  FileText,
  User,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useLeads, useCreateLead, type Lead, type CreateLeadRequest } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
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

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-yellow-400/20 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300 status-new-sparkle',
  contacted: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  qualified: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  disqualified: 'bg-red-500/10 text-red-600 dark:text-red-400',
  converted: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

const CASE_TYPE_STYLES: Record<string, string> = {
  corporate: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  litigation: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  real_estate: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  employment: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  regulatory: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  ip: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  banking_finance: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  other: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

const JURISDICTION_STYLES: Record<string, string> = {
  uae_onshore: 'bg-green-500/10 text-green-600 dark:text-green-400',
  difc: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  adgm: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  multi_jurisdictional: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  international: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
};

const URGENCY_STYLES: Record<string, string> = {
  standard: 'text-muted-foreground',
  urgent: 'text-amber-600 dark:text-amber-400',
  emergency: 'text-red-600 dark:text-red-400',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: string, label: string) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'capitalize border-0 font-medium',
        STATUS_STYLES[status] || 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </Badge>
  );
}

function caseTypeBadge(caseType: string, label: string) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'border-0 font-medium',
        CASE_TYPE_STYLES[caseType] || 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </Badge>
  );
}

function jurisdictionBadge(jurisdiction: string, label: string) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'border-0 font-medium',
        JURISDICTION_STYLES[jurisdiction] || 'bg-muted text-muted-foreground',
      )}
    >
      {label}
    </Badge>
  );
}

function urgencyIndicator(urgency: string, label: string) {
  return (
    <span
      className={cn(
        'text-sm font-medium',
        URGENCY_STYLES[urgency] || 'text-muted-foreground',
      )}
    >
      {urgency === 'emergency' && (
        <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
      )}
      {urgency === 'urgent' && (
        <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
      )}
      {label}
    </span>
  );
}

function formatValue(value?: number) {
  if (value == null) return '--';
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Lead Table
// ---------------------------------------------------------------------------

function LeadTable({ leads, isLoading }: { leads: Lead[]; isLoading: boolean }) {
  const router = useRouter();
  const t = useTranslations('leads');
  const ts = useTranslations('statuses');
  const tp = useTranslations('practiceAreas');
  const tj = useTranslations('jurisdictions');
  const tu = useTranslations('urgencyLevels');

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="rounded-xl bg-muted p-4 mb-4">
          <Scale className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">{t('noEnquiries')}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('noEnquiriesHint')}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('subject')}</TableHead>
          <TableHead>{t('caseType')}</TableHead>
          <TableHead>{t('jurisdiction')}</TableHead>
          <TableHead>{t('urgency')}</TableHead>
          <TableHead>{t('status')}</TableHead>
          <TableHead className="text-right">{t('estimatedValue')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow
            key={lead.id}
            className="cursor-pointer"
            onClick={() => router.push(`/leads/${lead.id}`)}
          >
            <TableCell className="font-medium max-w-[280px] truncate">
              {lead.subject}
            </TableCell>
            <TableCell>{caseTypeBadge(lead.caseType, tp(lead.caseType))}</TableCell>
            <TableCell>{jurisdictionBadge(lead.jurisdiction, tj(lead.jurisdiction))}</TableCell>
            <TableCell>{urgencyIndicator(lead.urgency, tu(lead.urgency))}</TableCell>
            <TableCell>{statusBadge(lead.status, ts(`enquiry.${lead.status}`))}</TableCell>
            <TableCell className="text-right text-muted-foreground text-sm">
              {formatValue(lead.estimatedValue)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// New Lead Dialog
// ---------------------------------------------------------------------------

function NewLeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createLead = useCreateLead();
  const t = useTranslations('leads');
  const tp = useTranslations('practiceAreas');
  const tj = useTranslations('jurisdictions');
  const tu = useTranslations('urgencyLevels');
  const tc = useTranslations('common');

  const [form, setForm] = useState({
    subject: '',
    caseType: '',
    jurisdiction: '',
    urgency: '',
    caseSummary: '',
    clientName: '',
    estimatedValue: '',
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm({
      subject: '',
      caseType: '',
      jurisdiction: '',
      urgency: '',
      caseSummary: '',
      clientName: '',
      estimatedValue: '',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload: CreateLeadRequest = {
      subject: form.subject.trim(),
      caseType: form.caseType,
      jurisdiction: form.jurisdiction,
      urgency: form.urgency,
      caseSummary: form.caseSummary.trim(),
      clientName: form.clientName.trim() || undefined,
      estimatedValue: form.estimatedValue
        ? Number(form.estimatedValue)
        : undefined,
    };

    try {
      await createLead.mutateAsync(payload);
      toast.success(t('successCreated'));
      resetForm();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t('failedCreate'),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('newEnquiry')}</DialogTitle>
          <DialogDescription>
            {t('newEnquiryDesc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              <FileText className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
              {t('subject')}
            </Label>
            <Input
              id="subject"
              placeholder={t('subjectPlaceholder')}
              value={form.subject}
              onChange={(e) => updateField('subject', e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Case Type */}
            <div className="space-y-2">
              <Label>
                <Scale className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                {t('caseType')}
              </Label>
              <Select
                value={form.caseType}
                onValueChange={(v) => updateField('caseType', v)}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectCaseType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate">{tp('corporate')}</SelectItem>
                  <SelectItem value="litigation">{tp('litigation')}</SelectItem>
                  <SelectItem value="real_estate">{tp('real_estate')}</SelectItem>
                  <SelectItem value="employment">{tp('employment')}</SelectItem>
                  <SelectItem value="regulatory">{tp('regulatory')}</SelectItem>
                  <SelectItem value="ip">{tp('ip')}</SelectItem>
                  <SelectItem value="banking_finance">{tp('banking_finance')}</SelectItem>
                  <SelectItem value="other">{tp('other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Jurisdiction */}
            <div className="space-y-2">
              <Label>
                <MapPin className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                {t('jurisdiction')}
              </Label>
              <Select
                value={form.jurisdiction}
                onValueChange={(v) => updateField('jurisdiction', v)}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectJurisdiction')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uae_onshore">{tj('uae_onshore')}</SelectItem>
                  <SelectItem value="difc">{tj('difc')}</SelectItem>
                  <SelectItem value="adgm">{tj('adgm')}</SelectItem>
                  <SelectItem value="multi_jurisdictional">{tj('multi_jurisdictional')}</SelectItem>
                  <SelectItem value="international">{tj('international')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label>
                <AlertTriangle className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                {t('urgency')}
              </Label>
              <Select
                value={form.urgency}
                onValueChange={(v) => updateField('urgency', v)}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectUrgency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{tu('standard')}</SelectItem>
                  <SelectItem value="urgent">{tu('urgent')}</SelectItem>
                  <SelectItem value="emergency">{tu('emergency')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Client Name */}
            <div className="space-y-2">
              <Label htmlFor="clientName">
                <User className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                {t('clientName')}
              </Label>
              <Input
                id="clientName"
                placeholder={t('clientNamePlaceholder')}
                value={form.clientName}
                onChange={(e) => updateField('clientName', e.target.value)}
              />
            </div>

            {/* Estimated Value */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="estimatedValue">
                <DollarSign className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
                {t('estimatedValueLabel')}
              </Label>
              <Input
                id="estimatedValue"
                type="number"
                min="0"
                step="1000"
                placeholder="100000"
                value={form.estimatedValue}
                onChange={(e) => updateField('estimatedValue', e.target.value)}
              />
            </div>
          </div>

          {/* Case Summary */}
          <div className="space-y-2">
            <Label htmlFor="caseSummary">
              <FileText className="inline h-3.5 w-3.5 mr-1 text-muted-foreground" />
              {t('caseSummary')}
            </Label>
            <Textarea
              id="caseSummary"
              placeholder={t('caseSummaryPlaceholder')}
              value={form.caseSummary}
              onChange={(e) => updateField('caseSummary', e.target.value)}
              rows={3}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('creating')}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  {t('logEnquiry')}
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
// Tab Content with Filtered Leads
// ---------------------------------------------------------------------------

function FilteredLeads({ status }: { status: string }) {
  const { data: leads = [], isLoading } = useLeads(
    status === 'all' ? undefined : status,
  );

  return <LeadTable leads={leads} isLoading={isLoading} />;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LeadsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const t = useTranslations('leads');
  const ts = useTranslations('statuses');

  const statusTabs = [
    { value: 'all', label: ts('all') },
    { value: 'new', label: ts('enquiry.new') },
    { value: 'contacted', label: ts('enquiry.contacted') },
    { value: 'qualified', label: ts('enquiry.qualified') },
    { value: 'disqualified', label: ts('enquiry.disqualified') },
    { value: 'converted', label: ts('enquiry.converted') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Button variant="pink" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('logEnquiry')}
        </Button>
      </div>

      {/* Filter Tabs + Table */}
      <Tabs defaultValue="all">
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {statusTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <FilteredLeads status={tab.value} />
          </TabsContent>
        ))}
      </Tabs>

      {/* New Lead Dialog */}
      <NewLeadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
