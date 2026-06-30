import { isJwtValid, useAuthStore } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const AUTH_STORAGE_KEY = 'albasti-auth';

let refreshPromise: Promise<string | null> | null = null;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface StoredAuthState {
  state?: {
    accessToken?: string | null;
    refreshToken?: string | null;
  };
}

function getStoredAuth(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') {
    return { accessToken: null, refreshToken: null };
  }
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return { accessToken: null, refreshToken: null };
    const parsed = JSON.parse(stored) as StoredAuthState;
    return {
      accessToken: parsed?.state?.accessToken ?? null,
      refreshToken: parsed?.state?.refreshToken ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
}

function clearAuth() {
  if (typeof window === 'undefined') return;
  useAuthStore.getState().clearTokens();
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  window.location.assign('/login');
}

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (refreshPromise) {
    return refreshPromise;
  }

  const { refreshToken } = getStoredAuth();
  if (!isJwtValid(refreshToken, 0)) {
    clearAuth();
    return null;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        clearAuth();
        return null;
      }

      const data = await res.json() as { accessToken: string; refreshToken: string };
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function getAccessToken(preferredToken?: string): Promise<string | null> {
  if (preferredToken) return preferredToken;
  const { accessToken, refreshToken } = getStoredAuth();

  if (isJwtValid(accessToken)) {
    return accessToken;
  }

  if (isJwtValid(refreshToken, 0)) {
    return refreshAccessToken();
  }

  return null;
}

async function parseResponseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json().catch(() => ({}));
  }
  return res.text().catch(() => '');
}

async function requestWithAuth(
  path: string,
  options: RequestInit & { token?: string } = {},
  retryOnUnauthorized = true,
): Promise<Response> {
  const { token, headers, ...rest } = options;
  const authToken = await getAccessToken(token);

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(!rest.body || rest.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(headers as Record<string, string>),
    },
    ...rest,
  });

  if (res.status === 401 && retryOnUnauthorized && !path.includes('/auth/')) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return requestWithAuth(path, { ...options, token: refreshedToken }, false);
    }
  }

  return res;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const res = await requestWithAuth(path, options);

  if (res.status === 401) {
    if (typeof window !== 'undefined' && !path.includes('/auth/')) {
      clearAuth();
      redirectToLogin();
    }
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    const body = (await parseResponseBody(res)) as { message?: string };
    throw new ApiError(res.status, body.message || res.statusText, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const res = await requestWithAuth(path, {
    method: 'POST',
    body: formData,
  });

  if (res.status === 401) {
    clearAuth();
    redirectToLogin();
    throw new ApiError(401, 'Unauthorized');
  }

  if (!res.ok) {
    const body = (await parseResponseBody(res)) as { message?: string };
    throw new ApiError(res.status, body.message || res.statusText, body);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => apiUpload<T>(path, formData),
};
