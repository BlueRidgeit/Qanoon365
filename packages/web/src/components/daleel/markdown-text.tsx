"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import {
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
  type CodeHeaderProps,
} from "@assistant-ui/react-markdown";
import { CheckIcon, CopyIcon } from "lucide-react";
import remarkGfm from "remark-gfm";
import { memo, useState, type FC } from "react";

import { TooltipIconButton } from "@/components/daleel/tooltip-icon-button";
import type { DaleelLocale } from "@/lib/daleel-copy";
import { cn } from "@/lib/utils";

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
};

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  return (
    <div className="mt-2.5 flex items-center justify-between rounded-t-lg border border-slate-200/80 border-b-0 bg-slate-100/80 px-3 py-1.5 text-xs">
      <span className="font-medium lowercase text-slate-500">{language}</span>
      <TooltipIconButton tooltip="Copy" onClick={() => code && copyToClipboard(code)}>
        {isCopied ? <CheckIcon /> : <CopyIcon />}
      </TooltipIconButton>
    </div>
  );
};

const defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "mb-2 scroll-m-20 text-base font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "mb-1.5 mt-3 scroll-m-20 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "mb-1 mt-2.5 scroll-m-20 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn("my-2.5 leading-normal first:mt-0 last:mb-0", className)}
      {...props}
    />
  ),
  a: ({ className, href, target, rel, ...props }) => (
    <a
      className={cn(
        "text-[#26358b] underline underline-offset-2 hover:text-[#3246b0]",
        className,
      )}
      href={href}
      target={href ? "_blank" : target}
      rel={href ? "noopener noreferrer" : rel}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "my-2.5 border-l-2 border-slate-300 pl-3 italic text-slate-600",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "my-2 ml-5 list-disc marker:text-slate-400 [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "my-2 ml-5 list-decimal marker:text-slate-400 [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("leading-normal", className)} {...props} />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "overflow-x-auto rounded-b-lg border border-slate-200/80 border-t-0 bg-slate-100/60 p-3 text-xs leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();

    return (
      <code
        className={cn(
          !isCodeBlock &&
            "rounded-md border border-slate-200/80 bg-slate-100/80 px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
        {...props}
      />
    );
  },
  table: ({ className, ...props }) => (
    <table
      className={cn("my-2 w-full border-separate border-spacing-0", className)}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "bg-slate-100 px-2 py-1 text-left font-medium first:rounded-tl-lg last:rounded-tr-lg [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "border-b border-l border-slate-200 px-2 py-1 text-left last:border-r [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }) => (
    <tr
      className={cn(
        "m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg",
        className,
      )}
      {...props}
    />
  ),
  CodeHeader,
});

const MarkdownTextImpl = ({ locale }: { locale: DaleelLocale }) => (
  <MarkdownTextPrimitive
    remarkPlugins={[remarkGfm]}
    className={cn("aui-md text-slate-800", locale === "ar" && "text-right")}
    components={defaultComponents}
  />
);

export const MarkdownText = memo(MarkdownTextImpl);
