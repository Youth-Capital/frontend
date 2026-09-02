import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en/common.json";
import ru from "@/locales/ru/common.json";
import uz from "@/locales/uz/common.json";

export const SUPPORTED_LANGUAGES = [
  { code: "uz", label: "O'zbekcha", short: "UZ" },
  { code: "ru", label: "Русский", short: "RU" },
  { code: "en", label: "English", short: "EN" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { common: uz },
      ru: { common: ru },
      en: { common: en },
    },
    // Uzbek (latin) is the platform default per TZ §12.
    fallbackLng: "uz",
    supportedLngs: SUPPORTED_LANGUAGES.map((language) => language.code),
    defaultNS: "common",
    ns: ["common"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "yk_language",
      caches: ["localStorage"],
    },
    returnNull: false,
  });

i18n.on("languageChanged", (language) => {
  localStorage.setItem("yk_language", language);
  document.documentElement.lang = language;
});

export default i18n;
