"use client";

import { useContext } from "react";
import { LangContext } from "./context";
import { uk } from "./uk";
import { en } from "./en";

export type { Lang, LangContextValue } from "./context";
export { LangProvider } from "./provider";

const all = { uk, en } as const;

export function useLanguage() {
  return useContext(LangContext);
}

export function useT() {
  const { lang } = useLanguage();
  return all[lang];
}
