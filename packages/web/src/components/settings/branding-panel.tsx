'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { Palette, Undo2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import {
  DEFAULT_COLORS,
  FONT_KEYS,
  FONT_LABELS,
  LOGO_SLOTS,
  THEME_PRESETS,
  buildThemeCss,
  logoSrc,
  type Branding,
  type ColorKey,
  type FontKey,
  type LogoSlot,
} from '@/lib/branding';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const COLOR_GROUPS: Array<{
  title: [string, string];
  keys: Array<{ key: ColorKey; label: [string, string] }>;
}> = [
  {
    title: ['الأزرار والألوان الرئيسية', 'Buttons & main colour'],
    keys: [
      { key: 'primary', label: ['لون الأزرار والروابط', 'Buttons & links'] },
      { key: 'primaryText', label: ['نص الأزرار', 'Button text'] },
      { key: 'accent', label: ['لون التمييز', 'Accent colour'] },
      { key: 'accentText', label: ['نص لون التمييز', 'Accent text'] },
    ],
  },
  {
    title: ['القائمة الجانبية', 'Side navigation'],
    keys: [
      { key: 'navBg', label: ['خلفية القائمة', 'Background'] },
      { key: 'navText', label: ['نص القائمة', 'Text'] },
    ],
  },
  {
    title: ['الصفحة والبطاقات والنصوص', 'Page, cards & text'],
    keys: [
      { key: 'pageBg', label: ['خلفية الصفحة', 'Page background'] },
      { key: 'card', label: ['خلفية البطاقات', 'Card background'] },
      { key: 'text', label: ['لون النص الرئيسي', 'Main text'] },
    ],
  },
];

const LOGO_LABELS: Record<LogoSlot, [string, string]> = {
  sidebarIcon: ['أيقونة القائمة الجانبية', 'Side navigation icon'],
  sidebarWordmark: ['شعار القائمة الجانبية (النص)', 'Side navigation logo (wordmark)'],
  loginIcon: ['أيقونة صفحة الدخول', 'Login page icon'],
  loginWordmark: ['شعار صفحة الدخول (النص)', 'Login page logo (wordmark)'],
  favicon: ['أيقونة المتصفح', 'Browser tab icon'],
};

type Draft = Pick<Branding, 'colors' | 'font' | 'appName'>;

// Admin only: change the colours, font, name and logos for everyone who uses this Qanoon365.
export function BrandingPanel() {
  const locale = useLocale();
  const ar = locale === 'ar';
  const t = (arText: string, en: string) => (ar ? arText : en);

  const [draft, setDraft] = useState<Draft>({ colors: {} });
  const [logos, setLogos] = useState<Branding['logos']>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputs = useRef<Partial<Record<LogoSlot, HTMLInputElement | null>>>({});

  const fail = (err: unknown, fallback: string) =>
    setError(err instanceof Error && err.message ? err.message : fallback);

  const apply = (branding: Branding) => {
    setDraft({ colors: branding.colors, font: branding.font, appName: branding.appName });
    setLogos(branding.logos);
  };

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ branding: Branding }>('/branding')
      .then((data) => {
        if (!cancelled) apply(data.branding);
      })
      .catch((err) => {
        if (!cancelled) fail(err, 'Could not load the branding settings.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live preview: the draft theme is applied to this page straight away.
  useEffect(() => {
    if (loading) return;
    const id = 'branding-preview';
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = buildThemeCss({ ...draft, logos: {} });
  }, [draft, loading]);

  const setColor = (key: ColorKey, value: string | undefined) =>
    setDraft((current) => {
      const colors = { ...current.colors };
      if (value) colors[key] = value;
      else delete colors[key];
      return { ...current, colors };
    });

  const save = async () => {
    setBusy('save');
    setError(null);
    setNotice(null);
    try {
      await api.put('/branding', draft);
      setNotice(t('تم الحفظ. سيرى المستخدمون التغييرات عند تحديث الصفحة.', 'Saved. Other users will see the changes when they refresh.'));
    } catch (err) {
      fail(err, t('تعذّر الحفظ.', 'Could not save.'));
    } finally {
      setBusy(null);
    }
  };

  const resetAll = () => {
    if (
      window.confirm(
        t(
          'إعادة الألوان والخط والاسم إلى الافتراضي؟ (لن تُحذف الشعارات.) اضغط حفظ للتأكيد.',
          'Reset colours, font and name to the defaults? (Logos are kept.) Press Save to confirm.',
        ),
      )
    ) {
      setDraft({ colors: {} });
    }
  };

  const uploadLogo = async (slot: LogoSlot, file: File | undefined) => {
    if (!file) return;
    setBusy(`logo:${slot}`);
    setError(null);
    setNotice(null);
    try {
      const form = new FormData();
      form.set('slot', slot);
      form.set('file', file);
      const data = await api.upload<{ branding: Branding }>('/branding/logo', form);
      setLogos(data.branding.logos);
      setNotice(t('تم رفع الشعار.', 'Logo uploaded.'));
    } catch (err) {
      fail(err, t('تعذّر رفع الشعار.', 'Could not upload the logo.'));
    } finally {
      setBusy(null);
      const input = fileInputs.current[slot];
      if (input) input.value = '';
    }
  };

  const resetLogo = async (slot: LogoSlot) => {
    setBusy(`logo:${slot}`);
    setError(null);
    try {
      const data = await api.delete<{ branding: Branding }>(`/branding/logo/${slot}`);
      setLogos(data.branding.logos);
    } catch (err) {
      fail(err, t('تعذّرت الإعادة.', 'Could not reset the logo.'));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Palette className="size-4" />
            {t('المظهر', 'Appearance')}
          </CardTitle>
          <CardDescription>
            {t(
              'خصّص الألوان والخط. تظهر المعاينة فورًا؛ اضغط حفظ لتطبيقها على الجميع.',
              'Customise colours and font. The preview updates immediately; press Save to apply it for everyone.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold">{t('قوالب جاهزة', 'Quick themes')}</h3>
            <div className="flex flex-wrap gap-2">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDraft((current) => ({ ...current, colors: { ...preset.colors } }))}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:border-primary hover:text-primary"
                >
                  <span
                    className="inline-block size-3.5 rounded-full border"
                    style={{ background: preset.colors.primary ?? DEFAULT_COLORS.primary }}
                  />
                  {preset.label}
                </button>
              ))}
            </div>
          </section>

          {COLOR_GROUPS.map((group) => (
            <section key={group.title[1]}>
              <h3 className="mb-2 text-sm font-semibold">{t(group.title[0], group.title[1])}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.keys.map(({ key, label }) => {
                  const value = draft.colors[key];
                  return (
                    <div key={key} className="flex items-center gap-2 rounded-xl border bg-muted/40 p-2">
                      <input
                        type="color"
                        value={value ?? DEFAULT_COLORS[key]}
                        onChange={(event) => setColor(key, event.target.value)}
                        className="size-9 shrink-0 cursor-pointer rounded border bg-white p-0.5"
                        aria-label={t(label[0], label[1])}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">{t(label[0], label[1])}</div>
                        <div dir="ltr" className="text-[11px] text-muted-foreground">
                          {value ?? t('افتراضي', 'default')}
                        </div>
                      </div>
                      {value ? (
                        <button
                          type="button"
                          onClick={() => setColor(key, undefined)}
                          title={t('العودة للافتراضي', 'Back to default')}
                          className="rounded-full p-1.5 text-muted-foreground transition hover:bg-background hover:text-primary"
                        >
                          <Undo2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">{t('الخط', 'Font')}</span>
              <select
                value={draft.font ?? 'inter'}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    font: event.target.value === 'inter' ? undefined : (event.target.value as FontKey),
                  }))
                }
                className="rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {FONT_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {FONT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">{t('اسم التطبيق', 'App name')}</span>
              <input
                type="text"
                maxLength={60}
                value={draft.appName ?? ''}
                placeholder="Qanoon365"
                onChange={(event) => setDraft((current) => ({ ...current, appName: event.target.value || undefined }))}
                className="rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </label>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => void save()} disabled={busy === 'save'}>
              {busy === 'save' ? t('جارٍ الحفظ…', 'Saving…') : t('حفظ', 'Save')}
            </Button>
            <Button type="button" variant="outline" onClick={resetAll}>
              {t('استعادة الافتراضي', 'Reset to defaults')}
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {notice ? <p className="text-sm text-green-700">{notice}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('الشعارات', 'Logos')}</CardTitle>
          <CardDescription>
            {t(
              'PNG أو JPEG أو WebP أو SVG، حتى 1 ميجابايت. تُطبَّق الشعارات فور رفعها.',
              'PNG, JPEG, WebP or SVG, up to 1 MB. Logos apply as soon as they are uploaded.',
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {LOGO_SLOTS.map((slot) => {
            const version = logos[slot];
            return (
              <div key={slot} className="flex items-center gap-3 rounded-xl border bg-muted/40 p-2">
                <div className="flex h-12 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white">
                  {version ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoSrc(API_BASE, slot, version)} alt="" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="px-1 text-center text-[10px] text-muted-foreground">{t('الافتراضي', 'Built-in')}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs font-medium">{t(LOGO_LABELS[slot][0], LOGO_LABELS[slot][1])}</div>
                <input
                  ref={(element) => {
                    fileInputs.current[slot] = element;
                  }}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(event) => void uploadLogo(slot, event.target.files?.[0])}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy === `logo:${slot}`}
                  onClick={() => fileInputs.current[slot]?.click()}
                >
                  <Upload className="size-3.5" />
                  {t('رفع', 'Upload')}
                </Button>
                {version ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy === `logo:${slot}`}
                    onClick={() => void resetLogo(slot)}
                  >
                    <Undo2 className="size-3.5" />
                    {t('افتراضي', 'Reset')}
                  </Button>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
