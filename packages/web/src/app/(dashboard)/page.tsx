'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useDashboard, type Activity } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  Users,
  Briefcase,
  Shield,
  FileCheck,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Mail,
  Phone,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const STAGE_COLORS = [
  'var(--chart-5)',
  'var(--chart-1)',
  'var(--chart-3)',
  'var(--pink)',
  'var(--chart-2)',
  'var(--destructive)',
];

const KYC_COLORS: Record<string, string> = {
  verified: 'var(--chart-2)',
  under_review: 'var(--chart-3)',
  documents_requested: 'var(--chart-1)',
  expired: 'var(--destructive)',
  not_started: 'var(--muted-foreground)',
  rejected: 'var(--destructive)',
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  href,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  href?: string;
  color?: string;
}) {
  const content = (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/20 min-h-[140px] h-full">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </div>
            )}
          </div>
          <div
            className="rounded-xl p-3 transition-colors"
            style={{ backgroundColor: color ? `${color}15` : 'var(--accent)' }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: color || 'var(--muted-foreground)' }}
            />
          </div>
        </div>
        {href && (
          <ArrowUpRight className="absolute top-4 right-4 h-4 w-4 text-muted-foreground/0 transition-all group-hover:text-muted-foreground/60" />
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>;
  }
  return content;
}

function PipelineChart({ data, stageLabels }: { data: Record<string, number>; stageLabels: Record<string, string> }) {
  const t = useTranslations('dashboard');
  const chartData = Object.entries(data).map(([stage, count]) => ({
    name: stageLabels[stage] || stage,
    count,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {t('instructionPipeline')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--card-foreground)',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={index} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function KycDonut({ data }: { data: Record<string, number> }) {
  const t = useTranslations('dashboard');
  const tsk = useTranslations('statuses.kycStatus');
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: tsk(status),
      value: count,
      color: KYC_COLORS[status] || 'var(--muted)',
    }));

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{t('kycStatusOverview')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="h-[200px] w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3">
            {chartData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="capitalize text-muted-foreground">{entry.name}</span>
                </div>
                <span className="font-medium">
                  {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const locale = useLocale();
  const typeIcon: Record<string, React.ElementType> = {
    system_event: CheckCircle2,
    note: FileText,
    meeting: Users,
    phone_call: Phone,
    email: Mail,
    task: Target,
  };
  const Icon = typeIcon[activity.activityType] || Clock;

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 rounded-full bg-muted p-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">{activity.subject}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(activity.activityDate).toLocaleDateString(locale, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

function ConflictAlerts({ conflicts }: { conflicts: { resolutionStatuses: Record<string, number>; totalPending: number; opportunitiesWithConflicts: number } }) {
  const t = useTranslations('dashboard');
  const pending = conflicts.totalPending || 0;
  const total = conflicts.opportunitiesWithConflicts || 0;

  if (pending === 0 && total === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{t('conflictCheckAlerts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 py-6 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
            <div>
              <p className="font-medium">{t('allClear')}</p>
              <p className="text-sm text-muted-foreground">{t('noPendingConflicts')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{t('conflictCheckAlerts')}</CardTitle>
          <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
            {pending} {t('pending')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 py-4">
          <div className="rounded-xl bg-amber-500/10 p-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-medium">
              {t('instructionsWithConflicts', { count: total })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('awaitingClearance', { count: pending })}
            </p>
          </div>
        </div>
        <Link
          href="/conflicts"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t('reviewConflicts')} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[360px] rounded-xl" />
        <Skeleton className="h-[360px] rounded-xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const t = useTranslations('dashboard');
  const ts = useTranslations('statuses');
  const tsk = useTranslations('statuses.kycStatus');

  if (isLoading) return <DashboardSkeleton />;

  const pipeline = data?.pipeline || { stages: {} as Record<string, number>, totalActive: 0, totalWon: 0, totalLost: 0, totalEstimatedValue: 0 };
  const conflicts = data?.conflicts || { resolutionStatuses: {} as Record<string, number>, totalPending: 0, opportunitiesWithConflicts: 0 };
  const kyc = data?.kyc || { clientStatuses: {} as Record<string, number>, complianceRate: 0, totalClients: 0, verifiedCount: 0, expiredCount: 0 };
  const activities = data?.recentActivities || [];
  const activeMatters = data?.activeMatters || 0;

  const stageData = pipeline.stages || {};
  const totalOpps = Object.values(stageData).reduce(
    (sum: number, v: unknown) => sum + (typeof v === 'number' ? v : 0),
    0,
  );

  const stageLabels: Record<string, string> = {
    inquiry: ts('engagement.inquiry'),
    consultation: ts('engagement.consultation'),
    proposal: ts('engagement.proposal'),
    retainer: ts('engagement.retainer'),
    won: ts('engagement.won'),
    lost: ts('engagement.lost'),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('subtitle')}
        </p>
        <div className="mt-3 h-px w-24 bg-gradient-to-r from-primary via-pink to-gold" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('activeInstructions')}
          value={totalOpps}
          subtitle={Number(pipeline.totalEstimatedValue) ? t('estFees', { value: (Number(pipeline.totalEstimatedValue) / 1000000).toFixed(1) }) : t('buildingPipeline')}
          icon={TrendingUp}
          href="/opportunities"
          color="var(--chart-1)"
        />
        <StatCard
          title={t('openMatters')}
          value={activeMatters}
          icon={Briefcase}
          href="/matters"
          color="var(--chart-2)"
        />
        <StatCard
          title={t('conflictReviews')}
          value={conflicts.totalPending}
          subtitle={conflicts.opportunitiesWithConflicts ? t('instructionsAffected', { count: conflicts.opportunitiesWithConflicts }) : t('allClear')}
          icon={Shield}
          href="/conflicts"
          color={conflicts.totalPending ? 'var(--warning)' : 'var(--chart-2)'}
        />
        <StatCard
          title={t('kycCompliance')}
          value={`${Math.round(kyc.complianceRate || 0)}%`}
          subtitle={t('clientsVerified', { verified: kyc.verifiedCount, total: kyc.totalClients })}
          icon={FileCheck}
          href="/kyc"
          color="var(--chart-2)"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PipelineChart data={stageData} stageLabels={stageLabels} />
        <KycDonut data={kyc.clientStatuses || {}} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ConflictAlerts conflicts={conflicts} />
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">
                {t('recentActivity')}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t('noRecentActivity')}
              </p>
            ) : (
              <div className="divide-y">
                {activities.slice(0, 5).map((a) => (
                  <ActivityItem key={a.id} activity={a} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
