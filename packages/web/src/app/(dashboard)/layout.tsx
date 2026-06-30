'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { useSidebarStore } from '@/components/layout/sidebar';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const { collapsed } = useSidebarStore();
  const [mounted, setMounted] = useState(false);
  const isDaleelRoute = pathname?.startsWith('/daleel') ?? false;

  // Hydration guard: wait for client-side mount before rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth redirect
  useEffect(() => {
    if (mounted && !isAuthenticated()) {
      const suffix = searchParams?.toString();
      const returnTo = `${pathname ?? '/'}${suffix ? `?${suffix}` : ''}`;
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [mounted, isAuthenticated, pathname, router, searchParams]);

  // Show nothing while checking auth on first render
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-1 animate-pulse rounded-full bg-gold" />
          <span className="text-sm font-medium text-muted-foreground">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated()) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out',
        )}
      >
        {/* Header */}
        <Header />

        {/* Scrollable page content */}
        <main className={cn('flex-1', isDaleelRoute ? 'overflow-hidden' : 'overflow-y-auto')}>
          <div
            className={cn(
              'animate-fade-in',
              isDaleelRoute
                ? 'h-full w-full px-0 py-0'
                : 'mx-auto w-full max-w-7xl px-6 py-6',
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
