import type { Branding } from './branding';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const EMPTY_BRANDING: Branding = { colors: {}, logos: {} };

export const getApiBase = () => API_BASE;

// Server only. Never throws: if the API is slow or unavailable the stock theme is used.
export async function getBranding(): Promise<Branding> {
  try {
    const res = await fetch(`${API_BASE}/branding`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return EMPTY_BRANDING;
    const data = (await res.json()) as { branding?: Branding };
    return data.branding ?? EMPTY_BRANDING;
  } catch {
    return EMPTY_BRANDING;
  }
}
