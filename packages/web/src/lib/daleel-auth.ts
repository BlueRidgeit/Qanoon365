'use client';

import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
  type Configuration,
  BrowserCacheLocation,
} from '@azure/msal-browser';

type DaleelAuthConfig = {
  tenantId?: string;
  clientId?: string;
  apiScope?: string;
  redirectPath: string;
};

declare global {
  interface Window {
    __QANOON_PUBLIC_ENV__?: {
      nextPublicAzureTenantId?: string;
      nextPublicAzureClientId?: string;
      nextPublicAzureApiScope?: string;
      nextPublicAzureRedirectPath?: string;
    };
    __QANOON_DALEEL_PUBLIC_ENV__?: {
      nextPublicDaleelAzureTenantId?: string;
      nextPublicDaleelAzureClientId?: string;
      nextPublicDaleelAzureApiScope?: string;
      nextPublicDaleelAzureRedirectPath?: string;
    };
  }
}

const redirectDefaultPath = '/daleel';
let runtimeConfigCache: DaleelAuthConfig | null = null;

const getConfig = (): DaleelAuthConfig => {
  const runtime =
    typeof window !== 'undefined' ? window.__QANOON_DALEEL_PUBLIC_ENV__ : undefined;
  const qanoonRuntime = typeof window !== 'undefined' ? window.__QANOON_PUBLIC_ENV__ : undefined;

  return {
    tenantId:
      runtime?.nextPublicDaleelAzureTenantId ??
      qanoonRuntime?.nextPublicAzureTenantId ??
      process.env.NEXT_PUBLIC_DALEEL_AZURE_TENANT_ID ??
      process.env.NEXT_PUBLIC_AZURE_TENANT_ID,
    clientId:
      runtime?.nextPublicDaleelAzureClientId ??
      qanoonRuntime?.nextPublicAzureClientId ??
      process.env.NEXT_PUBLIC_DALEEL_AZURE_CLIENT_ID ??
      process.env.NEXT_PUBLIC_AZURE_CLIENT_ID,
    apiScope:
      runtime?.nextPublicDaleelAzureApiScope ?? process.env.NEXT_PUBLIC_DALEEL_AZURE_API_SCOPE,
    redirectPath:
      runtime?.nextPublicDaleelAzureRedirectPath ??
      process.env.NEXT_PUBLIC_DALEEL_AZURE_REDIRECT_PATH ??
      redirectDefaultPath,
  };
};

const isConfigUsable = (config: DaleelAuthConfig) =>
  Boolean(config.tenantId && config.clientId && config.apiScope);

const getCachedConfig = () => runtimeConfigCache ?? getConfig();

export const resolveDaleelAuthConfig = async () => {
  const currentConfig = getCachedConfig();
  if (isConfigUsable(currentConfig)) {
    runtimeConfigCache = currentConfig;
    return currentConfig;
  }

  if (typeof window === 'undefined') {
    return currentConfig;
  }

  const response = await fetch('/api/daleel/public-config', {
    cache: 'no-store',
  }).catch(() => undefined);

  if (!response?.ok) {
    return currentConfig;
  }

  const data = (await response.json().catch(() => undefined)) as
    | Partial<DaleelAuthConfig>
    | undefined;

  runtimeConfigCache = {
    tenantId: data?.tenantId ?? currentConfig.tenantId,
    clientId: data?.clientId ?? currentConfig.clientId,
    apiScope: data?.apiScope ?? currentConfig.apiScope,
    redirectPath: data?.redirectPath ?? currentConfig.redirectPath,
  };

  return runtimeConfigCache;
};

const normalizedRedirectUri = (redirectPath: string) => {
  if (typeof window === 'undefined') {
    return redirectPath;
  }

  return `${window.location.origin}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`;
};

export const isDaleelAuthConfigured = () => {
  return isConfigUsable(getCachedConfig());
};

let msalInstancePromise: Promise<PublicClientApplication | null> | null = null;

const getMsalConfig = async (): Promise<Configuration | null> => {
  const config = await resolveDaleelAuthConfig();
  if (!config.tenantId || !config.clientId) {
    return null;
  }

  return {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      redirectUri: normalizedRedirectUri(config.redirectPath),
      postLogoutRedirectUri: normalizedRedirectUri(config.redirectPath),
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
    },
  };
};

const getPrimaryAccount = (instance: PublicClientApplication) =>
  instance.getActiveAccount() ?? instance.getAllAccounts()[0] ?? null;

export const initializeDaleelMsal = async () => {
  if (msalInstancePromise) {
    return msalInstancePromise;
  }

  const msalConfig = await getMsalConfig();
  if (!msalConfig) {
    return null;
  }

  msalInstancePromise = (async () => {
    const instance = new PublicClientApplication(msalConfig);
    await instance.initialize();

    const result = await instance.handleRedirectPromise().catch((error) => {
      console.error('Failed to handle Daleel redirect authentication', error);
      return undefined;
    });

    const account = result?.account ?? getPrimaryAccount(instance);
    if (account) {
      instance.setActiveAccount(account);
    }

    return instance;
  })();

  return msalInstancePromise;
};

export const getDaleelAccount = async (): Promise<AccountInfo | null> => {
  const instance = await initializeDaleelMsal();
  if (!instance) {
    return null;
  }

  const account = getPrimaryAccount(instance);
  if (account) {
    instance.setActiveAccount(account);
  }

  return account;
};

const getTokenRequest = (account: AccountInfo) => {
  const config = getCachedConfig();
  if (!config.apiScope) {
    return null;
  }

  return {
    account,
    scopes: [config.apiScope],
  };
};

export const getDaleelApiAccessToken = async () => {
  const instance = await initializeDaleelMsal();
  if (!instance) {
    return undefined;
  }

  const account = getPrimaryAccount(instance);
  if (!account) {
    return undefined;
  }

  const tokenRequest = getTokenRequest(account);
  if (!tokenRequest) {
    return undefined;
  }

  try {
    const result = await instance.acquireTokenSilent(tokenRequest);
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      return undefined;
    }

    console.error('Failed to acquire Daleel API access token silently', error);
    return undefined;
  }
};

export const connectDaleelAccount = async (redirectStartPage?: string) => {
  const instance = await initializeDaleelMsal();
  const config = await resolveDaleelAuthConfig();

  if (!instance || !config.apiScope) {
    throw new Error('Daleel Microsoft auth is not configured.');
  }

  await instance.loginRedirect({
    scopes: [config.apiScope],
    redirectUri: normalizedRedirectUri(config.redirectPath),
    redirectStartPage:
      redirectStartPage ?? (typeof window !== 'undefined' ? window.location.href : undefined),
    prompt: 'select_account',
  });
};

export const disconnectDaleelAccount = async () => {
  const instance = await initializeDaleelMsal();
  const account = instance ? getPrimaryAccount(instance) : null;
  const config = getCachedConfig();

  if (!instance) {
    return;
  }

  if (!account) {
    return;
  }

  await instance.logoutRedirect({
    account,
    postLogoutRedirectUri: normalizedRedirectUri(config.redirectPath),
  });
};

export const getDaleelDisplayName = (account: AccountInfo | null) =>
  account?.name || account?.username || 'Microsoft account';
