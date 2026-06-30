'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useMatters, type Matter } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Briefcase,
  Search,
  FolderOpen,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type StatusFilter = 'all' | 'active' | 'on_hold' | 'closed' | 'archived';

const STATUS_TAB_VALUES: StatusFilter[] = ['all', 'active', 'on_hold', 'closed', 'archived'];

const STATUS_BADGE_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
  on_hold: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25',
  closed: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/25',
  archived: 'bg-muted text-muted-foreground border-muted',
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

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function MattersTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-[260px]" />
      </div>
      <div className="rounded-lg border">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-0">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-48 flex-1" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ filtered }: { filtered: boolean }) {
  const t = useTranslations('matters');
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-xl bg-muted p-4 mb-4">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">
        {filtered ? t('noMatchingMatters') : t('noMatters')}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {filtered
          ? 'Try adjusting your search or filter criteria.'
          : 'Matters will appear here once opportunities are converted.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MattersPage() {
  const t = useTranslations('matters');
  const ts = useTranslations('statuses');
  const tsm = useTranslations('statuses.matter');
  const tp = useTranslations('practiceAreas');
  const tc = useTranslations('common');
  const { data: matters, isLoading } = useMatters();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!matters) return [];
    let result = [...matters];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((m) => m.status === statusFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.matterNumber.toLowerCase().includes(q),
      );
    }

    // Sort by open date descending
    result.sort(
      (a, b) =>
        new Date(b.openDate).getTime() - new Date(a.openDate).getTime(),
    );

    return result;
  }, [matters, statusFilter, search]);

  function getTabLabel(value: StatusFilter): string {
    if (value === 'all') return ts('all');
    return tsm(value);
  }

  function getStatusLabel(status: string): string {
    return tsm(status);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Briefcase className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">
              {matters?.length ?? 0} {t('totalMatters')}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <TabsList>
            {STATUS_TAB_VALUES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {getTabLabel(value)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchMatters')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <MattersTableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState filtered={statusFilter !== 'all' || search.trim().length > 0} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">{t('matterNumber')}</TableHead>
                <TableHead>{tc('name')}</TableHead>
                <TableHead>{tc('client')}</TableHead>
                <TableHead className="w-[100px]">{tc('status')}</TableHead>
                <TableHead>{t('practiceArea')}</TableHead>
                <TableHead className="w-[120px]">{t('opened')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((matter) => {
                const badgeClassName = STATUS_BADGE_STYLES[matter.status] ?? 'bg-muted text-muted-foreground';

                return (
                  <TableRow key={matter.id} className="group">
                    <TableCell>
                      <Link
                        href={`/matters/${matter.id}`}
                        className="font-mono text-sm text-primary hover:underline"
                      >
                        {matter.matterNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/matters/${matter.id}`}
                        className="font-medium text-foreground group-hover:text-primary transition-colors"
                      >
                        {matter.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {matter.client?.name ?? '\u2014'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', badgeClassName)}
                      >
                        {getStatusLabel(matter.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {matter.practiceArea ? tp(matter.practiceArea) : '\u2014'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(matter.openDate)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
