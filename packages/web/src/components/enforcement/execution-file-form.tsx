'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useCreateExecutionFile,
  useUpdateExecutionFile,
  type ExecutionFile,
  type CreateExecutionFileRequest,
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

interface FormState {
  fileNumber: string;
  caseNumber: string;
  court: string;
  filingDate: string;
  claimAmount: string;
  debtorName: string;
  debtorNameArabic: string;
  creditorName: string;
  creditorNameArabic: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  fileNumber: '',
  caseNumber: '',
  court: '',
  filingDate: '',
  claimAmount: '',
  debtorName: '',
  debtorNameArabic: '',
  creditorName: '',
  creditorNameArabic: '',
  notes: '',
};

export function ExecutionFileForm({
  open,
  onOpenChange,
  editData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: ExecutionFile;
}) {
  const createMutation = useCreateExecutionFile();
  const updateMutation = useUpdateExecutionFile();
  const { user } = useAuthStore();
  const t = useTranslations('enforcement');
  const tc = useTranslations('common');

  const isEdit = !!editData;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (editData) {
      setForm({
        fileNumber: editData.fileNumber,
        caseNumber: editData.caseNumber ?? '',
        court: editData.court,
        filingDate: editData.filingDate?.split('T')[0] ?? '',
        claimAmount: String(editData.claimAmount),
        debtorName: editData.debtorName,
        debtorNameArabic: editData.debtorNameArabic ?? '',
        creditorName: editData.creditorName,
        creditorNameArabic: editData.creditorNameArabic ?? '',
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
          fileNumber: form.fileNumber,
          caseNumber: form.caseNumber || undefined,
          court: form.court,
          claimAmount: Number(form.claimAmount),
          debtorName: form.debtorName,
          debtorNameArabic: form.debtorNameArabic || undefined,
          creditorName: form.creditorName,
          creditorNameArabic: form.creditorNameArabic || undefined,
          notes: form.notes || undefined,
        });
        toast.success(t('fileUpdated'));
      } else {
        const payload: CreateExecutionFileRequest = {
          fileNumber: form.fileNumber.trim(),
          caseNumber: form.caseNumber.trim() || undefined,
          court: form.court,
          filingDate: form.filingDate,
          claimAmount: Number(form.claimAmount),
          debtorName: form.debtorName.trim(),
          debtorNameArabic: form.debtorNameArabic.trim() || undefined,
          creditorName: form.creditorName.trim(),
          creditorNameArabic: form.creditorNameArabic.trim() || undefined,
          assignedTo: user?.id ?? '',
          notes: form.notes.trim() || undefined,
        };
        await createMutation.mutateAsync(payload);
        toast.success(t('fileCreated'));
      }
      setForm(EMPTY_FORM);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('fileFailed'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editFile') : t('newFile')}</DialogTitle>
          <DialogDescription>{isEdit ? t('editFileDesc') : t('newFileDesc')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('fileNumber')}</Label>
              <Input
                placeholder={t('fileNumberPlaceholder')}
                value={form.fileNumber}
                onChange={(e) => updateField('fileNumber', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('caseNumber')}</Label>
              <Input
                placeholder={t('caseNumberPlaceholder')}
                value={form.caseNumber}
                onChange={(e) => updateField('caseNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('court')}</Label>
              <Select value={form.court} onValueChange={(v) => updateField('court', v)} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectCourt')} />
                </SelectTrigger>
                <SelectContent>
                  {UAE_COURTS.map((court) => (
                    <SelectItem key={court} value={court}>{t(`courts.${court}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('filingDate')}</Label>
              <Input type="date" value={form.filingDate} onChange={(e) => updateField('filingDate', e.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>{t('claimAmount')}</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.claimAmount} onChange={(e) => updateField('claimAmount', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('debtorName')}</Label>
              <Input value={form.debtorName} onChange={(e) => updateField('debtorName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('debtorNameArabic')}</Label>
              <Input dir="rtl" value={form.debtorNameArabic} onChange={(e) => updateField('debtorNameArabic', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('creditorName')}</Label>
              <Input value={form.creditorName} onChange={(e) => updateField('creditorName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('creditorNameArabic')}</Label>
              <Input dir="rtl" value={form.creditorNameArabic} onChange={(e) => updateField('creditorNameArabic', e.target.value)} />
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
