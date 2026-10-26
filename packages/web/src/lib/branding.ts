// Admin-editable look & feel (Settings > Branding). Pure helpers shared by the server layout
// (SSR theme injection) and the settings screen (live preview). No I/O here.

export const COLOR_KEYS = [
  'primary',
  'primaryText',
  'accent',
  'accentText',
  'navBg',
  'navText',
  'pageBg',
  'text',
  'card',
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const FONT_KEYS = ['inter', 'montserrat', 'tajawal', 'system'] as const;
export type FontKey = (typeof FONT_KEYS)[number];

export const LOGO_SLOTS = ['sidebarIcon', 'sidebarWordmark', 'loginIcon', 'loginWordmark', 'favicon'] as const;
export type LogoSlot = (typeof LOGO_SLOTS)[number];

export interface Branding {
  colors: Partial<Record<ColorKey, string>>;
  font?: FontKey;
  appName?: string;
  logos: Partial<Record<LogoSlot, number>>;
}

// The stock theme as hex, used only to seed colour pickers. An unsaved colour is never injected.
export const DEFAULT_COLORS: Record<ColorKey, string> = {
  primary: '#1c75bc',
  primaryText: '#ffffff',
  accent: '#f7941e',
  accentText: '#ffffff',
  navBg: '#1c75bc',
  navText: '#ffffff',
  pageBg: '#ffffff',
  text: '#1f252c',
  card: '#dad9d9',
};

export const FONT_STACKS: Record<FontKey, string> = {
  inter: 'var(--font-inter)',
  montserrat: 'var(--font-montserrat), var(--font-inter)',
  tajawal: 'var(--font-tajawal), var(--font-inter)',
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

export const FONT_LABELS: Record<FontKey, string> = {
  inter: 'Inter (default)',
  montserrat: 'Montserrat',
  tajawal: 'Tajawal',
  system: 'System font',
};

export const THEME_PRESETS: Array<{ id: string; label: string; colors: Partial<Record<ColorKey, string>> }> = [
  { id: 'default', label: 'Default (blue & orange)', colors: {} },
  {
    id: 'teal',
    label: 'Teal & gold',
    colors: { primary: '#0f766e', accent: '#d9a441', navBg: '#115e59' },
  },
  {
    id: 'charcoal',
    label: 'Charcoal & orange',
    colors: { primary: '#1f2937', accent: '#f97316', navBg: '#111827' },
  },
  {
    id: 'burgundy',
    label: 'Burgundy & gold',
    colors: { primary: '#7f1d3a', accent: '#c9a227', navBg: '#5f1530' },
  },
  {
    id: 'navy',
    label: 'Deep navy',
    colors: { primary: '#26358b', accent: '#dab74c', navBg: '#1b2766' },
  },
];

const channel = (value: number) => {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export function readableOn(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.45 ? '#111827' : '#ffffff';
}

// CSS for the saved theme; '' when nothing is customised so the stock look is untouched.
export function buildThemeCss(branding: Branding): string {
  const c = branding.colors;
  const vars: string[] = [];
  const set = (name: string, value: string) => vars.push(`${name}:${value}`);

  if (c.primary) {
    const fg = c.primaryText ?? readableOn(c.primary);
    set('--primary', c.primary);
    set('--primary-foreground', fg);
    set('--accent-foreground', c.primary);
    set('--chart-1', c.primary);
    set('--glow-1', `color-mix(in srgb, ${c.primary} 14%, transparent)`);
    set('--login-mid', `color-mix(in srgb, ${c.primary} 92%, white)`);
    set('--login-end', c.pageBg ?? '#f3f6f9');
  } else if (c.primaryText) {
    set('--primary-foreground', c.primaryText);
  }

  if (c.accent) {
    const fg = c.accentText ?? readableOn(c.accent);
    for (const name of ['--gold', '--warning', '--pink', '--ring', '--sidebar-primary', '--sidebar-ring', '--chart-2']) {
      set(name, c.accent);
    }
    for (const name of ['--gold-foreground', '--warning-foreground', '--pink-foreground', '--sidebar-primary-foreground']) {
      set(name, fg);
    }
    set('--glow-2', `color-mix(in srgb, ${c.accent} 12%, transparent)`);
  } else if (c.accentText) {
    set('--gold-foreground', c.accentText);
    set('--sidebar-primary-foreground', c.accentText);
  }

  if (c.navBg) {
    const fg = c.navText ?? readableOn(c.navBg);
    set('--sidebar', c.navBg);
    set('--sidebar-foreground', fg);
    set('--sidebar-accent', `color-mix(in srgb, ${c.navBg} 82%, ${readableOn(c.navBg) === '#ffffff' ? 'white' : 'black'})`);
    set('--sidebar-accent-foreground', fg);
    set('--sidebar-border', `color-mix(in srgb, ${fg} 18%, transparent)`);
    set('--nav-muted', `color-mix(in srgb, ${fg} 85%, transparent)`);
  } else if (c.navText) {
    set('--sidebar-foreground', c.navText);
    set('--sidebar-accent-foreground', c.navText);
    set('--nav-muted', `color-mix(in srgb, ${c.navText} 85%, transparent)`);
  }

  if (c.pageBg) set('--background', c.pageBg);
  if (c.card) set('--card', c.card);
  if (c.text) {
    set('--foreground', c.text);
    set('--card-foreground', c.text);
    set('--popover-foreground', c.text);
  }

  if (branding.font) set('--app-font', FONT_STACKS[branding.font]);

  // html:root also outranks the .dark variable block, so the theme applies in both modes.
  return vars.length > 0 ? `html:root,html.dark{${vars.join(';')}}` : '';
}

export const logoSrc = (apiBase: string, slot: LogoSlot, version: number) =>
  `${apiBase}/branding/asset/${slot}?v=${version}`;
