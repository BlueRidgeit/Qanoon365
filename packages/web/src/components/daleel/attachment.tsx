"use client";

import { useEffect, useMemo, useState, type FC, type PropsWithChildren } from "react";
import { XIcon, PlusIcon, FileText } from "lucide-react";
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { useShallow } from "zustand/shallow";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipIconButton } from "@/components/daleel/tooltip-icon-button";
import { cn } from "@/lib/utils";

const useFileSrc = (file: File | undefined) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      setSrc(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return src;
};

const useAttachmentSrc = () => {
  const { file, src } = useAuiState(
    useShallow((state): { file?: File; src?: string } => {
      if (state.attachment.type !== "image") return {};
      if (state.attachment.file) return { file: state.attachment.file };

      const imagePart = state.attachment.content?.find(
        (part) => part?.type === "image",
      );

      return imagePart?.type === "image" ? { src: imagePart.image } : {};
    }),
  );

  return useFileSrc(file) ?? src;
};

const getAttachmentExtension = (name: string) => {
  const trimmed = name.trim();
  const lastDot = trimmed.lastIndexOf(".");
  return lastDot >= 0 ? trimmed.slice(lastDot + 1).toUpperCase() : "";
};

const getAttachmentBadge = (
  name: string,
  mediaType: string | undefined,
  isImage: boolean,
) => {
  if (isImage) return "IMG";

  const extension = getAttachmentExtension(name);
  if (extension) {
    return extension.slice(0, 4);
  }

  if (mediaType?.startsWith("text/")) {
    return "TXT";
  }

  return "FILE";
};

const useAttachmentMeta = () => {
  return useAuiState(
    useShallow((state) => {
      const content = Array.isArray(state.attachment.content)
        ? state.attachment.content
        : [];
      const contentFile = content.find(
        (part) =>
          part &&
          typeof part === "object" &&
          (("filename" in part && typeof part.filename === "string") ||
            ("mediaType" in part && typeof part.mediaType === "string")),
      ) as { filename?: string; mediaType?: string } | undefined;

      return {
        isImage: state.attachment.type === "image",
        name:
          state.attachment.file?.name ?? contentFile?.filename ?? "Attachment",
        mediaType: state.attachment.file?.type ?? contentFile?.mediaType,
      };
    }),
  );
};

const AttachmentPreview: FC<{ src: string }> = ({ src }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <img
      src={src}
      alt="Attachment preview"
      className={cn(
        "block h-auto max-h-[80vh] w-auto max-w-full object-contain",
        isLoaded ? "" : "invisible",
      )}
      onLoad={() => setIsLoaded(true)}
    />
  );
};

const AttachmentPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const src = useAttachmentSrc();

  if (!src) return <>{children}</>;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="p-2 sm:max-w-3xl">
        <DialogTitle className="sr-only">Image Attachment Preview</DialogTitle>
        <div className="relative mx-auto flex max-h-[80dvh] w-full items-center justify-center overflow-hidden bg-background">
          <AttachmentPreview src={src} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AttachmentThumb: FC = () => {
  const isImage = useAuiState((state) => state.attachment.type === "image");
  const src = useAttachmentSrc();

  return (
    <Avatar className="h-full w-full rounded-none">
      <AvatarImage src={src} alt="Attachment preview" className="object-cover" />
      <AvatarFallback delayMs={isImage ? 200 : 0}>
        <FileText className="size-8 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
};

const AttachmentUI: FC = () => {
  const aui = useAui();
  const isComposer = aui.attachment.source !== "message";
  const { isImage, name, mediaType } = useAttachmentMeta();
  const typeLabel = useMemo(() => {
    if (isImage) return "Image";
    if (mediaType?.startsWith("text/")) return "Text document";
    return "Document";
  }, [isImage, mediaType]);
  const badgeLabel = useMemo(
    () => getAttachmentBadge(name, mediaType, isImage),
    [name, mediaType, isImage],
  );

  return (
    <AttachmentPrimitive.Root className="relative">
      {isImage ? (
        <AttachmentPreviewDialog>
          <div
            className="size-14 cursor-pointer overflow-hidden rounded-[calc(var(--composer-radius)-var(--composer-padding))] border bg-muted transition-opacity hover:opacity-80"
            role="button"
            aria-label={`${typeLabel} attachment`}
          >
            <AttachmentThumb />
          </div>
        </AttachmentPreviewDialog>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex min-w-0 cursor-default items-center gap-3 overflow-hidden rounded-[calc(var(--composer-radius)-var(--composer-padding))] border border-[#26358b]/18 bg-[#eef2ff] shadow-sm",
                isComposer ? "max-w-full px-3 py-2 pr-10" : "max-w-[22rem] px-3 py-2",
              )}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#26358b]/15 bg-[#1f2937] text-[11px] font-semibold tracking-[0.08em] text-white shadow-sm">
                {badgeLabel}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">
                  {name}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {typeLabel}
                </div>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">{name}</TooltipContent>
        </Tooltip>
      )}
      {isComposer ? <AttachmentRemove /> : null}
    </AttachmentPrimitive.Root>
  );
};

const AttachmentRemove: FC = () => {
  return (
    <AttachmentPrimitive.Remove asChild>
      <TooltipIconButton
        tooltip="Remove file"
        className="absolute right-1.5 top-1.5 size-6 rounded-full bg-white text-slate-500 shadow-sm hover:bg-white hover:text-destructive"
        side="top"
      >
        <XIcon className="size-3" />
      </TooltipIconButton>
    </AttachmentPrimitive.Remove>
  );
};

export const UserMessageAttachments: FC = () => (
  <div className="col-span-full col-start-1 row-start-1 flex w-full flex-row justify-end gap-2">
    <MessagePrimitive.Attachments>{() => <AttachmentUI />}</MessagePrimitive.Attachments>
  </div>
);

export const ComposerAttachments: FC = () => (
  <div className="flex w-full flex-row items-center gap-2 overflow-x-auto empty:hidden">
    <ComposerPrimitive.Attachments>{() => <AttachmentUI />}</ComposerPrimitive.Attachments>
  </div>
);

export const ComposerAddAttachment: FC<{ label: string }> = ({ label }) => (
  <ComposerPrimitive.AddAttachment asChild>
    <TooltipIconButton
      tooltip={label}
      side="bottom"
      variant="ghost"
      size="icon"
      className="size-8 rounded-full border border-[#26358b]/16 bg-[#eef2ff] p-1 text-[#26358b] shadow-sm hover:border-[#26358b]/28 hover:bg-[#dfe7ff] hover:text-[#1d2d74]"
      aria-label={label}
    >
      <PlusIcon className="size-5 stroke-[2px]" />
    </TooltipIconButton>
  </ComposerPrimitive.AddAttachment>
);
