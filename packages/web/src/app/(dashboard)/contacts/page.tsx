'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useContacts, type Contact } from '@/hooks/use-api';
import { Search, Users } from 'lucide-react';
import Link from 'next/link';

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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

// ---------------------------------------------------------------------------
// Extended contact type - the server may include the client object
// ---------------------------------------------------------------------------

interface ContactWithClient extends Contact {
  client?: {
    id: string;
    name: string;
  };
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ContactsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-60" />
      </div>
      <Skeleton className="h-10 w-72" />
      <Card className="rounded-xl">
        <CardContent className="p-0">
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-28 ml-auto" />
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
  const t = useTranslations('contacts');
  return (
    <Card className="rounded-xl">
      <CardContent className="flex flex-col items-center justify-center py-20">
        <div className="rounded-2xl bg-muted p-4 mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">{t('noContacts')}</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm text-center">
          {t('noContactsHint')}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ContactsPage() {
  const t = useTranslations('contacts');
  const tc = useTranslations('common');
  const { data: contacts, isLoading } = useContacts();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!contacts) return [];
    const q = search.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      return fullName.includes(q);
    });
  }, [contacts, search]);

  if (isLoading) return <ContactsPageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Search */}
      {(contacts?.length ?? 0) > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchContacts')}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Empty state */}
      {(contacts?.length ?? 0) === 0 && <EmptyState />}

      {/* Table */}
      {(contacts?.length ?? 0) > 0 && (
        <Card className="rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">{tc('name')}</TableHead>
                  <TableHead>{tc('email')}</TableHead>
                  <TableHead>{tc('phone')}</TableHead>
                  <TableHead>{t('jobTitle')}</TableHead>
                  <TableHead className="pr-6">{tc('client')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      {t('noMatchingContacts')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((contact) => {
                    const c = contact as ContactWithClient;
                    return (
                      <TableRow key={c.id} className="transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {c.firstName[0]}
                              {c.lastName[0]}
                            </div>
                            <span className="font-medium">
                              {c.firstName} {c.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.email || '\u2014'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.phone || '\u2014'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.jobTitle || '\u2014'}
                        </TableCell>
                        <TableCell className="pr-6">
                          {c.client ? (
                            <Link
                              href={`/clients/${c.client.id}`}
                              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {c.client.name}
                            </Link>
                          ) : c.clientId ? (
                            <Link
                              href={`/clients/${c.clientId}`}
                              className="inline-flex items-center text-sm text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t('viewClient')}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">{'\u2014'}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Count footer */}
      {(contacts?.length ?? 0) > 0 && (
        <p className="text-xs text-muted-foreground">
          {tc('showing', { count: filtered.length, total: contacts?.length ?? 0 })}
        </p>
      )}
    </div>
  );
}
