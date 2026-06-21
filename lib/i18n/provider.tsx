"use client";

import { useState, useEffect, type ReactNode } from "react";
import { LangContext, type Lang } from "./context";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("uk");

  useEffect(() => {
    const saved = localStorage.getItem("t6x_lang") as Lang | null;
    if (saved === "uk" || saved === "en") setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem("t6x_lang", l);
  }

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}
