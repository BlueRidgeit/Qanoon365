'use client';

import { cn } from '@/lib/utils';

const VARIANT_STYLES = {
  default: 'bg-card',
  warning: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
  success: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
};

export function EnforcementStatCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: string;
  variant?: 'default' | 'warning' | 'success';
}) {
  return (
    <div className={cn('rounded-xl border p-4 transition-colors', VARIANT_STYLES[variant])}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold">{value}</p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </div>
    </div>
  );
}
