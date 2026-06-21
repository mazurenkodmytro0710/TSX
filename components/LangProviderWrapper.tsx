"use client";

import { LangProvider } from "@/lib/i18n";
import type { ReactNode } from "react";

export function LangProviderWrapper({ children }: { children: ReactNode }) {
  return <LangProvider>{children}</LangProvider>;
}
