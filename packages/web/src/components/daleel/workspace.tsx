"use client";

import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilePlus2Icon,
  FileSearch2Icon,
  Globe2Icon,
  HistoryIcon,
  PanelLeftCloseIcon,
  PanelRightCloseIcon,
  ScaleIcon,
  SidebarOpenIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import { Thread } from "@/components/daleel/thread";
import {
  daleelCopy,
  daleelStarterPrompts,
  defaultDaleelLocale,
  type DaleelLocale,
} from "@/lib/daleel-copy";
import {
  getDaleelApiAccessToken,
  isDaleelAuthConfigured,
} from "@/lib/daleel-auth";
import { useDaleelConnection } from "@/hooks/use-daleel-connection";
import { cn } from "@/lib/utils";

type HistoryEntry = {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
};

type HistoryGroup = {
  label: string;
  items: HistoryEntry[];
};

type StoredThreadMessage = {
  id: string;
  role: string;
  text: string;
};

type ActiveThread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  locale: DaleelLocale;
  messages: UIMessage[];
};

const panelStorageKey = "qanoon-daleel-panel-open";
const localThreadIdPrefix = "__LOCALID_";

const toRuntimeMessages = (messages: StoredThreadMessage[]): UIMessage[] =>
  messages
    .filter((message) => message.text?.trim())
    .map((message, index) => ({
      id: message.id || `restored-${index + 1}`,
      role:
        message.role === "assistant" || message.role === "system"
          ? message.role
          : "user",
      parts: [
        {
          type: "text" as const,
          text: message.text,
        },
      ],
    }));

const extractMessageText = (message: UIMessage) =>
  (Array.isArray(message.parts) ? message.parts : [])
    .map((part) => {
      if (
        part &&
        typeof part === "object" &&
        "type" in part &&
        part.type === "text" &&
        "text" in part
      ) {
        return typeof part.text === "string" ? part.text : "";
      }

      return "";
    })
    .join("\n")
    .trim();

const truncateLabel = (value: string, max = 56) =>
  value.length <= max ? value : `${value.slice(0, max - 1)}…`;

const getThreadTitleFromMessages = (messages: UIMessage[], fallback: string) => {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const title = firstUserMessage ? extractMessageText(firstUserMessage) : "";
  return truncateLabel(title || fallback, 56);
};

const getThreadPreviewFromMessages = (messages: UIMessage[]) => {
  const latestText = [...messages]
    .reverse()
    .map(extractMessageText)
    .find(Boolean);

  return truncateLabel(latestText ?? "", 96);
};

const getInitialPanelOpen = () => {
  if (typeof window === "undefined") {
    return true;
  }

  const saved = window.localStorage.getItem(panelStorageKey);
  if (saved === "0") {
    return false;
  }

  if (saved === "1") {
    return true;
  }

  return true;
};

const getResolvedThreadId = (activeThreadId?: string, runtimeThreadId?: string) => {
  if (activeThreadId && !activeThreadId.startsWith(localThreadIdPrefix)) {
    return activeThreadId;
  }

  if (runtimeThreadId && !runtimeThreadId.startsWith(localThreadIdPrefix)) {
    return runtimeThreadId;
  }

  return crypto.randomUUID();
};

export function DaleelWorkspace({
  initialLocale = defaultDaleelLocale,
}: {
  initialLocale?: DaleelLocale;
}) {
  const [panelOpen, setPanelOpen] = useState(getInitialPanelOpen);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [historyGroups, setHistoryGroups] = useState<HistoryGroup[]>([]);
  const [activeThread, setActiveThread] = useState<ActiveThread | null>(null);
  const [activeThreadVersion, setActiveThreadVersion] = useState(0);
  const [loadingThreadId, setLoadingThreadId] = useState<string | null>(null);
  const connection = useDaleelConnection();
  const locale = initialLocale;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(panelStorageKey, panelOpen ? "1" : "0");
  }, [panelOpen]);

  const loadHistory = async (currentLocale: DaleelLocale) => {
    const accessToken = await getDaleelApiAccessToken().catch(() => undefined);

    if (!accessToken) {
      setHistoryGroups([]);
      return;
    }

    const response = await fetch(
      `/api/daleel/history?locale=${encodeURIComponent(currentLocale)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    ).catch(() => undefined);

    if (!response?.ok) {
      setHistoryGroups([]);
      return;
    }

    const data = (await response.json()) as {
      groups?: Array<{
        label?: string;
        items?: HistoryEntry[];
      }>;
    };

    setHistoryGroups(
      (data.groups ?? [])
        .filter((group) => group.label && Array.isArray(group.items))
        .map((group) => ({
          label: group.label!,
          items: (group.items ?? []).filter(
            (item) =>
              Boolean(
                item?.id &&
                  !item.id.startsWith(localThreadIdPrefix) &&
                  item?.title?.trim(),
              ),
          ),
        }))
        .filter((group) => group.items.length > 0),
    );
  };

  useEffect(() => {
    if (!connection.isConnected) {
      if (!connection.isConnected) {
        setHistoryGroups([]);
      }
      return;
    }

    let cancelled = false;

    const pollHistory = async () => {
      await loadHistory(locale);
      if (cancelled) return;
    };

    void pollHistory();
    const interval = window.setInterval(() => {
      void pollHistory();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [connection.isConnected, locale]);

  const copy = daleelCopy[locale];
  const isArabic = locale === "ar";
  const workspaceTitle = truncateLabel(
    activeThread?.title?.trim() || copy.navNewChat,
    52,
  );

  const handleThreadActivity = ({
    threadId,
    messages,
  }: {
    threadId: string;
    messages: UIMessage[];
  }) => {
    setActiveThread((current) => {
      const previous = current?.id === threadId ? current : undefined;

      return {
        id: threadId,
        title: getThreadTitleFromMessages(messages, previous?.title ?? copy.navNewChat),
        preview: getThreadPreviewFromMessages(messages),
        updatedAt: new Date().toISOString(),
        locale,
        messages,
      };
    });
  };

  const handleOpenThread = async (threadId: string) => {
    setLoadingThreadId(threadId);
    try {
      const accessToken = await getDaleelApiAccessToken();
      const response = await fetch(
        `/api/daleel/history?threadId=${encodeURIComponent(threadId)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load thread ${threadId}.`);
      }

      const data = (await response.json()) as {
        thread?: {
          id: string;
          title: string;
          preview: string;
          updatedAt: string;
          locale: DaleelLocale;
          messages: StoredThreadMessage[];
        };
      };

      if (!data.thread) {
        throw new Error("Thread payload missing.");
      }

      setActiveThread({
        ...data.thread,
        messages: toRuntimeMessages(data.thread.messages),
      });
      setActiveThreadVersion((current) => current + 1);
    } catch (error) {
      console.error("Failed to restore Daleel thread", error);
    } finally {
      setLoadingThreadId(null);
    }
  };

  const handleNewChat = () => {
    setActiveThread(null);
    setActiveThreadVersion((current) => current + 1);
  };

  const infoCards = useMemo(
    () => [
      { icon: FileSearch2Icon, ...copy.cards[0] },
      { icon: ScaleIcon, ...copy.cards[1] },
      { icon: Globe2Icon, ...copy.cards[2] },
    ],
    [copy.cards],
  );

  return (
    <ChatRuntimeShell
      key={`daleel-runtime:${activeThreadVersion}`}
      activeThreadId={activeThread?.id}
      initialMessages={activeThread?.messages ?? []}
      onThreadActivity={handleThreadActivity}
    >
      <section className="h-full min-h-0 min-w-0 overflow-hidden p-0">
        <div
          dir="ltr"
          className="flex h-full min-h-0 w-full overflow-hidden bg-white/50 shadow-[0_30px_90px_-45px_rgba(23,35,52,0.45)] backdrop-blur xl:rounded-[1.5rem] xl:border xl:border-white/70"
        >
          {!isArabic ? (
            <>
              <PrimaryNav
                locale={locale}
                isArabic={isArabic}
                onNewChat={handleNewChat}
                historyOpen={historyOpen}
                setHistoryOpen={setHistoryOpen}
                historyGroups={historyGroups}
                activeThreadId={activeThread?.id}
                loadingThreadId={loadingThreadId}
                onOpenThread={handleOpenThread}
                connection={connection}
              />
              <PanelSlot open={panelOpen}>
                <SupportPanel
                  locale={locale}
                  isArabic={isArabic}
                  infoCards={infoCards}
                  canSendPrompts={connection.isConnected}
                />
              </PanelSlot>
              <Workspace
                locale={locale}
                isArabic={isArabic}
                panelOpen={panelOpen}
                setPanelOpen={setPanelOpen}
                title={workspaceTitle}
                connection={connection}
              />
            </>
          ) : (
            <>
              <Workspace
                locale={locale}
                isArabic={isArabic}
                panelOpen={panelOpen}
                setPanelOpen={setPanelOpen}
                title={workspaceTitle}
                connection={connection}
              />
              <PanelSlot open={panelOpen}>
                <SupportPanel
                  locale={locale}
                  isArabic={isArabic}
                  infoCards={infoCards}
                  canSendPrompts={connection.isConnected}
                />
              </PanelSlot>
              <PrimaryNav
                locale={locale}
                isArabic={isArabic}
                onNewChat={handleNewChat}
                historyOpen={historyOpen}
                setHistoryOpen={setHistoryOpen}
                historyGroups={historyGroups}
                activeThreadId={activeThread?.id}
                loadingThreadId={loadingThreadId}
                onOpenThread={handleOpenThread}
                connection={connection}
              />
            </>
          )}
        </div>
      </section>
    </ChatRuntimeShell>
  );
}

function ChatRuntimeShell({
  activeThreadId,
  initialMessages,
  onThreadActivity,
  children,
}: {
  activeThreadId?: string;
  initialMessages: UIMessage[];
  onThreadActivity: (payload: { threadId: string; messages: UIMessage[] }) => void;
  children: ReactNode;
}) {
  const runtime = useChatRuntime({
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({
      api: "/api/daleel/chat",
      prepareSendMessagesRequest: async (options) => {
        const resolvedThreadId = getResolvedThreadId(activeThreadId, options.id);

        onThreadActivity({
          threadId: resolvedThreadId,
          messages: options.messages,
        });

        const accessToken = await getDaleelApiAccessToken().catch((error) => {
          console.error("Failed to acquire Daleel API access token", error);
          return undefined;
        });

        return {
          api: options.api,
          body: {
            ...(options.body ?? {}),
            id: resolvedThreadId,
            messages: options.messages,
            requestMetadata: options.requestMetadata,
          },
          credentials: options.credentials,
          headers: {
            ...(options.headers ?? {}),
            ...(accessToken
              ? {
                  Authorization: `Bearer ${accessToken}`,
                }
              : {}),
          },
        };
      },
    }),
  });

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

function PanelSlot({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "hidden overflow-hidden transition-[width,opacity] duration-300 ease-out lg:flex",
        open ? "w-[330px] opacity-100" : "w-0 opacity-0",
      )}
    >
      {children}
    </div>
  );
}

function Workspace({
  locale,
  isArabic,
  panelOpen,
  setPanelOpen,
  title,
  connection,
}: {
  locale: DaleelLocale;
  isArabic: boolean;
  panelOpen: boolean;
  setPanelOpen: Dispatch<SetStateAction<boolean>>;
  title: string;
  connection: ReturnType<typeof useDaleelConnection>;
}) {
  const copy = daleelCopy[locale];
  const CollapseIcon = isArabic ? PanelRightCloseIcon : PanelLeftCloseIcon;
  const ExpandIcon = SidebarOpenIcon;

  return (
    <section
      dir={isArabic ? "rtl" : "ltr"}
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,_rgba(255,255,255,0.84),_rgba(244,241,235,0.96))]"
    >
      <div className="border-b border-slate-200/80 bg-[linear-gradient(135deg,_rgba(38,53,139,0.08),_rgba(205,170,72,0.14))] px-6 py-5">
        <div
          className={cn(
            "flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
            isArabic ? "text-right" : "text-left",
          )}
        >
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setPanelOpen((current) => !current)}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/70 bg-white/90 text-slate-700 shadow-sm transition hover:border-[rgba(38,53,139,0.18)] hover:bg-white"
              aria-label={panelOpen ? copy.navCollapsePanel : copy.navExpandPanel}
              title={panelOpen ? copy.navCollapsePanel : copy.navExpandPanel}
            >
              <span className="inline-flex transition-transform duration-300 ease-out">
                {panelOpen ? <CollapseIcon className="size-4" /> : <ExpandIcon className="size-4" />}
              </span>
            </button>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {title}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <AuthRequired locale={locale} connection={connection}>
          <Thread locale={locale} />
        </AuthRequired>
      </div>
    </section>
  );
}

function PrimaryNav({
  locale,
  isArabic,
  onNewChat,
  historyOpen,
  setHistoryOpen,
  historyGroups,
  activeThreadId,
  loadingThreadId,
  onOpenThread,
  connection,
}: {
  locale: DaleelLocale;
  isArabic: boolean;
  onNewChat: () => void;
  historyOpen: boolean;
  setHistoryOpen: Dispatch<SetStateAction<boolean>>;
  historyGroups: HistoryGroup[];
  activeThreadId?: string;
  loadingThreadId?: string | null;
  onOpenThread: (threadId: string) => void;
  connection: ReturnType<typeof useDaleelConnection>;
}) {
  const copy = daleelCopy[locale];

  return (
    <aside
      dir={isArabic ? "rtl" : "ltr"}
      className={cn(
        "flex min-h-0 w-[290px] shrink-0 flex-col bg-[#26358b] text-white",
        isArabic ? "border-l border-white/10" : "border-r border-white/10",
      )}
    >
      <div className="border-b border-white/10 px-5 py-5">
        <div className={cn("space-y-4", isArabic ? "text-right" : "text-left")}>
          <div>
            <div className={cn("flex items-center gap-3", isArabic && "flex-row-reverse justify-end")}>
              <div className="inline-flex size-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8">
                <ScaleIcon className="size-5" />
              </div>
            </div>
            <h1 className="mt-3 text-[1.9rem] font-semibold leading-tight tracking-tight text-white">
              {copy.title}
            </h1>
          </div>

        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
        <div className="space-y-3">
          <NavButton
            icon={FilePlus2Icon}
            label={copy.navNewChat}
            onClick={onNewChat}
            primary
            isArabic={isArabic}
          />
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-hidden">
          <HistoryTree
            locale={locale}
            isArabic={isArabic}
            historyOpen={historyOpen}
            setHistoryOpen={setHistoryOpen}
            groups={historyGroups}
            activeThreadId={activeThreadId}
            loadingThreadId={loadingThreadId}
            onOpenThread={onOpenThread}
            isConnected={connection.isConnected}
          />
        </div>

        <section className="mt-4 rounded-2xl border border-white/18 bg-white/10 p-4">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.2em] text-[#f4a51c]/90",
              isArabic ? "text-right" : "text-left",
            )}
          >
            {copy.accountSection}
          </p>
          <div className="mt-3">
            <AuthStatus locale={locale} connection={connection} />
          </div>
        </section>
      </div>
    </aside>
  );
}

function HistoryTree({
  locale,
  isArabic,
  historyOpen,
  setHistoryOpen,
  groups,
  activeThreadId,
  loadingThreadId,
  onOpenThread,
  isConnected,
}: {
  locale: DaleelLocale;
  isArabic: boolean;
  historyOpen: boolean;
  setHistoryOpen: Dispatch<SetStateAction<boolean>>;
  groups: HistoryGroup[];
  activeThreadId?: string;
  loadingThreadId?: string | null;
  onOpenThread: (threadId: string) => void;
  isConnected: boolean;
}) {
  const copy = daleelCopy[locale];
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((group, index) => [group.label, index < 3])),
  );
  const ExpandIcon = historyOpen
    ? ChevronDownIcon
    : isArabic
      ? ChevronLeftIcon
      : ChevronRightIcon;

  useEffect(() => {
    setOpenGroups(
      Object.fromEntries(groups.map((group, index) => [group.label, index < 3])),
    );
  }, [groups]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/12 bg-white/4">
      <button
        type="button"
        onClick={() => setHistoryOpen((current) => !current)}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-3 transition hover:bg-white/6",
          isArabic ? "flex-row-reverse text-right" : "text-left",
        )}
      >
        <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-white/10">
          <HistoryIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-white">
            {copy.navHistory}
          </span>
        </span>
        <ExpandIcon className="size-4 text-[#f4a51c]" />
      </button>

      {historyOpen ? (
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/10 px-3 pb-2 pt-2">
          {!isConnected ? (
            <div
              className={cn(
                "px-3 py-3 text-xs text-white/55",
                isArabic ? "text-right" : "text-left",
              )}
            >
              {copy.liveAccessRequiresSignIn}
            </div>
          ) : groups.length === 0 ? (
            <div
              className={cn(
                "px-3 py-3 text-xs text-white/55",
                isArabic ? "text-right" : "text-left",
              )}
            >
              {copy.navEmptyHistory}
            </div>
          ) : (
            groups.map((group) => {
              const isOpen = openGroups[group.label] ?? false;
              const GroupIcon = isOpen
                ? ChevronDownIcon
                : isArabic
                  ? ChevronLeftIcon
                  : ChevronRightIcon;

              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((current) => ({
                        ...current,
                        [group.label]: !isOpen,
                      }))
                    }
                    className={cn(
                      "flex w-full items-center gap-2 px-1 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45 transition hover:text-white/65",
                      isArabic ? "flex-row-reverse text-right" : "text-left",
                    )}
                  >
                    <GroupIcon className="size-3.5 shrink-0" />
                    <span className="flex-1">{group.label}</span>
                  </button>

                  {isOpen ? (
                    <div className="pb-2">
                      <div className="space-y-1">
                        {group.items.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => onOpenThread(entry.id)}
                            className={cn(
                              "w-full rounded-lg px-2.5 py-2 text-sm leading-6 transition",
                              entry.id === activeThreadId
                                ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                                : "text-white/82 hover:bg-white/6",
                              isArabic ? "text-right" : "text-left",
                            )}
                          >
                            <span className="block truncate font-medium">
                              {entry.title}
                            </span>
                            <span className="block truncate text-xs text-white/48">
                              {loadingThreadId === entry.id ? copy.navLoading : entry.preview}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

function SupportPanel({
  locale,
  isArabic,
  infoCards,
  canSendPrompts,
}: {
  locale: DaleelLocale;
  isArabic: boolean;
  infoCards: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    description: string;
  }[];
  canSendPrompts: boolean;
}) {
  const copy = daleelCopy[locale];

  return (
    <aside
      dir={isArabic ? "rtl" : "ltr"}
      className={cn(
        "flex min-h-0 w-[330px] shrink-0 flex-col bg-white/72",
        isArabic ? "border-l border-slate-200/80" : "border-r border-slate-200/80",
      )}
    >
      <div className="border-b border-slate-200/80 px-5 py-5">
        <div className={isArabic ? "text-right" : "text-left"}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#26358b]/70">
            {copy.supportPanelTitle}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            {copy.supportPanelDescription}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="grid gap-3">
          {infoCards.map(({ icon, title, description }) => (
            <InfoCard
              key={title}
              icon={icon}
              title={title}
              description={description}
              isArabic={isArabic}
            />
          ))}
        </div>

        <section className="mt-5 rounded-2xl border border-[#26358b]/10 bg-[linear-gradient(180deg,rgba(205,170,72,0.12),rgba(255,255,255,0.82))] p-4">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-[0.2em] text-[#26358b]/70",
              isArabic ? "text-right" : "text-left",
            )}
          >
            {copy.starterPromptLabel}
          </p>
          <div className="mt-3 space-y-2">
            {daleelStarterPrompts[locale].map((prompt) => (
              <StarterPromptButton
                key={prompt}
                prompt={prompt}
                isArabic={isArabic}
                disabled={!canSendPrompts}
              />
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

function StarterPromptButton({
  prompt,
  isArabic,
  disabled,
}: {
  prompt: string;
  isArabic: boolean;
  disabled: boolean;
}) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "w-full cursor-not-allowed rounded-2xl border border-white bg-white/70 px-3 py-2 text-sm leading-6 text-slate-400",
          isArabic ? "text-right" : "text-left",
        )}
      >
        {prompt}
      </button>
    );
  }

  return (
    <ThreadPrimitive.Suggestion prompt={prompt} send asChild>
      <button
        type="button"
        className={cn(
          "w-full rounded-2xl border border-white bg-white px-3 py-2 text-sm leading-6 text-slate-700 transition hover:border-[#26358b]/20 hover:bg-white hover:shadow-sm",
          isArabic ? "text-right" : "text-left",
        )}
      >
        {prompt}
      </button>
    </ThreadPrimitive.Suggestion>
  );
}

function AuthRequired({
  locale,
  connection,
  children,
}: {
  locale: DaleelLocale;
  connection: ReturnType<typeof useDaleelConnection>;
  children: ReactNode;
}) {
  if (!connection.isReady) {
    return <AuthLockedState locale={locale} loading />;
  }

  if (!connection.isConfigured && !isDaleelAuthConfigured()) {
    return <AuthLockedState locale={locale} setupPending />;
  }

  if (!connection.isConnected) {
    return <AuthLockedState locale={locale} connect={connection.connect} />;
  }

  return <>{children}</>;
}

function AuthLockedState({
  locale,
  setupPending = false,
  loading = false,
  connect,
}: {
  locale: DaleelLocale;
  setupPending?: boolean;
  loading?: boolean;
  connect?: () => Promise<void> | void;
}) {
  const copy = daleelCopy[locale];

  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6 md:p-10">
      <div className="max-w-2xl rounded-[2rem] border border-white/75 bg-white/92 px-6 py-8 text-center shadow-[0_28px_90px_-42px_rgba(23,35,52,0.4)] backdrop-blur md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#26358b]/70">
          {daleelCopy[locale].title}
        </p>
        <h3 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          {setupPending ? copy.authSetupPending : copy.lockedTitle}
        </h3>
        <p className="mt-4 text-base leading-7 text-slate-700">
          {loading
            ? copy.liveAccessRequiresSignIn
            : setupPending
              ? copy.liveAccessRequiresSignIn
              : copy.lockedDescription}
        </p>
        {!setupPending && !loading && connect ? (
          <button
            type="button"
            onClick={() => {
              void connect();
            }}
            className="mt-6 rounded-full border border-[#26358b] bg-[#26358b] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#3147b5]"
          >
            {copy.lockedButton}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AuthStatus({
  locale,
  connection,
}: {
  locale: DaleelLocale;
  connection: ReturnType<typeof useDaleelConnection>;
}) {
  const copy = daleelCopy[locale];
  const isArabic = locale === "ar";
  const displayName = connection.displayName;
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "D";

  if (!connection.isConfigured && !isDaleelAuthConfigured()) {
    return (
      <div className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-xs text-white/75">
        {copy.authSetupPending}
      </div>
    );
  }

  if (!connection.isConnected) {
    return (
      <div className={cn("space-y-3", isArabic ? "text-right" : "text-left")}>
        <div className="text-[11px] leading-5 text-white/72">
          {copy.liveAccessRequiresSignIn}
        </div>
        <button
          type="button"
          onClick={() => {
            void connection.connect();
          }}
          className="rounded-full border border-[#f4a51c] bg-[#f4a51c] px-3 py-1.5 text-xs font-medium text-[#0f1720] transition hover:bg-[#ffb32e]"
        >
          {copy.signIn}
        </button>
        {connection.error ? (
          <p className="text-[11px] text-red-200">{connection.error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", isArabic ? "text-right" : "text-left")}>
      <div className="text-xs text-white/72">
        <div className="font-semibold text-white">{copy.authSignedIn}</div>
        <div className="mt-1 text-sm text-white/94">{displayName}</div>
        <div className="mt-1 text-[11px] leading-5 text-white/72">
          {copy.liveAccessReady}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-2",
          isArabic ? "flex-row-reverse justify-between" : "justify-between",
        )}
      >
        <div className={cn("flex items-center gap-2", isArabic && "flex-row-reverse")}>
          <button
            type="button"
            onClick={() => {
              void connection.disconnect();
            }}
            className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:border-white/28 hover:bg-white/14"
          >
            {copy.signOut}
          </button>
          <div className="inline-flex size-10 items-center justify-center rounded-full bg-[#f4a51c] text-xs font-semibold text-[#0f1720] shadow-sm">
            {initials}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({
  icon: Icon,
  label,
  onClick,
  primary = false,
  isArabic,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  primary?: boolean;
  isArabic: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 transition",
        primary
          ? "border-[#f4a51c]/50 bg-[#f4a51c] text-[#0f1720] hover:bg-[#ffb32e]"
          : "border-white/10 bg-white/6 text-white hover:border-white/20 hover:bg-white/10",
        isArabic ? "flex-row-reverse text-right" : "text-left",
      )}
    >
      <span
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-2xl",
          primary ? "bg-[#0f1720]/10" : "bg-white/10",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
      </span>
    </button>
  );
}

function InfoCard({
  icon: Icon,
  title,
  description,
  isArabic,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  isArabic: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
      <div className={cn("flex items-start gap-3", isArabic ? "flex-row-reverse text-right" : "text-left")}>
        <div className="rounded-2xl bg-[#26358b] p-2.5 text-white">
          <Icon className="size-4" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-700">{description}</p>
        </div>
      </div>
    </div>
  );
}
