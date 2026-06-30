'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserCircle,
  Briefcase,
  TrendingUp,
  Search,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useClients, useContacts, useMatters, useOpportunities } from '@/hooks/use-api';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  type: 'client' | 'contact' | 'matter' | 'engagement';
  href: string;
}

const TYPE_CONFIG = {
  client: { icon: Users, color: 'text-blue-500', label: 'Client' },
  contact: { icon: UserCircle, color: 'text-violet-500', label: 'Contact' },
  matter: { icon: Briefcase, color: 'text-emerald-500', label: 'Matter' },
  engagement: { icon: TrendingUp, color: 'text-amber-500', label: 'Engagement' },
};

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  // Fetch data (these will be cached by React Query)
  const { data: clients = [] } = useClients();
  const { data: contacts = [] } = useContacts();
  const { data: matters = [] } = useMatters();
  const { data: opportunities = [] } = useOpportunities();

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Build search results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const items: SearchResult[] = [];

    // Search clients
    for (const c of clients) {
      if (c.name.toLowerCase().includes(q)) {
        items.push({
          id: c.id,
          label: c.name,
          sublabel: c.clientType === 'company' ? c.industry || 'Company' : 'Individual',
          type: 'client',
          href: `/clients/${c.id}`,
        });
      }
    }

    // Search contacts
    for (const c of contacts) {
      const name = `${c.firstName} ${c.lastName}`;
      if (name.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q))) {
        items.push({
          id: c.id,
          label: name,
          sublabel: c.jobTitle || c.email || undefined,
          type: 'contact',
          href: `/clients/${c.clientId}`,
        });
      }
    }

    // Search matters (by name and matter number)
    for (const m of matters) {
      if (
        m.name.toLowerCase().includes(q) ||
        m.matterNumber.toLowerCase().includes(q)
      ) {
        items.push({
          id: m.id,
          label: m.name,
          sublabel: m.matterNumber,
          type: 'matter',
          href: `/matters/${m.id}`,
        });
      }
    }

    // Search engagements (opportunities)
    for (const o of opportunities) {
      if (o.name.toLowerCase().includes(q)) {
        items.push({
          id: o.id,
          label: o.name,
          sublabel: o.client?.name || o.stage,
          type: 'engagement',
          href: `/opportunities/${o.id}`,
        });
      }
    }

    return items.slice(0, 10); // Cap at 10 results
  }, [query, clients, contacts, matters, opportunities]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Navigate to result
  const navigateTo = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setQuery('');
      router.push(result.href);
    },
    [router],
  );

  // Keyboard navigation within results
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigateTo(results[selectedIndex]);
    }
  }

  return (
    <>
      {/* Trigger button in header */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative hidden items-center gap-2 rounded-2xl border border-[#de871b] bg-[#e78f1b] px-4 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-all duration-200 hover:bg-[#de871b] hover:border-[#d37d14] md:flex"
      >
        <Search className="size-4 text-white" />
        <span>Search...</span>
        <kbd className="pointer-events-none ml-4 hidden select-none items-center gap-0.5 rounded-full border border-[#c97915] bg-[#f2a33d] px-2 py-0.5 text-[10px] font-medium text-white lg:inline-flex">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Search dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(''); }}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg [&>[data-slot=dialog-close]]:hidden">
          {/* Search input */}
          <div className="flex items-center border-b px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              placeholder="Search clients, contacts, matters, engagements..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-12 border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto p-2">
            {query.trim() && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No results for &quot;{query}&quot;
                </p>
              </div>
            )}

            {!query.trim() && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Start typing to search across your firm
                </p>
              </div>
            )}

            {results.map((result, index) => {
              const config = TYPE_CONFIG[result.type];
              const Icon = config.icon;

              return (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onClick={() => navigateTo(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
                    index === selectedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-accent/50',
                  )}
                >
                  <div className={cn('shrink-0', config.color)}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{result.label}</p>
                    {result.sublabel && (
                      <p className="truncate text-xs text-muted-foreground">
                        {result.sublabel}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {results.length > 0 && (
            <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
              <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-2">
                <kbd className="rounded border px-1 py-0.5 text-[10px]">&uarr;&darr;</kbd>
                <span>navigate</span>
                <kbd className="rounded border px-1 py-0.5 text-[10px]">&crarr;</kbd>
                <span>open</span>
                <kbd className="rounded border px-1 py-0.5 text-[10px]">esc</kbd>
                <span>close</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
