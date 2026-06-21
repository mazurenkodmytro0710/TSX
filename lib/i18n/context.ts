"use client";

import { createContext } from "react";

export type Lang = "uk" | "en";

export interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const LangContext = createContext<LangContextValue>({
  lang: "uk",
  setLang: () => {},
});
