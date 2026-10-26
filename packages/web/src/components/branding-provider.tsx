'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { LogoSlot } from '@/lib/branding';

export interface PublicBranding {
  appName?: string;
  // Absolute URLs of uploaded logos; a slot is missing when the built-in logo should be used.
  logos: Partial<Record<LogoSlot, string>>;
}

const BrandingContext = createContext<PublicBranding>({ logos: {} });

// Filled on the server by the root layout so the right logo is in the first HTML.
export function BrandingProvider({ value, children }: { value: PublicBranding; children: ReactNode }) {
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export const useBranding = () => useContext(BrandingContext);
