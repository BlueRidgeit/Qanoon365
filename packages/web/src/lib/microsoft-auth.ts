'use client';

import {
  BrowserCacheLocation,
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
  type Configuration,
} from '@azure/msal-browser';

type QanoonAuthConfig = {
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
  }
}

const redirectDefaultPath = '/login';

const getConfig = (): QanoonAuthConfig => {
  const runtime = typeof window !== 'undefined' ? window.__QANOON_PUBLIC_ENV__ : undefined;

  return {
    tenantId: runtime?.nextPublicAzureTenantId ?? process.env.NEXT_PUBLIC_AZURE_TENANT_ID,
    clientId: runtime?.nextPublicAzureClientId ?? process.env.NEXT_PUBLIC_AZURE_CLIENT_ID,
    apiScope: runtime?.nextPublicAzureApiScope ?? process.env.NEXT_PUBLIC_AZURE_API_SCOPE,
    redirectPath:
      runtime?.nextPublicAzureRedirectPath ??
      process.env.NEXT_PUBLIC_AZURE_REDIRECT_PATH ??
      redirectDefaultPath,
  };
};

const isConfigUsable = (config: QanoonAuthConfig) =>
  Boolean(config.tenantId && config.clientId && config.apiScope);

const normalizedRedirectUri = (redirectPath: string) => {
  if (typeof window === 'undefined') {
    return redirectPath;
  }

  return `${window.location.origin}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`;
};

let msalInstancePromise: Promise<PublicClientApplication | null> | null = null;

const getMsalConfig = (): Configuration | null => {
  const config = getConfig();
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

export const isMicrosoftAuthConfigured = () => isConfigUsable(getConfig());

export const initializeMicrosoftMsal = async () => {
  if (msalInstancePromise) {
    return msalInstancePromise;
  }

  const msalConfig = getMsalConfig();
  if (!msalConfig) {
    return null;
  }

  msalInstancePromise = (async () => {
    const instance = new PublicClientApplication(msalConfig);
    await instance.initialize();

    const result = await instance.handleRedirectPromise().catch((error) => {
      console.error('Failed to handle Qanoon Microsoft redirect', error);
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

export const getMicrosoftAccount = async (): Promise<AccountInfo | null> => {
  const instance = await initializeMicrosoftMsal();
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
  const config = getConfig();
  if (!config.apiScope) {
    return null;
  }

  return {
    account,
    scopes: [config.apiScope],
  };
};

export const getMicrosoftApiAccessToken = async () => {
  const instance = await initializeMicrosoftMsal();
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

    console.error('Failed to acquire Qanoon Microsoft token silently', error);
    return undefined;
  }
};

export const loginWithMicrosoftRedirect = async (redirectStartPage?: string) => {
  const instance = await initializeMicrosoftMsal();
  const config = getConfig();

  if (!instance || !config.apiScope) {
    throw new Error('Qanoon Microsoft auth is not configured.');
  }

  await instance.loginRedirect({
    scopes: [config.apiScope],
    redirectUri: normalizedRedirectUri(config.redirectPath),
    redirectStartPage:
      redirectStartPage ?? (typeof window !== 'undefined' ? window.location.href : undefined),
    prompt: 'select_account',
  });
};

export const logoutFromMicrosoftRedirect = async () => {
  const instance = await initializeMicrosoftMsal();
  const account = instance ? getPrimaryAccount(instance) : null;
  const config = getConfig();

  if (!instance || !account) {
    return false;
  }

  await instance.logoutRedirect({
    account,
    postLogoutRedirectUri: normalizedRedirectUri(config.redirectPath),
  });

  return true;
};
