"use client";

import { memo, type ComponentType } from "react";
import {
  AlertCircleIcon,
  CheckIcon,
  LoaderIcon,
  XCircleIcon,
} from "lucide-react";
import type {
  ToolCallMessagePartComponent,
  ToolCallMessagePartStatus,
} from "@assistant-ui/react";

import { cn } from "@/lib/utils";

const statusIconMap: Record<
  ToolCallMessagePartStatus["type"],
  ComponentType<{ className?: string }>
> = {
  running: LoaderIcon,
  complete: CheckIcon,
  incomplete: XCircleIcon,
  "requires-action": AlertCircleIcon,
};

const runningLabelMap: Record<string, string> = {
  search_documents: "Searching repository",
  read_document: "Reading document",
  validate_document_access: "Checking access",
  web_search: "Searching the web",
};

const completeLabelMap: Record<string, string> = {
  search_documents: "Repository searched",
  read_document: "Document read",
  validate_document_access: "Access checked",
  web_search: "Web search complete",
};

const getStatusLabel = (
  toolName: string,
  statusType: ToolCallMessagePartStatus["type"],
) => {
  if (statusType === "running") {
    return runningLabelMap[toolName] ?? `Using ${toolName}`;
  }

  if (statusType === "incomplete") {
    return `Tool error in ${toolName}`;
  }

  if (statusType === "requires-action") {
    return `Action needed for ${toolName}`;
  }

  return completeLabelMap[toolName] ?? `${toolName} complete`;
};

const ToolFallbackImpl: ToolCallMessagePartComponent = ({
  toolName,
  status,
}) => {
  const statusType = status?.type ?? "complete";
  const Icon = statusIconMap[statusType];
  const isRunning = statusType === "running";
  const label = getStatusLabel(toolName, statusType);

  return (
    <div
      className={cn(
        "my-1 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-[0.01em] shadow-sm",
        statusType === "incomplete" &&
          "border-red-200/80 bg-red-50/90 text-red-600",
        statusType === "requires-action" &&
          "border-amber-200/80 bg-amber-50/90 text-amber-700",
        statusType === "complete" &&
          "border-slate-200/80 bg-slate-100/90 text-slate-500",
        statusType === "running" &&
          "border-slate-200/80 bg-slate-100/90 text-slate-500",
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", isRunning && "animate-spin")} />
      <span className="truncate">{label}</span>
      {isRunning ? (
        <span className="inline-flex items-center gap-1 text-slate-400">
          <span className="size-1 rounded-full bg-current animate-pulse" />
          <span className="size-1 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
          <span className="size-1 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
        </span>
      ) : null}
    </div>
  );
};

export const ToolFallback = memo(
  ToolFallbackImpl,
) as unknown as ToolCallMessagePartComponent;
