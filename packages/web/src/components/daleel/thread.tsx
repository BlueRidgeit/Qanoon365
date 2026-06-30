"use client";

import type { CSSProperties, FC } from "react";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";

import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/daleel/attachment";
import { MarkdownText } from "@/components/daleel/markdown-text";
import { ToolFallback } from "@/components/daleel/tool-fallback";
import { TooltipIconButton } from "@/components/daleel/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { daleelCopy, type DaleelLocale } from "@/lib/daleel-copy";
import { cn } from "@/lib/utils";

export const Thread: FC<{ locale: DaleelLocale }> = ({ locale }) => {
  const copy = daleelCopy[locale];

  return (
    <ThreadPrimitive.Root
      dir="ltr"
      className="flex h-full min-h-0 flex-col bg-transparent"
      style={
        {
          "--thread-max-width": "52rem",
          "--composer-radius": "28px",
          "--composer-padding": "12px",
        } as CSSProperties
      }
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        className="relative flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-auto scroll-smooth px-4 pt-4 md:px-6"
      >
        <AuiIf condition={(state) => state.thread.isEmpty}>
          <ThreadWelcome locale={locale} />
        </AuiIf>

        <ThreadPrimitive.Messages>
          {() => <ThreadMessage locale={locale} />}
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-(--thread-max-width) flex-col gap-4 overflow-visible rounded-t-(--composer-radius) bg-transparent pb-4 pt-2 md:pb-6">
          <ThreadScrollToBottom label={copy.scrollToBottom} />
          <Composer locale={locale} />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC<{ locale: DaleelLocale }> = ({ locale }) => {
  const role = useAuiState((state) => state.message.role);
  const isEditing = useAuiState((state) => state.message.composer.isEditing);

  if (isEditing) return <EditComposer />;
  if (role === "user") return <UserMessage locale={locale} />;
  return <AssistantMessage locale={locale} />;
};

const ThreadScrollToBottom: FC<{ label: string }> = ({ label }) => (
  <ThreadPrimitive.ScrollToBottom asChild>
    <TooltipIconButton
      tooltip={label}
      variant="outline"
      className="absolute -top-12 z-10 self-center rounded-full border-white/70 bg-white/90 p-4 shadow-lg disabled:invisible"
    >
      <ArrowDownIcon />
    </TooltipIconButton>
  </ThreadPrimitive.ScrollToBottom>
);

const ThreadWelcome: FC<{ locale: DaleelLocale }> = ({ locale }) => {
  const copy = daleelCopy[locale];

  return (
    <div className="mx-auto my-auto flex w-full max-w-(--thread-max-width) grow flex-col">
      <div className="flex w-full grow flex-col justify-center">
        <div className="rounded-[2rem] border border-white/70 bg-white/78 px-6 py-8 shadow-[0_28px_80px_-40px_rgba(24,39,58,0.3)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#26358b]/70">
            {copy.welcomeBadge}
          </p>
          <h1 className="pt-4 text-3xl font-semibold tracking-tight text-slate-950">
            {copy.welcomeTitle}
          </h1>
          <p className="pt-4 text-base leading-7 text-slate-700 md:text-lg">
            {copy.welcomeDescription}
          </p>
        </div>
      </div>
    </div>
  );
};

const Composer: FC<{ locale: DaleelLocale }> = ({ locale }) => {
  const copy = daleelCopy[locale];

  return (
    <ComposerPrimitive.Root className="relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone asChild>
        <div className="flex w-full flex-col gap-2 rounded-(--composer-radius) border border-white/80 bg-white/92 p-(--composer-padding) shadow-[0_24px_56px_-40px_rgba(15,23,42,0.55)] transition-shadow focus-within:border-ring/75 focus-within:ring-2 focus-within:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:border-dashed data-[dragging=true]:bg-accent/60">
          <ComposerAttachments />
          <ComposerPrimitive.Input
            placeholder={copy.composerPlaceholder}
            className={cn(
              "max-h-32 min-h-10 w-full resize-none bg-transparent py-1 text-sm text-slate-800 outline-none placeholder:text-slate-400",
              locale === "ar" ? "pr-3 pl-1 text-right" : "px-1.5 text-left",
            )}
            rows={1}
            autoFocus
            aria-label="Message input"
          />
          <ComposerAction locale={locale} />
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

const ComposerAction: FC<{ locale: DaleelLocale }> = ({ locale }) => {
  const copy = daleelCopy[locale];

  return (
    <div className="relative flex items-center justify-between">
      <ComposerAddAttachment label={copy.addAttachment} />
      <AuiIf condition={(state) => !state.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip={copy.send}
            side="bottom"
            type="button"
            variant="default"
            size="icon"
            className="size-8 rounded-full bg-[#26358b] text-white hover:bg-[#3147b5]"
            aria-label={copy.send}
          >
            <ArrowUpIcon className="size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(state) => state.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="size-8 rounded-full bg-[#26358b] text-white hover:bg-[#3147b5]"
            aria-label={copy.stop}
          >
            <SquareIcon className="size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const MessageError: FC = () => (
  <MessagePrimitive.Error>
    <ErrorPrimitive.Root className="mt-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
      <ErrorPrimitive.Message className="line-clamp-2" />
    </ErrorPrimitive.Root>
  </MessagePrimitive.Error>
);

const AssistantMessage: FC<{ locale: DaleelLocale }> = ({ locale }) => (
  <MessagePrimitive.Root className="relative mx-auto w-full max-w-(--thread-max-width) py-3">
    <div
      className={cn(
        "wrap-break-word rounded-[1.75rem] border border-white/70 bg-white/88 py-4 leading-relaxed text-slate-800 shadow-[0_28px_72px_-48px_rgba(15,23,42,0.55)]",
        locale === "ar" ? "pl-5 pr-6 text-right" : "px-5 text-left",
      )}
    >
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === "text") return <MarkdownText locale={locale} />;
          if (part.type === "tool-call") {
            return part.toolUI ?? <ToolFallback {...part} />;
          }

          return null;
        }}
      </MessagePrimitive.Parts>
      <MessageError />
    </div>

    <div className="ml-2 mt-1 flex min-h-6 items-center justify-start">
      <BranchPicker locale={locale} />
      <AssistantActionBar />
    </div>
  </MessagePrimitive.Root>
);

const AssistantActionBar: FC = () => (
  <ActionBarPrimitive.Root
    hideWhenRunning
    autohide="not-last"
    className="col-start-3 row-start-2 -ml-1 flex gap-1 text-muted-foreground"
  >
    <ActionBarPrimitive.Copy asChild>
      <TooltipIconButton tooltip="Copy">
        <AuiIf condition={(state) => state.message.isCopied}>
          <CheckIcon />
        </AuiIf>
        <AuiIf condition={(state) => !state.message.isCopied}>
          <CopyIcon />
        </AuiIf>
      </TooltipIconButton>
    </ActionBarPrimitive.Copy>
    <ActionBarPrimitive.Reload asChild>
      <TooltipIconButton tooltip="Refresh">
        <RefreshCwIcon />
      </TooltipIconButton>
    </ActionBarPrimitive.Reload>
    <ActionBarMorePrimitive.Root>
      <ActionBarMorePrimitive.Trigger asChild>
        <TooltipIconButton tooltip="More" className="data-[state=open]:bg-accent">
          <MoreHorizontalIcon />
        </TooltipIconButton>
      </ActionBarMorePrimitive.Trigger>
      <ActionBarMorePrimitive.Content
        side="bottom"
        align="start"
        className="z-50 min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      >
        <ActionBarPrimitive.ExportMarkdown asChild>
          <ActionBarMorePrimitive.Item className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
            <DownloadIcon className="size-4" />
            Export as Markdown
          </ActionBarMorePrimitive.Item>
        </ActionBarPrimitive.ExportMarkdown>
      </ActionBarMorePrimitive.Content>
    </ActionBarMorePrimitive.Root>
  </ActionBarPrimitive.Root>
);

const UserMessage: FC<{ locale: DaleelLocale }> = ({ locale }) => (
  <MessagePrimitive.Root
    className="mx-auto grid w-full max-w-(--thread-max-width) auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 py-3 [&:where(>*)]:col-start-2"
    data-role="user"
  >
    <UserMessageAttachments />

    <div className="relative col-start-2 min-w-0">
      <div
        className={cn(
          "peer wrap-break-word rounded-[1.6rem] bg-[#26358b] py-2.5 text-white shadow-[0_24px_64px_-42px_rgba(38,53,139,0.72)] empty:hidden",
          locale === "ar" ? "pl-4 pr-5 text-right" : "px-4 text-left",
        )}
      >
        <MessagePrimitive.Parts />
      </div>
      <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 pr-2 peer-empty:hidden">
        <UserActionBar />
      </div>
    </div>

    <BranchPicker
      locale={locale}
      className="col-span-full col-start-1 row-start-3 -mr-1 justify-end"
    />
  </MessagePrimitive.Root>
);

const UserActionBar: FC = () => (
  <ActionBarPrimitive.Root
    hideWhenRunning
    autohide="not-last"
    className="flex flex-col items-end"
  >
    <ActionBarPrimitive.Edit asChild>
      <TooltipIconButton tooltip="Edit" className="p-4">
        <PencilIcon />
      </TooltipIconButton>
    </ActionBarPrimitive.Edit>
  </ActionBarPrimitive.Root>
);

const EditComposer: FC = () => (
  <MessagePrimitive.Root className="mx-auto flex w-full max-w-(--thread-max-width) flex-col px-2 py-3">
    <ComposerPrimitive.Root className="ml-auto flex w-full max-w-[85%] flex-col rounded-2xl bg-muted">
      <ComposerPrimitive.Input
        className="min-h-14 w-full resize-none bg-transparent p-4 text-sm text-foreground outline-none"
        autoFocus
      />
      <div className="mx-3 mb-3 flex items-center gap-2 self-end">
        <ComposerPrimitive.Cancel asChild>
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button size="sm">Update</Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  </MessagePrimitive.Root>
);

const BranchPicker: FC<
  BranchPickerPrimitive.Root.Props & { locale: DaleelLocale }
> = ({ className, locale, ...props }) => {
  const isArabic = locale === "ar";
  const PreviousIcon = isArabic ? ChevronRightIcon : ChevronLeftIcon;
  const NextIcon = isArabic ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "mr-2 -ml-2 inline-flex items-center text-xs text-muted-foreground",
        className,
      )}
      {...props}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <PreviousIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <NextIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
};
