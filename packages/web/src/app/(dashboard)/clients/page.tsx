'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  useClients,
  useCreateClient,
  type Client,
  type CreateClientRequest,
} from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Search, Building2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

// ---------------------------------------------------------------------------
// KYC status badge configuration
// ---------------------------------------------------------------------------

const KYC_STYLES: Record<string, string> = {
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
  not_started: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700',
  expired: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  documents_requested: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
  under_review: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
};

function KycBadge({ status }: { status?: string }) {
  const tsk = useTranslations('statuses.kycStatus');
  const key = status || 'not_started';
  const badgeClassName = KYC_STYLES[key] || KYC_STYLES.not_started;
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium', badgeClassName)}>
      {tsk(key)}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Risk rating badge configuration
// ---------------------------------------------------------------------------

const RISK_STYLES: Record<string, string> = {
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  high: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  pep: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800',
};

function RiskBadge({ rating }: { rating?: string }) {
  const tr = useTranslations('riskLevels');
  if (!rating) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const badgeClassName = RISK_STYLES[rating] || '';
  return (
    <Badge variant="outline" className={cn('text-[11px] font-medium', badgeClassName)}>
      {tr(rating)}
    </Badge>
  );
}

function TypeBadge({ clientType }: { clientType: string }) {
  const tct = useTranslations('clientTypes');
  return (
    <Badge variant="secondary" className="text-[11px] font-medium capitalize">
      {tct(clientType)}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// New Client Dialog
// ---------------------------------------------------------------------------

function NewClientDialog({ children }: { children: React.ReactNode }) {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const tct = useTranslations('clientTypes');
  const tl = useTranslations('languages');
  const tr = useTranslations('riskLevels');
  const [open, setOpen] = useState(false);
  const createClient = useCreateClient();

  const [form, setForm] = useState<CreateClientRequest>({
    name: '',
    clientType: 'company',
    registrationNumber: '',
    industry: '',
    preferredLanguage: 'en',
    riskRating: '',
    notes: '',
  });

  function update<K extends keyof CreateClientRequest>(key: K, value: CreateClientRequest[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm({
      name: '',
      clientType: 'company',
      registrationNumber: '',
      industry: '',
      preferredLanguage: 'en',
      riskRating: '',
      notes: '',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Client name is required');
      return;
    }

    try {
      const payload: CreateClientRequest = {
        name: form.name.trim(),
        clientType: form.clientType,
      };
      if (form.registrationNumber) payload.registrationNumber = form.registrationNumber.trim();
      if (form.industry) payload.industry = form.industry.trim();
      if (form.preferredLanguage) payload.preferredLanguage = form.preferredLanguage;
      if (form.riskRating) payload.riskRating = form.riskRating;
      if (form.notes) payload.notes = form.notes.trim();

      await createClient.mutateAsync(payload);
      toast.success('Client created successfully');
      resetForm();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create client');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{t('newClient')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Name + Client Type */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                {tc('name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder={t('namePlaceholder')}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientType">{t('clientType')}</Label>
              <Select
                value={form.clientType}
                onValueChange={(v) => update('clientType', v)}
              >
                <SelectTrigger id="clientType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">{tct('individual')}</SelectItem>
                  <SelectItem value="company">{tct('company')}</SelectItem>
                  <SelectItem value="government_entity">{tct('government_entity')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Industry + Registration Number */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="industry">{tc('industry')}</Label>
              <Input
                id="industry"
                placeholder={t('industryPlaceholder')}
                value={form.industry || ''}
                onChange={(e) => update('industry', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">{t('registrationNumber')}</Label>
              <Input
                id="registrationNumber"
                placeholder={t('registrationPlaceholder')}
                value={form.registrationNumber || ''}
                onChange={(e) => update('registrationNumber', e.target.value)}
              />
            </div>
          </div>

          {/* Preferred Language + Risk Rating */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="preferredLanguage">{t('preferredLanguage')}</Label>
              <Select
                value={form.preferredLanguage || 'en'}
                onValueChange={(v) => update('preferredLanguage', v)}
              >
                <SelectTrigger id="preferredLanguage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{tl('en')}</SelectItem>
                  <SelectItem value="ar">{tl('ar')}</SelectItem>
                  <SelectItem value="fr">{tl('fr')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="riskRating">{t('riskRating')}</Label>
              <Select
                value={form.riskRating || ''}
                onValueChange={(v) => update('riskRating', v)}
              >
                <SelectTrigger id="riskRating">
                  <SelectValue placeholder={t('riskRating')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{tr('low')}</SelectItem>
                  <SelectItem value="medium">{tr('medium')}</SelectItem>
                  <SelectItem value="high">{tr('high')}</SelectItem>
                  <SelectItem value="pep">{tr('pep')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{tc('notes')}</Label>
            <Textarea
              id="notes"
              placeholder={t('notesPlaceholder')}
              rows={3}
              value={form.notes || ''}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {tc('cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createClient.isPending}>
              {createClient.isPending ? tc('loading') : t('newClient')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function ClientsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-72" />
      <Card className="rounded-xl">
        <CardContent className="p-0">
          <div className="space-y-0 divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  const t = useTranslations('clients');
  return (
    <Card className="rounded-xl">
      <CardContent className="flex flex-col items-center justify-center py-20">
        <div className="rounded-2xl bg-muted p-4 mb-4">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">{t('noClients')}</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
          {t('createClientDesc')}
        </p>
        <NewClientDialog>
          <Button variant="pink" className="mt-6">
            <Plus className="mr-2 h-4 w-4" />
            {t('newClient')}
          </Button>
        </NewClientDialog>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClientsPage() {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const { data: clients, isLoading } = useClients();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.industry && c.industry.toLowerCase().includes(q)) ||
        (c.registrationNumber && c.registrationNumber.toLowerCase().includes(q)),
    );
  }, [clients, search]);

  if (isLoading) return <ClientsPageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
        <NewClientDialog>
          <Button variant="pink">
            <Plus className="mr-2 h-4 w-4" />
            {t('newClient')}
          </Button>
        </NewClientDialog>
      </div>

      {/* Search */}
      {(clients?.length ?? 0) > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchClients')}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Empty state */}
      {(clients?.length ?? 0) === 0 && <EmptyState />}

      {/* Table */}
      {(clients?.length ?? 0) > 0 && (
        <Card className="rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">{tc('name')}</TableHead>
                  <TableHead>{tc('type')}</TableHead>
                  <TableHead>{tc('industry')}</TableHead>
                  <TableHead>{t('kycStatus')}</TableHead>
                  <TableHead>{t('risk')}</TableHead>
                  <TableHead className="pr-6 text-right">{tc('created')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      {t('noMatchingClients')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer transition-colors"
                      onClick={() => router.push(`/clients/${client.id}`)}
                    >
                      <TableCell className="pl-6 font-medium">{client.name}</TableCell>
                      <TableCell>
                        <TypeBadge clientType={client.clientType} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client.industry || '\u2014'}
                      </TableCell>
                      <TableCell>
                        <KycBadge status={client.kycStatus} />
                      </TableCell>
                      <TableCell>
                        <RiskBadge rating={client.riskRating} />
                      </TableCell>
                      <TableCell className="pr-6 text-right text-muted-foreground">
                        {new Date(client.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Count footer */}
      {(clients?.length ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground">
          {tc('showing', { count: filtered.length, total: clients?.length ?? 0 })}
        </p>
      )}
    </div>
  );
}
