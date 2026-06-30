'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/lib/auth';
import { logoutFromMicrosoftRedirect } from '@/lib/microsoft-auth';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import {
  IconDashboard,
  IconEnquiries,
  IconPipeline,
  IconMatters,
  IconClients,
  IconContacts,
  IconConflict,
  IconKyc,
  IconGavel,
  IconExecutionFiles,
  IconComplaints,
  IconCalendar,
  IconAI,
  IconDocuments,
  IconSettings,
  IconGuide,
  IconDaleel,
  IconAppealDeadlines,
  IconArchive,
  IconTasks,
} from '@/components/layout/nav-icons';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import Image from 'next/image';

// ---------------------------------------------------------------------------
// Sidebar collapsed state store (shared with dashboard layout)
// ---------------------------------------------------------------------------
interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    { name: 'qanoon365-sidebar' },
  ),
);

// ---------------------------------------------------------------------------
// Navigation definition (translation keys)
// ---------------------------------------------------------------------------
interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    titleKey: 'overview',
    items: [
      { labelKey: 'firmDashboard', href: '/', icon: IconDashboard },
    ],
  },
  {
    titleKey: 'practice',
    items: [
      { labelKey: 'newEnquiries', href: '/leads', icon: IconEnquiries },
      { labelKey: 'engagementPipeline', href: '/opportunities', icon: IconPipeline },
      { labelKey: 'activeMatters', href: '/matters', icon: IconMatters },
      { labelKey: 'taskCenter', href: '/tasks', icon: IconTasks },
      { labelKey: 'appealDeadlines', href: '/appeal-deadlines', icon: IconAppealDeadlines },
    ],
  },
  {
    titleKey: 'relationships',
    items: [
      { labelKey: 'clientDirectory', href: '/clients', icon: IconClients },
      { labelKey: 'counselContacts', href: '/contacts', icon: IconContacts },
    ],
  },
  {
    titleKey: 'compliance',
    items: [
      { labelKey: 'conflictChecks', href: '/conflicts', icon: IconConflict },
      { labelKey: 'kycCompliance', href: '/kyc', icon: IconKyc },
    ],
  },
  {
    titleKey: 'enforcement',
    items: [
      { labelKey: 'enforcementDashboard', href: '/enforcement', icon: IconGavel },
      { labelKey: 'executionFiles', href: '/enforcement/execution-files', icon: IconExecutionFiles },
      { labelKey: 'criminalComplaints', href: '/enforcement/complaints', icon: IconComplaints },
      { labelKey: 'followUpSettings', href: '/enforcement/follow-ups', icon: IconCalendar },
    ],
  },
  {
    titleKey: 'archive',
    items: [
      { labelKey: 'officeArchive', href: '/archive', icon: IconArchive },
    ],
  },
  {
    titleKey: 'intelligence',
    items: [
      { labelKey: 'daleelChat', href: '/daleel', icon: IconDaleel },
      { labelKey: 'aiConflictCheckEngine', href: '/court-intel', icon: IconAI },
    ],
  },
  {
    titleKey: 'firmAdmin',
    items: [
      { labelKey: 'documentVault', href: '/documents', icon: IconDocuments },
      { labelKey: 'firmSettings', href: '/settings', icon: IconSettings },
      { labelKey: 'userGuide', href: '/guide', icon: IconGuide },
    ],
  },
];

function getActiveHref(pathname: string) {
  if (pathname === '/') {
    return '/';
  }

  const matches = navigation
    .flatMap((section) => section.items)
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((left, right) => right.href.length - left.href.length);

  return matches[0]?.href ?? null;
}

// ---------------------------------------------------------------------------
// Sidebar Component
// ---------------------------------------------------------------------------
export function Sidebar() {
  const pathname = usePathname();
  const locale = useLocale();
  const { collapsed, toggle } = useSidebarStore();
  const { user, clearTokens } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const t = useTranslations('nav');
  const tc = useTranslations('common');
  const tr = useTranslations('roles');

  const isRtl = locale === 'ar';

  const handleLogout = async () => {
    clearTokens();
    const redirected = await logoutFromMicrosoftRedirect().catch(() => false);
    if (!redirected) {
      window.location.href = '/login';
    }
  };

  const initials = user
    ? `${(user.firstName?.[0] ?? '').toUpperCase()}${(user.lastName?.[0] ?? '').toUpperCase()}` || user.email[0].toUpperCase()
    : 'U';

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : 'User';

  const displayRole = user?.role ? tr(user.role as 'admin' | 'partner' | 'compliance' | 'lawyer' | 'bd') : 'Member';
  const activeHref = getActiveHref(pathname);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'group/sidebar relative flex h-screen flex-col border-sidebar-border bg-sidebar text-sidebar-foreground',
          'transition-[width] duration-300 ease-in-out',
          isRtl ? 'border-l' : 'border-r',
          collapsed ? 'w-[72px]' : 'w-[260px]',
        )}
      >
        {/* ----------------------------------------------------------------- */}
        {/* Logo / Wordmark                                                    */}
        {/* ----------------------------------------------------------------- */}
          <div className={cn('flex items-center gap-3 px-4 py-3', collapsed && 'justify-center px-2')}>
            {/* Logo image */}
                    <div className="shrink-0 rounded-2xl bg-[#585d64] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <Image
                        src="/white-logo.png"
                        alt="Qanoon365"
                        width={64}
                        height={64}
                        priority
                        className="object-contain"
                      />
                    </div>
          {/* Wordmark — hidden when collapsed */}
          <div
            className={cn(
              'overflow-hidden transition-[opacity,width] duration-300 ease-in-out',
              collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
            )}
          >
                      <Image
                        src="/white-logo-text-under.png"
                        alt="Qanoon365"
                        width={260}
                        height={96}
                        priority
                        className="h-auto w-[150px] object-contain"
                      />
          </div>
        </div>

        <Separator className="mx-3 w-auto" />

        {/* ----------------------------------------------------------------- */}
        {/* Navigation                                                         */}
        {/* ----------------------------------------------------------------- */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <div className="flex flex-col gap-6">
            {navigation.map((section) => (
              <div key={section.titleKey}>
                {/* Section title */}
                <div
                  className={cn(
                    'mb-2 overflow-hidden transition-[opacity,height] duration-300 ease-in-out',
                    collapsed ? 'h-0 opacity-0' : 'h-5 opacity-100',
                  )}
                >
                    <span className="px-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#dad9d9]">
                    {t(section.titleKey as 'overview' | 'practice' | 'relationships' | 'compliance' | 'enforcement' | 'archive' | 'intelligence' | 'firmAdmin')}
                  </span>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const active = item.href === activeHref;
                    const Icon = item.icon;
                    const label = item.labelKey === 'taskCenter'
                      ? (isRtl ? 'مركز المهام' : 'Task Center')
                      : t(item.labelKey as 'firmDashboard' | 'newEnquiries' | 'engagementPipeline' | 'activeMatters' | 'appealDeadlines' | 'clientDirectory' | 'counselContacts' | 'conflictChecks' | 'kycCompliance' | 'enforcementDashboard' | 'executionFiles' | 'criminalComplaints' | 'followUpSettings' | 'officeArchive' | 'aiConflictCheckEngine' | 'daleelChat' | 'documentVault' | 'firmSettings' | 'userGuide');

                    const linkContent = (
                      <Link
                        href={item.href}
                        className={cn(
                          'group/item relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-base font-medium transition-all duration-200',
                          'hover:bg-sidebar-accent hover:text-white',
                          active
                            ? 'bg-white/14 text-white shadow-[0_12px_24px_rgba(12,70,117,0.18)]'
                            : 'text-white',
                        )}
                      >
                        {/* Active border indicator */}
                        {active && (
                          <div className={cn(
                            'absolute top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gold transition-all duration-200',
                            isRtl ? 'right-0 rounded-l-full rounded-r-none' : 'left-0 rounded-r-full rounded-l-none',
                          )} />
                        )}

                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                            active ? 'bg-[#f7941e]/18 text-[#f7941e]' : 'text-white group-hover/item:text-white',
                          )}
                        >
                          <Icon
                            fill={active ? 'currentColor' : 'none'}
                            className={cn(
                              'size-[18px] shrink-0 transition-colors duration-200',
                              active ? 'text-[#f7941e]' : 'text-white',
                            )}
                          />
                        </span>

                        <span
                          className={cn(
                            'overflow-hidden whitespace-nowrap transition-[opacity,width] duration-300 ease-in-out',
                            collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
                          )}
                        >
                          {label}
                        </span>

                        {/* Badge */}
                        {item.badge != null && !collapsed && (
                          <span className={cn(
                            'flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary',
                            isRtl ? 'mr-auto' : 'ml-auto',
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );

                    // In collapsed state, wrap with tooltip
                    if (collapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                          <TooltipContent side={isRtl ? 'left' : 'right'} sideOffset={12}>
                            <span className="flex items-center gap-2">
                              {label}
                              {item.badge != null && (
                                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                  {item.badge}
                                </span>
                              )}
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return <div key={item.href}>{linkContent}</div>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* ----------------------------------------------------------------- */}
        {/* Bottom area: User + Theme + Language + Logout                      */}
        {/* ----------------------------------------------------------------- */}
        <div className="mt-auto">
          <Separator className="mx-3 w-auto" />

          <div className="flex flex-col gap-1 p-3">
            {/* User info */}
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2',
                collapsed && 'justify-center px-0',
              )}
            >
              <Avatar size="default">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div
                className={cn(
                  'overflow-hidden transition-[opacity,width] duration-300 ease-in-out',
                  collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
                )}
              >
                <p className="truncate text-sm font-medium text-white">
                  {displayName}
                </p>
                <p className="truncate text-xs text-white/75">
                  {displayRole}
                </p>
              </div>
            </div>

            {/* Action buttons row */}
            <div
              className={cn(
                'flex items-center gap-1',
                collapsed ? 'flex-col' : 'px-1',
              )}
            >
              {/* Theme toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="text-white/85 hover:text-[#f7941e]"
                  >
                    <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">{tc('toggleTheme')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={collapsed ? (isRtl ? 'left' : 'right') : 'top'} sideOffset={8}>
                  {tc('toggleTheme')}
                </TooltipContent>
              </Tooltip>

              {/* Language switcher */}
              <LanguageSwitcher side={collapsed ? (isRtl ? 'left' : 'right') : 'top'} />

              {/* Logout */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void handleLogout()}
                    className="text-white/85 hover:text-white"
                  >
                    <LogOut className="size-4" />
                    <span className="sr-only">{tc('logOut')}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={collapsed ? (isRtl ? 'left' : 'right') : 'top'} sideOffset={8}>
                  {tc('logOut')}
                </TooltipContent>
              </Tooltip>

              {/* Spacer (only in expanded) */}
              {!collapsed && <div className="flex-1" />}

              {/* Collapse toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={toggle}
                    className="text-white/85 hover:text-[#f7941e]"
                  >
                    {(collapsed ? !isRtl : isRtl) ? (
                      <ChevronRight className="size-4" />
                    ) : (
                      <ChevronLeft className="size-4" />
                    )}
                    <span className="sr-only">
                      {collapsed ? tc('expandSidebar') : tc('collapseSidebar')}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={collapsed ? (isRtl ? 'left' : 'right') : 'top'} sideOffset={8}>
                  {collapsed ? tc('expand') : tc('collapse')}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Version */}
            <div className={cn('text-center', collapsed ? 'px-0' : 'px-1')}>
              <span className="text-[10px] text-sidebar-foreground/55 tracking-[0.2em]">v0.9</span>
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
