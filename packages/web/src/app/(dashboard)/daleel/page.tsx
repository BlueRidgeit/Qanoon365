"use client";

import { useLocale } from "next-intl";

import { DaleelWorkspace } from "@/components/daleel/workspace";

export default function DaleelPage() {
  const locale = useLocale();

  return (
    <DaleelWorkspace initialLocale={locale === "ar" ? "ar" : "en"} />
  );
}
