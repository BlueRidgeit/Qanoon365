'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useLocale } from 'next-intl';
import { RotateCcw, Send, UserMinus, UserPlus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { useRegister } from '@/hooks/use-api';

const ROLES: Array<{ value: string; label: [string, string] }> = [
  { value: 'partner', label: ['شريك', 'Partner'] },
  { value: 'compliance', label: ['الامتثال', 'Compliance'] },
  { value: 'lawyer', label: ['محامٍ', 'Lawyer'] },
  { value: 'bd', label: ['تطوير الأعمال', 'Business Development'] },
  { value: 'admin', label: ['مسؤول', 'Admin'] },
];

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

type InviteStatus = { status: 'sent' | 'not_configured' | 'failed' | 'skipped'; error?: string };

// Admin only. Add people, change their role, remove or restore access, and resend invitations.
export function UsersPanel() {
  const locale = useLocale();
  const ar = locale === 'ar';
  const t = (arText: string, en: string) => (ar ? arText : en);
  const me = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('lawyer');
  const [sendInvite, setSendInvite] = useState(true);
  const register = useRegister();

  const fail = (err: unknown, fallback: string) =>
    setError(err instanceof Error && err.message ? err.message : fallback);

  const load = useCallback(async () => {
    try {
      setUsers(await api.get<UserRow[]>('/users'));
    } catch (err) {
      fail(err, 'Could not load the users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const describe = (invite: InviteStatus | undefined, who: string, added: boolean) => {
    if (invite?.status === 'sent') {
      return { ok: true, text: t(`تم إرسال دعوة بالبريد إلى ${who}.`, `Invitation email sent to ${who}.`) };
    }
    const prefix = added ? t('تمت الإضافة، لكن ', 'Added, but ') : '';
    if (invite?.status === 'not_configured') {
      return {
        ok: false,
        text: prefix + t('البريد الإلكتروني غير مُهيّأ بعد فلم تُرسل دعوة.', 'email is not set up yet, so no invitation was sent.'),
      };
    }
    if (invite?.status === 'failed') {
      return {
        ok: false,
        text: prefix + t(`تعذّر إرسال البريد: ${invite.error ?? ''}`, `the email could not be sent: ${invite.error ?? 'unknown error'}`),
      };
    }
    return { ok: true, text: '' };
  };

  const onAdd = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const created = await register.mutateAsync({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        sendInvite,
      });
      const base = t(
        `${email.trim()} يستطيع الآن تسجيل الدخول بحساب Microsoft الخاص بعمله.`,
        `${email.trim()} can now sign in with their Microsoft work account.`,
      );
      const outcome = describe(created.invite as InviteStatus | undefined, email.trim(), true);
      setNotice({ ok: outcome.ok, text: outcome.ok && created.invite?.status !== 'sent' ? base : `${outcome.text || base}` });
      setEmail('');
      setFirstName('');
      setLastName('');
      setRole('lawyer');
      await load();
    } catch (err) {
      fail(err, t('تعذّرت إضافة المستخدم.', 'Could not add the user.'));
    }
  };

  const changeRole = async (user: UserRow, nextRole: string) => {
    setBusy(`role:${user.id}`);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.patch<UserRow>(`/users/${user.id}`, { role: nextRole });
      setUsers((current) => current.map((u) => (u.id === user.id ? { ...u, role: updated.role } : u)));
    } catch (err) {
      fail(err, t('تعذّر تغيير الدور.', 'Could not change the role.'));
    } finally {
      setBusy(null);
    }
  };

  const setActive = async (user: UserRow, isActive: boolean) => {
    const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
    if (
      !isActive &&
      !window.confirm(
        t(
          `إزالة وصول ${name}؟ لن يتمكن من تسجيل الدخول، وتبقى بياناته محفوظة ويمكن استعادة وصوله لاحقًا.`,
          `Remove ${name}'s access? They will no longer be able to sign in. Their work stays in place and you can restore access later.`,
        ),
      )
    ) {
      return;
    }
    setBusy(`active:${user.id}`);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.patch<UserRow>(`/users/${user.id}`, { isActive });
      setUsers((current) => current.map((u) => (u.id === user.id ? { ...u, isActive: updated.isActive } : u)));
    } catch (err) {
      fail(err, t('تعذّر تحديث الوصول.', 'Could not update access.'));
    } finally {
      setBusy(null);
    }
  };

  const resend = async (user: UserRow) => {
    setBusy(`invite:${user.id}`);
    setError(null);
    setNotice(null);
    try {
      const data = await api.post<{ invite: InviteStatus }>(`/users/${user.id}/invite`);
      const outcome = describe(data.invite, user.email, false);
      setNotice(outcome.text ? outcome : null);
    } catch (err) {
      fail(err, t('تعذّر إرسال الدعوة.', 'Could not send the invitation.'));
    } finally {
      setBusy(null);
    }
  };

  const roleLabel = (value: string) => {
    const found = ROLES.find((r) => r.value === value);
    return found ? t(found.label[0], found.label[1]) : value;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <UserPlus className="size-4" />
            {t('إضافة مستخدم', 'Add user')}
          </CardTitle>
          <CardDescription>
            {t(
              'امنح زميلًا صلاحية الوصول إلى Qanoon365. يسجّل الدخول بحساب Microsoft الخاص بعمله دون كلمة مرور.',
              'Grant a colleague access to Qanoon365. They sign in with their Microsoft work account — no password is set here.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAdd} className="max-w-md space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nu-email">{t('البريد الإلكتروني للعمل', 'Work email')}</Label>
              <Input
                id="nu-email"
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@yourfirm.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nu-first">{t('الاسم الأول', 'First name')}</Label>
                <Input id="nu-first" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nu-last">{t('اسم العائلة', 'Last name')}</Label>
                <Input id="nu-last" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('الدور', 'Role')}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {t(r.label[0], r.label[1])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
                className="size-4"
              />
              {t('إرسال دعوة بالبريد الإلكتروني', 'Send an invitation email')}
            </label>
            <Button type="submit" disabled={register.isPending}>
              {register.isPending ? t('جارٍ الإضافة…', 'Adding…') : t('إضافة مستخدم', 'Add user')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {(error || notice || register.isError) && (
        <div className="space-y-2">
          {register.isError && !error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">
              {(register.error as Error)?.message || t('تعذّرت إضافة المستخدم.', 'Could not add the user.')}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">{error}</div>
          )}
          {notice && notice.text && (
            <div
              className={
                notice.ok
                  ? 'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700'
                  : 'rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700'
              }
            >
              {notice.text}
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('المستخدمون', 'People')}</CardTitle>
          <CardDescription>
            {t(
              'غيّر الدور، أو أعد إرسال الدعوة، أو أزل الوصول. تبقى سجلات المستخدم المُزال محفوظة.',
              'Change a role, resend an invitation, or remove access. A removed user’s records are kept.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 animate-pulse rounded-xl bg-muted" />
          ) : users.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t('لا يوجد مستخدمون.', 'No users yet.')}</p>
          ) : (
            <ul className="divide-y">
              {users.map((user) => {
                const isMe = me?.id === user.id;
                const name = `${user.firstName} ${user.lastName}`.trim();
                return (
                  <li key={user.id} className={`flex flex-wrap items-center gap-3 py-3 ${user.isActive ? '' : 'opacity-60'}`}>
                    <div className="min-w-0 flex-1 basis-56">
                      <div className="truncate text-sm font-medium">
                        {name || user.email}
                        {isMe ? <span className="text-muted-foreground"> {t('(أنت)', '(you)')}</span> : null}
                      </div>
                      <div dir="ltr" className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {user.lastLoginAt
                          ? t('آخر دخول: ', 'Last sign-in: ') + new Date(user.lastLoginAt).toLocaleDateString(locale)
                          : t('لم يسجّل الدخول بعد', 'Has not signed in yet')}
                      </div>
                    </div>

                    <select
                      value={user.role}
                      disabled={isMe || !user.isActive || busy === `role:${user.id}`}
                      onChange={(event) => void changeRole(user, event.target.value)}
                      title={isMe ? t('لا يمكنك تغيير دورك', 'You cannot change your own role') : undefined}
                      aria-label={t('الدور', 'Role')}
                      className="rounded-lg border bg-background px-2 py-1.5 text-sm disabled:opacity-60"
                    >
                      {ROLES.some((r) => r.value === user.role) ? null : <option value={user.role}>{roleLabel(user.role)}</option>}
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {t(r.label[0], r.label[1])}
                        </option>
                      ))}
                    </select>

                    <Badge variant={user.isActive ? 'secondary' : 'outline'}>
                      {user.isActive ? t('نشط', 'Active') : t('تمت إزالة الوصول', 'Access removed')}
                    </Badge>

                    <div className="flex items-center gap-1.5">
                      {user.isActive ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy === `invite:${user.id}`}
                          onClick={() => void resend(user)}
                        >
                          <Send className="size-3.5" />
                          {busy === `invite:${user.id}` ? '…' : t('إعادة الدعوة', 'Resend')}
                        </Button>
                      ) : null}
                      {user.isActive ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isMe || busy === `active:${user.id}`}
                          title={isMe ? t('لا يمكنك إزالة وصولك', 'You cannot remove your own access') : undefined}
                          onClick={() => void setActive(user, false)}
                          className="text-destructive"
                        >
                          <UserMinus className="size-3.5" />
                          {t('إزالة', 'Remove')}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy === `active:${user.id}`}
                          onClick={() => void setActive(user, true)}
                        >
                          <RotateCcw className="size-3.5" />
                          {t('استعادة', 'Restore')}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
