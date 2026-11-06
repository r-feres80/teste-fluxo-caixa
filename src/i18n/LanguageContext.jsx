import React, { createContext, useContext, useState, useEffect } from "react";
import { TRANSLATIONS, IDIOMAS } from "./translations.js";

const LanguageContext = createContext(null);
const STORAGE_KEY = "cfo-fi-idioma";

export function LanguageProvider({ children }) {
  const [idioma, setIdiomaState] = useState(() => {
    try {
      const salvo = window.localStorage.getItem(STORAGE_KEY);
      return IDIOMAS.includes(salvo) ? salvo : "pt";
    } catch {
      return "pt";
    }
  });

  const setIdioma = (novo) => {
    if (!IDIOMAS.includes(novo)) return;
    setIdiomaState(novo);
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, idioma);
    } catch {
      // localStorage indisponível — o idioma simplesmente não persiste entre sessões.
    }
  }, [idioma]);

  const t = (key) => TRANSLATIONS[idioma]?.[key] ?? TRANSLATIONS.pt[key] ?? key;

  return <LanguageContext.Provider value={{ idioma, setIdioma, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage precisa ser chamado dentro de <LanguageProvider>");
  return ctx;
}
