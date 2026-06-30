'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateComplaint,
  useUpdateComplaint,
  type CriminalComplaint,
  type CreateComplaintRequest,
} from '@/hooks/use-api';
import { useAuthStore } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const UAE_COURTS = [
  'dubai', 'sharjah', 'ajman', 'abu_dhabi', 'ras_al_khaimah',
  'fujairah', 'umm_al_quwain', 'dubai_rent', 'sharjah_rent',
] as const;

const COMPLAINT_TYPES = [
  'breach_of_trust', 'fraud', 'forgery', 'embezzlement',
  'defamation', 'bounced_cheque', 'theft', 'other',
] as const;

interface FormState {
  complaintNumber: string;
  complaintType: string;
  court: string;
  complainantName: string;
  complainantNameArabic: string;
  respondentName: string;
  respondentNameArabic: string;
  filedDate: string;
  referralDate: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  complaintNumber: '',
  complaintType: '',
  court: '',
  complainantName: '',
  complainantNameArabic: '',
  respondentName: '',
  respondentNameArabic: '',
  filedDate: '',
  referralDate: '',
  notes: '',
};

export function ComplaintForm({
  open,
  onOpenChange,
  editData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: CriminalComplaint;
}) {
  const createMutation = useCreateComplaint();
  const updateMutation = useUpdateComplaint();
  const { user } = useAuthStore();
  const t = useTranslations('enforcement');
  const tc = useTranslations('common');

  const isEdit = !!editData;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (editData) {
      setForm({
        complaintNumber: editData.complaintNumber,
        complaintType: editData.complaintType,
        court: editData.court,
        complainantName: editData.complainantName,
        complainantNameArabic: editData.complainantNameArabic ?? '',
        respondentName: editData.respondentName,
        respondentNameArabic: editData.respondentNameArabic ?? '',
        filedDate: editData.filedDate?.split('T')[0] ?? '',
        referralDate: editData.referralDate?.split('T')[0] ?? '',
        notes: editData.notes ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editData, open]);

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: editData!.id,
          complaintNumber: form.complaintNumber,
          complaintType: form.complaintType,
          court: form.court,
          complainantName: form.complainantName,
          complainantNameArabic: form.complainantNameArabic || undefined,
          respondentName: form.respondentName,
          respondentNameArabic: form.respondentNameArabic || undefined,
          referralDate: form.referralDate || undefined,
          notes: form.notes || undefined,
        });
        toast.success(t('complaintUpdated'));
      } else {
        const payload: CreateComplaintRequest = {
          complaintNumber: form.complaintNumber.trim(),
          complaintType: form.complaintType,
          court: form.court,
          complainantName: form.complainantName.trim(),
          complainantNameArabic: form.complainantNameArabic.trim() || undefined,
          respondentName: form.respondentName.trim(),
          respondentNameArabic: form.respondentNameArabic.trim() || undefined,
          filedDate: form.filedDate,
          referralDate: form.referralDate || undefined,
          assignedTo: user?.id ?? '',
          notes: form.notes.trim() || undefined,
        };
        await createMutation.mutateAsync(payload);
        toast.success(t('complaintCreated'));
      }
      setForm(EMPTY_FORM);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('complaintFailed'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editComplaint') : t('newComplaint')}</DialogTitle>
          <DialogDescription>{isEdit ? t('editComplaintDesc') : t('newComplaintDesc')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('complaintNumber')}</Label>
              <Input value={form.complaintNumber} onChange={(e) => updateField('complaintNumber', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('complaintType')}</Label>
              <Select value={form.complaintType} onValueChange={(v) => updateField('complaintType', v)} required>
                <SelectTrigger className="w-full"><SelectValue placeholder={t('selectType')} /></SelectTrigger>
                <SelectContent>
                  {COMPLAINT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{t(`complaintTypes.${type}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('court')}</Label>
              <Select value={form.court} onValueChange={(v) => updateField('court', v)} required>
                <SelectTrigger className="w-full"><SelectValue placeholder={t('selectCourt')} /></SelectTrigger>
                <SelectContent>
                  {UAE_COURTS.map((court) => (
                    <SelectItem key={court} value={court}>{t(`courts.${court}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('filedDate')}</Label>
              <Input type="date" value={form.filedDate} onChange={(e) => updateField('filedDate', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('complainantName')}</Label>
              <Input value={form.complainantName} onChange={(e) => updateField('complainantName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('complainantNameArabic')}</Label>
              <Input dir="rtl" value={form.complainantNameArabic} onChange={(e) => updateField('complainantNameArabic', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('respondentName')}</Label>
              <Input value={form.respondentName} onChange={(e) => updateField('respondentName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('respondentNameArabic')}</Label>
              <Input dir="rtl" value={form.respondentNameArabic} onChange={(e) => updateField('respondentNameArabic', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{tc('notes')}</Label>
            <Textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc('cancel')}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />{tc('loading')}</> : <><Plus className="h-4 w-4" />{isEdit ? tc('save') : tc('create')}</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
