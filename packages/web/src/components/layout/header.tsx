'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth';
import { logoutFromMicrosoftRedirect } from '@/lib/microsoft-auth';
import { LogOut, Settings, User } from 'lucide-react';
import { CommandSearch } from '@/components/layout/command-search';
import { NotificationPanel } from '@/components/layout/notification-panel';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ---------------------------------------------------------------------------
// Header Component
// ---------------------------------------------------------------------------
export function Header() {
  const router = useRouter();
  const { user, clearTokens } = useAuthStore();
  const tc = useTranslations('common');

  const initials = user
    ? `${(user.firstName?.[0] ?? '').toUpperCase()}${(user.lastName?.[0] ?? '').toUpperCase()}` || user.email[0].toUpperCase()
    : 'U';

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    : 'User';

  const displayEmail = user?.email ?? '';

  const handleLogout = async () => {
    clearTokens();
    const redirected = await logoutFromMicrosoftRedirect().catch(() => false);
    if (!redirected) {
      window.location.href = '/login';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-[rgb(88_93_100_/_0.22)] bg-gold px-6 text-white">
      {/* Spacer — breadcrumbs removed for cleaner header */}
      <div />

      {/* ----- Spacer ----- */}
      <div className="flex-1" />

      {/* ----- Right side actions ----- */}
      <div className="flex items-center gap-2">
        {/* Universal Search (Cmd+K) */}
        <CommandSearch />

        {/* Notification panel */}
        <NotificationPanel />

        <Separator orientation="vertical" className="mx-1 h-5 bg-primary/20" />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-8 items-center gap-2 rounded-xl px-2 text-white hover:bg-white/10"
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-white/15 text-[10px] font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-white md:inline-block">
                {displayName}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium leading-none">{displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {displayEmail}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <User className="mr-2 size-4" />
                {tc('profile')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 size-4" />
                {tc('settings')}
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => void handleLogout()} variant="destructive">
              <LogOut className="mr-2 size-4" />
              {tc('logOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
