'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AccountInfo } from '@azure/msal-browser';

import {
  connectDaleelAccount,
  disconnectDaleelAccount,
  getDaleelAccount,
  getDaleelDisplayName,
  initializeDaleelMsal,
  isDaleelAuthConfigured,
  resolveDaleelAuthConfig,
} from '@/lib/daleel-auth';

export function useDaleelConnection() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isConfigured, setIsConfigured] = useState(isDaleelAuthConfigured());
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const config = await resolveDaleelAuthConfig();
    const configured = Boolean(config.tenantId && config.clientId && config.apiScope);
    setIsConfigured(configured);

    if (!configured) {
      setAccount(null);
      setIsReady(true);
      return;
    }

    try {
      await initializeDaleelMsal();
      const resolvedAccount = await getDaleelAccount();
      setAccount(resolvedAccount);
    } catch (err) {
      console.error('Failed to initialize Daleel connection', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize Daleel connection.');
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await connectDaleelAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start Microsoft sign-in.');
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await disconnectDaleelAccount();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to disconnect Microsoft account.');
      setIsConnecting(false);
    }
  }, []);

  return {
    account,
    isConfigured,
    isConnected: Boolean(account),
    isReady,
    isConnecting,
    error,
    connect,
    disconnect,
    refresh,
    displayName: getDaleelDisplayName(account),
  };
}
