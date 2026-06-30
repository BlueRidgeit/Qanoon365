'use client';

import { useState, useCallback, useRef } from 'react';

import { getDaleelApiAccessToken } from '@/lib/daleel-auth';

type DaleelMessageInput = {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type StoredThreadMessage = {
  id: string;
  role: string;
  text: string;
};

export interface DaleelMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface DaleelConversation {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  locale: 'en' | 'ar';
  messages: DaleelMessage[];
}

export interface DaleelHistoryItem {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
}

export interface DaleelHistoryGroup {
  label: string;
  items: DaleelHistoryItem[];
}

const apiUrl = '/api/daleel';

const toRequestMessages = (messages: DaleelMessage[]): DaleelMessageInput[] =>
  messages.map(({ id, role, content }) => ({
    id,
    role,
    content,
  }));

const fromStoredMessages = (messages: StoredThreadMessage[]): DaleelMessage[] =>
  messages
    .filter((message) => message.text?.trim())
    .map((message, index) => ({
      id: message.id || `restored-${index + 1}`,
      role:
        message.role === 'assistant' || message.role === 'system'
          ? message.role
          : 'user',
      content: message.text,
      createdAt: new Date().toISOString(),
    }));

const getAuthHeaders = async () => {
  const accessToken = await getDaleelApiAccessToken();
  if (!accessToken) {
    throw new Error('Connect your Microsoft account to continue with Daleel.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
};

export function useDaleel() {
  const [historyGroups, setHistoryGroups] = useState<DaleelHistoryGroup[]>([]);
  const [activeConversation, setActiveConversation] = useState<DaleelConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(async (locale: 'en' | 'ar') => {
    setIsLoadingHistory(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/history?locale=${locale}`, {
        headers,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Failed to load Daleel history (${response.status})`);
      }

      const data = await response.json() as {
        groups?: DaleelHistoryGroup[];
      };

      setHistoryGroups((data.groups ?? []).filter((group) => group.items?.length));
    } catch (err) {
      console.error('Failed to fetch Daleel history:', err);
      setHistoryGroups([]);
      setError(err instanceof Error ? err.message : 'Unable to load Daleel history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/history/${encodeURIComponent(id)}`, {
        headers,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Failed to load conversation (${response.status})`);
      }

      const data = await response.json() as {
        thread?: {
          id: string;
          title: string;
          preview: string;
          updatedAt: string;
          locale: 'en' | 'ar';
          messages: StoredThreadMessage[];
        };
      };

      if (!data.thread) {
        throw new Error('Conversation payload missing.');
      }

      setActiveConversation({
        ...data.thread,
        messages: fromStoredMessages(data.thread.messages),
      });
    } catch (err) {
      console.error('Failed to load Daleel conversation:', err);
      setError(err instanceof Error ? err.message : 'Unable to load conversation.');
    }
  }, []);

  const sendMessage = useCallback(async (message: string, locale: 'en' | 'ar') => {
    const trimmed = message.trim();
    if (!trimmed || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const tempUserMsg: DaleelMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const optimisticMessages = [...(activeConversation?.messages ?? []), tempUserMsg];

    setActiveConversation((prev) => ({
      id: prev?.id ?? 'pending',
      title: prev?.title || trimmed.slice(0, 72),
      preview: prev?.preview || trimmed,
      updatedAt: new Date().toISOString(),
      locale,
      messages: optimisticMessages,
    }));

    try {
      const headers = await getAuthHeaders();
      abortRef.current = new AbortController();

      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: activeConversation?.id && activeConversation.id !== 'pending'
            ? activeConversation.id
            : undefined,
          locale,
          messages: toRequestMessages(optimisticMessages),
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Daleel request failed (${response.status})`);
      }

      const data = await response.json() as {
        threadId: string;
        title?: string;
        message?: {
          id?: string;
          content?: string;
          createdAt?: string;
        };
      };

      const assistantMessage: DaleelMessage = {
        id: data.message?.id || `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message?.content || 'No response generated.',
        createdAt: data.message?.createdAt || new Date().toISOString(),
      };

      setActiveConversation({
        id: data.threadId,
        title: data.title || trimmed.slice(0, 72),
        preview: assistantMessage.content.slice(0, 96),
        updatedAt: new Date().toISOString(),
        locale,
        messages: [...optimisticMessages, assistantMessage],
      });

      await fetchHistory(locale);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return;
      }

      console.error('Failed to send Daleel message:', err);
      setError(err instanceof Error ? err.message : 'Unable to send message.');
      setActiveConversation((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          messages: prev.messages.filter((item) => item.id !== tempUserMsg.id),
        };
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeConversation, fetchHistory, isLoading]);

  const deleteConversation = useCallback(async (id: string, locale: 'en' | 'ar') => {
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/history/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Failed to delete conversation (${response.status})`);
      }

      setHistoryGroups((prev) =>
        prev
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.id !== id),
          }))
          .filter((group) => group.items.length > 0),
      );

      if (activeConversation?.id === id) {
        setActiveConversation(null);
      }

      await fetchHistory(locale);
    } catch (err) {
      console.error('Failed to delete Daleel conversation:', err);
      setError(err instanceof Error ? err.message : 'Unable to delete conversation.');
    }
  }, [activeConversation?.id, fetchHistory]);

  const newConversation = useCallback(() => {
    setActiveConversation(null);
    setError(null);
  }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    historyGroups,
    activeConversation,
    isLoading,
    isLoadingHistory,
    error,
    fetchHistory,
    loadConversation,
    sendMessage,
    deleteConversation,
    newConversation,
    stopGeneration,
  };
}
