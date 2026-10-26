// Look & feel settings (admin editable). Pure validation helpers, no I/O.

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
  // Version (upload time, ms) per slot; presence means a custom logo exists.
  logos: Partial<Record<LogoSlot, number>>;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export const isLogoSlot = (value: unknown): value is LogoSlot =>
  typeof value === 'string' && (LOGO_SLOTS as readonly string[]).includes(value);

export function sanitizeBranding(input: unknown): Branding {
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const colorsIn = (source.colors && typeof source.colors === 'object' ? source.colors : {}) as Record<
    string,
    unknown
  >;

  const colors: Branding['colors'] = {};
  for (const key of COLOR_KEYS) {
    const value = colorsIn[key];
    if (typeof value === 'string' && HEX.test(value)) {
      colors[key] = value.toLowerCase();
    }
  }

  const logosIn = (source.logos && typeof source.logos === 'object' ? source.logos : {}) as Record<
    string,
    unknown
  >;
  const logos: Branding['logos'] = {};
  for (const slot of LOGO_SLOTS) {
    const value = logosIn[slot];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      logos[slot] = Math.floor(value);
    }
  }

  const font = FONT_KEYS.find((candidate) => candidate === source.font);
  const appName = typeof source.appName === 'string' ? source.appName.trim().slice(0, 60) : '';

  return {
    colors,
    ...(font && font !== 'inter' ? { font } : {}),
    ...(appName ? { appName } : {}),
    logos,
  };
}

// Identify an image from its bytes (never trust the client-supplied content type).
export function detectImageType(bytes: Buffer): string | undefined {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  const head = bytes.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) {
    return 'image/svg+xml';
  }
  return undefined;
}
