'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import {
  useFollowUpRule,
  useCreateFollowUpRule,
  useUpdateFollowUpRule,
  useDeleteFollowUpRule,
  useCourtContacts,
} from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FollowUpConfigProps {
  executionFileId: string;
  court?: string;
}

export function FollowUpConfig({ executionFileId, court }: FollowUpConfigProps) {
  const t = useTranslations('enforcement');
  const tc = useTranslations('common');
  const { data: rule, isLoading, isError } = useFollowUpRule(executionFileId);
  const { data: contacts = [] } = useCourtContacts();
  const createRule = useCreateFollowUpRule();
  const updateRule = useUpdateFollowUpRule();
  const deleteRule = useDeleteFollowUpRule();

  const [showSetup, setShowSetup] = useState(false);
  const [intervalDays, setIntervalDays] = useState('14');
  const [contactId, setContactId] = useState('');
  const [language, setLanguage] = useState('both');

  const hasRule = !!rule && !isError;

  // Auto-select the court contact matching the execution file's court
  useEffect(() => {
    if (!contactId && court && contacts.length > 0) {
      const match = contacts.find((c) => c.court === court);
      if (match) setContactId(match.id);
    }
  }, [contactId, court, contacts]);

  function handleToggle(checked: boolean) {
    if (checked) {
      // Show setup form instead of immediately creating
      setShowSetup(true);
    } else {
      handleDisable();
    }
  }

  async function handleEnable() {
    if (!contactId) {
      toast.error(t('selectCourtContact'));
      return;
    }
    try {
      await createRule.mutateAsync({
        executionFileId,
        intervalDays: parseInt(intervalDays),
        courtContactId: contactId,
        templateLanguage: language,
      });
      setShowSetup(false);
      toast.success(t('followUpEnabled'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('followUpFailed'));
    }
  }

  async function handleDisable() {
    if (!rule) return;
    try {
      await deleteRule.mutateAsync(rule.id);
      setShowSetup(false);
      toast.success(t('followUpDisabled'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('followUpFailed'));
    }
  }

  async function handleUpdate() {
    if (!rule) return;
    try {
      await updateRule.mutateAsync({
        id: rule.id,
        intervalDays: parseInt(intervalDays),
        templateLanguage: language,
      });
      toast.success(t('followUpUpdated'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('followUpFailed'));
    }
  }

  if (isLoading) return <div className="text-sm text-muted-foreground">{t('loadingFollowUp')}</div>;

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('autoFollowUp')}</span>
        </div>
        <Switch
          checked={hasRule && rule.isActive}
          onCheckedChange={handleToggle}
        />
      </div>

      {/* Setup form — shown when user toggles ON (before rule exists) */}
      {showSetup && !hasRule && (
        <div className="space-y-4 rounded-md border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            {t('configureFollowUp')}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('intervalDays')}</Label>
              <Input
                type="number"
                min="1"
                max="90"
                value={intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('courtContact')}</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger className="w-full"><SelectValue placeholder={t('selectContact')} /></SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{t(`courts.${c.court}`)} — {c.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('emailLanguage')}</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleEnable} disabled={createRule.isPending}>
              {createRule.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t('followUpEnable')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSetup(false)}>
              {tc('cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Active rule settings */}
      {hasRule && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('intervalDays')}</Label>
              <Input
                type="number"
                min="1"
                max="90"
                value={hasRule ? String(rule.intervalDays) : intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('courtContact')}</Label>
              <Select value={rule.courtContactId} disabled>
                <SelectTrigger className="w-full"><SelectValue placeholder={t('selectContact')} /></SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{t(`courts.${c.court}`)} — {c.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('emailLanguage')}</Label>
              <Select value={rule.templateLanguage} onValueChange={setLanguage}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('nextFollowUp')}: {new Date(rule.nextFollowUpDate).toLocaleDateString()}</span>
            <Button size="sm" variant="outline" onClick={handleUpdate} disabled={updateRule.isPending}>
              {updateRule.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : t('updateRule')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
