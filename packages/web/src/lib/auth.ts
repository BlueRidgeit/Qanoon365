'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const TOKEN_EXPIRY_SKEW_MS = 60_000;

interface User {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setTokens: (access: string, refresh: string) => void;
  clearTokens: () => void;
  isAuthenticated: () => boolean;
}

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  firstName?: string;
  lastName?: string;
  exp?: number;
}

function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const [, rawPayload] = token.split('.');
    if (!rawPayload) return null;
    const normalized = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

function decodeJwt(token: string): User | null {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
    firstName: payload.firstName,
    lastName: payload.lastName,
  };
}

export function isJwtValid(token: string | null, skewMs = TOKEN_EXPIRY_SKEW_MS): boolean {
  if (!token) return false;
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 > Date.now() + skewMs;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (accessToken, refreshToken) => {
        const user = decodeJwt(accessToken);
        set({ accessToken, refreshToken, user });
      },
      clearTokens: () => set({ accessToken: null, refreshToken: null, user: null }),
      isAuthenticated: () => {
        const { accessToken, refreshToken } = get();
        return isJwtValid(accessToken) || isJwtValid(refreshToken, 0);
      },
    }),
    { name: 'albasti-auth' },
  ),
);
