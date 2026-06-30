'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  CheckCheck,
  FileText,
  Gavel,
  Shield,
  UserCheck,
  AlertTriangle,
  Briefcase,
  Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-api';
import type { Notification } from '@/hooks/use-api';

const entityIcons: Record<string, typeof Bell> = {
  lead: Inbox,
  opportunity: Briefcase,
  matter: Gavel,
  kyc: UserCheck,
  conflict: Shield,
  document: FileText,
  court_hearing: Gavel,
  task: CheckCheck,
};

const entityRoutes: Record<string, string> = {
  lead: '/leads',
  opportunity: '/opportunities',
  matter: '/matters',
  kyc: '/kyc',
  conflict: '/conflicts',
  document: '/documents',
};

function NotificationItem({
  notification,
  onRead,
  onNavigate,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onNavigate: (n: Notification) => void;
}) {
  const Icon = entityIcons[notification.entityType ?? ''] ?? AlertTriangle;

  return (
    <button
      onClick={() => {
        if (!notification.isRead) onRead(notification.id);
        onNavigate(notification);
      }}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
        !notification.isRead && 'bg-primary/[0.03]',
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
          !notification.isRead
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm leading-snug',
              !notification.isRead ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {notification.body}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}

export function NotificationPanel() {
  const router = useRouter();
  const { data: notifications = [] } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = unreadData?.count ?? 0;

  const handleRead = useCallback(
    (id: string) => {
      markRead.mutate(id);
    },
    [markRead],
  );

  const handleNavigate = useCallback(
    (n: Notification) => {
      const route = entityRoutes[n.entityType ?? ''];
      if (route && n.entityId) {
        router.push(`${route}/${n.entityId}`);
      } else if (route) {
        router.push(route);
      }
    },
    [router],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-gold hover:text-gold/80"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-gold text-[9px] font-bold text-gold-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[380px] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {unreadCount} new
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="mr-1 size-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Bell className="size-5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                All caught up
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                No notifications to show
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={handleRead}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
