'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateCourtContact, useUpdateCourtContact, type CourtContact } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

export function CourtContactForm({
  open,
  onOpenChange,
  editData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: CourtContact;
}) {
  const createMutation = useCreateCourtContact();
  const updateMutation = useUpdateCourtContact();
  const t = useTranslations('enforcement');
  const tc = useTranslations('common');
  const isEdit = !!editData;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [form, setForm] = useState({ court: '', department: '', contactName: '', email: '', phone: '' });

  useEffect(() => {
    if (editData) {
      setForm({
        court: editData.court,
        department: editData.department ?? '',
        contactName: editData.contactName ?? '',
        email: editData.email,
        phone: editData.phone ?? '',
      });
    } else {
      setForm({ court: '', department: '', contactName: '', email: '', phone: '' });
    }
  }, [editData, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: editData!.id, ...form });
      } else {
        await createMutation.mutateAsync(form);
      }
      toast.success(isEdit ? t('contactUpdated') : t('contactCreated'));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('contactFailed'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('editContact') : t('newContact')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('court')}</Label>
            <Select value={form.court} onValueChange={(v) => setForm((p) => ({ ...p, court: v }))} required>
              <SelectTrigger className="w-full"><SelectValue placeholder={t('selectCourt')} /></SelectTrigger>
              <SelectContent>
                {UAE_COURTS.map((c) => <SelectItem key={c} value={c}>{t(`courts.${c}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('department')}</Label>
            <Input value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>{t('contactName')}</Label>
            <Input value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>{tc('email')}</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label>{tc('phone')}</Label>
            <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tc('cancel')}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" />{isEdit ? tc('save') : tc('create')}</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
