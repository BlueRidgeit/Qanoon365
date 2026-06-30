'use client';

import { useTranslations } from 'next-intl';
import { Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useFollowUpLogs } from '@/hooks/use-api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { icon: React.ElementType; style: string }> = {
  sent: { icon: CheckCircle, style: 'text-emerald-600 dark:text-emerald-400' },
  failed: { icon: XCircle, style: 'text-red-600 dark:text-red-400' },
  scheduled: { icon: Clock, style: 'text-amber-600 dark:text-amber-400' },
};

export function FollowUpHistory({ executionFileId }: { executionFileId: string }) {
  const t = useTranslations('enforcement');
  const { data: logs = [], isLoading } = useFollowUpLogs({ executionFileId });

  if (isLoading) return <div className="text-sm text-muted-foreground">{t('loadingLogs')}</div>;

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />
        {t('noFollowUpLogs')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const config = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.scheduled;
        const Icon = config.icon;
        return (
          <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
            <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', config.style)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{log.subject}</span>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {t(`followUpStatuses.${log.status}`)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {log.recipientEmail} · {new Date(log.createdAt).toLocaleString()}
              </p>
              {log.errorMessage && (
                <p className="text-xs text-red-500 mt-1">{log.errorMessage}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
