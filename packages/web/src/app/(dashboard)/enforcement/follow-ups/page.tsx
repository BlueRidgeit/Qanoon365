'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, CalendarClock, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCourtContacts, useDeleteCourtContact, useFollowUpLogs, type CourtContact, type FollowUpLog } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { CourtContactForm } from '@/components/enforcement/court-contact-form';

const LOG_STATUS_STYLES: Record<string, string> = {
  sent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
  scheduled: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  cancelled: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

export default function FollowUpSettingsPage() {
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<CourtContact | undefined>();
  const t = useTranslations('enforcement');
  const tc = useTranslations('common');

  const { data: contacts = [], isLoading: contactsLoading } = useCourtContacts();
  const { data: logs = [], isLoading: logsLoading } = useFollowUpLogs();
  const deleteContact = useDeleteCourtContact();

  async function handleDeleteContact(id: string) {
    try {
      await deleteContact.mutateAsync(id);
      toast.success(t('contactDeleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('contactFailed'));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('followUpSettingsTitle')}</h1>
        <p className="text-muted-foreground">{t('followUpSettingsSubtitle')}</p>
      </div>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">{t('courtContacts')}</TabsTrigger>
          <TabsTrigger value="logs">{t('followUpLogs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{t('courtContactsDesc')}</p>
            <Button onClick={() => { setEditContact(undefined); setContactDialogOpen(true); }}>
              <Plus className="h-4 w-4" />
              {t('newContact')}
            </Button>
          </div>

          {contactsLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-xl bg-muted p-4 mb-4"><CalendarClock className="h-8 w-8 text-muted-foreground" /></div>
              <p className="text-sm font-medium">{t('noContacts')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('court')}</TableHead>
                  <TableHead>{t('department')}</TableHead>
                  <TableHead>{t('contactName')}</TableHead>
                  <TableHead>{tc('email')}</TableHead>
                  <TableHead>{tc('phone')}</TableHead>
                  <TableHead>{tc('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{t(`courts.${c.court}`)}</TableCell>
                    <TableCell>{c.department || '--'}</TableCell>
                    <TableCell>{c.contactName || '--'}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone || '--'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditContact(c); setContactDialogOpen(true); }}>
                          {tc('edit')}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteContact(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="logs">
          {logsLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-xl bg-muted p-4 mb-4"><Mail className="h-8 w-8 text-muted-foreground" /></div>
              <p className="text-sm font-medium">{t('noFollowUpLogs')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('fileNumber')}</TableHead>
                  <TableHead>{t('recipient')}</TableHead>
                  <TableHead>{t('subject')}</TableHead>
                  <TableHead>{tc('status')}</TableHead>
                  <TableHead>{t('sentAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.executionFile?.fileNumber ?? '--'}</TableCell>
                    <TableCell>{log.recipientEmail}</TableCell>
                    <TableCell className="truncate max-w-[250px]">{log.subject}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('border-0', LOG_STATUS_STYLES[log.status])}>
                        {t(`followUpStatuses.${log.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.sentAt ? new Date(log.sentAt).toLocaleString() : '--'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <CourtContactForm open={contactDialogOpen} onOpenChange={setContactDialogOpen} editData={editContact} />
    </div>
  );
}
