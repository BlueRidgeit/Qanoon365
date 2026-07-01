'use client';

import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Settings,
  User,
  Palette,
  Info,
  Sun,
  Moon,
  Monitor,
  Mail,
  Shield,
  Building2,
  Check,
  UserPlus,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRegister } from '@/hooks/use-api';

// ---------------------------------------------------------------------------
// Profile tab
// ---------------------------------------------------------------------------

function ProfileTab() {
  const t = useTranslations('settingsPage');
  const tc = useTranslations('common');
  const user = useAuthStore((s) => s.user);

  const fields = [
    {
      label: tc('email'),
      value: user?.email ?? 'Not available',
      icon: Mail,
    },
    {
      label: t('role'),
      value: user?.role ?? 'Not available',
      icon: Shield,
    },
    {
      label: 'Tenant',
      value: user?.tenantId ?? 'Not available',
      icon: Building2,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{t('profileInfo')}</CardTitle>
        <CardDescription>
          {t('profileDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {fields.map((field, i) => {
          const Icon = field.icon;
          return (
            <div key={field.label}>
              {i > 0 && <Separator className="my-4" />}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {field.label}
                    </p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {field.value}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {t('readOnly')}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Appearance tab
// ---------------------------------------------------------------------------

const THEME_OPTIONS = [
  {
    value: 'light' as const,
    label: 'Light',
    icon: Sun,
    description: 'Clean and bright interface',
    preview: {
      bg: 'bg-white',
      card: 'bg-gray-50',
      text: 'bg-gray-800',
      textLight: 'bg-gray-400',
      accent: 'bg-blue-500',
      border: 'border-gray-200',
    },
  },
  {
    value: 'dark' as const,
    label: 'Dark',
    icon: Moon,
    description: 'Easy on the eyes in low light',
    preview: {
      bg: 'bg-gray-900',
      card: 'bg-gray-800',
      text: 'bg-gray-200',
      textLight: 'bg-gray-500',
      accent: 'bg-blue-400',
      border: 'border-gray-700',
    },
  },
  {
    value: 'system' as const,
    label: 'System',
    icon: Monitor,
    description: 'Follows your OS preference',
    preview: {
      bg: 'bg-gradient-to-br from-white to-gray-900',
      card: 'bg-gradient-to-br from-gray-50 to-gray-800',
      text: 'bg-gray-600',
      textLight: 'bg-gray-400',
      accent: 'bg-blue-500',
      border: 'border-gray-400',
    },
  },
] as const;

function AppearanceTab() {
  const t = useTranslations('settingsPage');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('theme')}</CardTitle>
          <CardDescription>{t('chooseAppearance')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-[180px] animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{t('theme')}</CardTitle>
        <CardDescription>
          {t('chooseAppearanceDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'group relative flex flex-col overflow-hidden rounded-xl border-2 transition-all duration-200',
                  isActive
                    ? 'border-primary shadow-sm shadow-primary/10'
                    : 'border-border hover:border-primary/30',
                )}
              >
                {/* Mini preview */}
                <div
                  className={cn(
                    'relative h-[100px] w-full p-3',
                    opt.preview.bg,
                    opt.preview.border,
                    'border-b',
                  )}
                >
                  {/* Simulated window chrome */}
                  <div className="flex gap-1 mb-2.5">
                    <div className="size-1.5 rounded-full bg-red-400/70" />
                    <div className="size-1.5 rounded-full bg-yellow-400/70" />
                    <div className="size-1.5 rounded-full bg-green-400/70" />
                  </div>
                  {/* Simulated sidebar + content */}
                  <div className="flex gap-2 h-[calc(100%-16px)]">
                    <div
                      className={cn(
                        'w-[30%] rounded-md',
                        opt.preview.card,
                      )}
                    />
                    <div className="flex-1 space-y-1.5">
                      <div
                        className={cn(
                          'h-2 w-3/4 rounded-full',
                          opt.preview.text,
                        )}
                      />
                      <div
                        className={cn(
                          'h-1.5 w-1/2 rounded-full',
                          opt.preview.textLight,
                        )}
                      />
                      <div className="flex gap-1.5 pt-1">
                        <div
                          className={cn(
                            'h-6 w-6 rounded',
                            opt.preview.card,
                          )}
                        />
                        <div
                          className={cn(
                            'h-6 w-6 rounded',
                            opt.preview.card,
                          )}
                        />
                        <div
                          className={cn(
                            'h-6 flex-1 rounded',
                            opt.preview.accent,
                            'opacity-60',
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Label area */}
                <div className="flex items-center gap-3 p-3">
                  <div
                    className={cn(
                      'flex size-8 items-center justify-center rounded-lg transition-colors',
                      isActive ? 'bg-primary/10' : 'bg-muted',
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-4 transition-colors',
                        isActive
                          ? 'text-primary'
                          : 'text-muted-foreground',
                      )}
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{t(opt.value)}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`${opt.value}Desc`)}
                    </p>
                  </div>
                  {isActive && (
                    <div className="ml-auto flex size-5 items-center justify-center rounded-full bg-primary">
                      <Check className="size-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// About tab
// ---------------------------------------------------------------------------

const TECH_STACK = [
  'TypeScript',
  'NestJS',
  'Next.js',
  'PostgreSQL',
  'Azure AI',
];

function AboutTab() {
  const t = useTranslations('settingsPage');
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2">
          <h2 className="text-gradient text-3xl font-bold tracking-tight">
            {t('aboutTitle')}
          </h2>
        </div>
        <CardDescription className="text-sm font-medium uppercase tracking-widest text-muted-foreground/80">
          {t('aboutTagline')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="mx-auto max-w-sm space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('version')}</span>
            <Badge variant="outline">1.0.0-beta</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('description')}</span>
            <span className="text-right text-foreground font-medium">
              {t('aboutDescription')}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t('build')}</span>
            <Badge variant="secondary">Phase 1.5</Badge>
          </div>
          <Separator />
          <div className="space-y-2">
            <span className="text-sm text-muted-foreground">{t('techStack')}</span>
            <div className="flex flex-wrap gap-1.5">
              {TECH_STACK.map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        <p className="text-center text-xs text-muted-foreground/60">
          {t('aboutFooter')}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Team tab (admin only)
// ---------------------------------------------------------------------------

const TEAM_ROLES = [
  { value: 'partner', label: 'Partner' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'lawyer', label: 'Lawyer' },
  { value: 'bd', label: 'Business Development' },
  { value: 'admin', label: 'Admin' },
];

function TeamTab() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('lawyer');
  const [success, setSuccess] = useState<string | null>(null);
  const register = useRegister();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSuccess(null);
    try {
      await register.mutateAsync({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
      });
      setSuccess(`${email.trim()} can now sign in with their Microsoft work account.`);
      setEmail('');
      setFirstName('');
      setLastName('');
      setRole('lawyer');
    } catch {
      // error is surfaced via register.error below
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Add user</CardTitle>
        <CardDescription>
          Grant a colleague access to Qanoon365. They sign in with their Microsoft
          work account — no password is set here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="max-w-md space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nu-email">Work email</Label>
            <Input
              id="nu-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@yourfirm.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nu-first">First name</Label>
              <Input
                id="nu-first"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-last">Last name</Label>
              <Input
                id="nu-last"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {register.isError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600">
              {(register.error as Error)?.message || 'Could not add the user.'}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <Button type="submit" disabled={register.isPending}>
            {register.isPending ? 'Adding…' : 'Add user'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const t = useTranslations('settingsPage');
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <Settings className="size-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-white">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="size-3.5" />
            {t('profileTab')}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5">
            <Palette className="size-3.5" />
            {t('appearanceTab')}
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-1.5">
            <Info className="size-3.5" />
            {t('aboutTab')}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="team" className="gap-1.5">
              <UserPlus className="size-3.5" />
              Team
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceTab />
        </TabsContent>

        <TabsContent value="about">
          <AboutTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="team">
            <TeamTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
