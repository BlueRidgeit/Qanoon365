'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useComplaint, useUpdateComplaint } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComplaintForm } from '@/components/enforcement/complaint-form';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-yellow-400/20 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300 status-new-sparkle',
  under_investigation: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  referred_to_prosecution: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  closed: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

function formatDate(dateStr?: string) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useTranslations('enforcement');
  const tc = useTranslations('common');
  const { data: complaint, isLoading } = useComplaint(id);
  const updateComplaint = useUpdateComplaint();
  const [editOpen, setEditOpen] = useState(false);

  async function handleStatusChange(status: string) {
    try {
      await updateComplaint.mutateAsync({ id, status });
      toast.success(t('statusUpdated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('updateFailed'));
    }
  }

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 rounded-xl" /></div>;
  }

  if (!complaint) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/enforcement/complaints')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{complaint.complaintNumber}</h1>
              <Badge variant="secondary" className={cn('border-0', STATUS_STYLES[complaint.status])}>
                {t(`complaintStatuses.${complaint.status}`)}
              </Badge>
            </div>
            <p className="text-muted-foreground">{t(`complaintTypes.${complaint.complaintType}`)} · {t(`courts.${complaint.court}`)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={complaint.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">{t('complaintStatuses.new')}</SelectItem>
              <SelectItem value="under_investigation">{t('complaintStatuses.under_investigation')}</SelectItem>
              <SelectItem value="referred_to_prosecution">{t('complaintStatuses.referred_to_prosecution')}</SelectItem>
              <SelectItem value="closed">{t('complaintStatuses.closed')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4" />
            {tc('edit')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border p-4 space-y-4">
          <h3 className="text-sm font-semibold">{t('complaintDetails')}</h3>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-muted-foreground">{t('complaintNumber')}</span>
            <span className="font-medium">{complaint.complaintNumber}</span>
            <span className="text-muted-foreground">{t('complaintType')}</span>
            <span className="font-medium">{t(`complaintTypes.${complaint.complaintType}`)}</span>
            <span className="text-muted-foreground">{t('court')}</span>
            <span className="font-medium">{t(`courts.${complaint.court}`)}</span>
            <span className="text-muted-foreground">{t('filedDate')}</span>
            <span className="font-medium">{formatDate(complaint.filedDate)}</span>
            {complaint.referralDate && <>
              <span className="text-muted-foreground">{t('referralDate')}</span>
              <span className="font-medium">{formatDate(complaint.referralDate)}</span>
            </>}
          </div>
        </div>

        <div className="rounded-xl border p-4 space-y-4">
          <h3 className="text-sm font-semibold">{t('parties')}</h3>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span className="text-muted-foreground">{t('complainantName')}</span>
            <span className="font-medium">{complaint.complainantName}</span>
            {complaint.complainantNameArabic && <>
              <span className="text-muted-foreground">{t('complainantNameArabic')}</span>
              <span className="font-medium" dir="rtl">{complaint.complainantNameArabic}</span>
            </>}
            <span className="text-muted-foreground">{t('respondentName')}</span>
            <span className="font-medium">{complaint.respondentName}</span>
            {complaint.respondentNameArabic && <>
              <span className="text-muted-foreground">{t('respondentNameArabic')}</span>
              <span className="font-medium" dir="rtl">{complaint.respondentNameArabic}</span>
            </>}
          </div>
        </div>
      </div>

      {complaint.notes && (
        <div className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold mb-2">{tc('notes')}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{complaint.notes}</p>
        </div>
      )}

      <ComplaintForm open={editOpen} onOpenChange={setEditOpen} editData={complaint} />
    </div>
  );
}
