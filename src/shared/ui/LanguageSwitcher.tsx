import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";
import { SUPPORTED_LANGUAGES } from "@/shared/i18n";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();

  const current = i18n.resolvedLanguage ?? "uz";

  const change = async (code: string) => {
    await i18n.changeLanguage(code);

    // Skill, profession and course names are translated *by the server* from
    // the Accept-Language header. Without this the chrome switches language
    // and the content does not, leaving Uzbek names inside English sentences.
    void queryClient.invalidateQueries();
    // Persist to the profile so notifications and API labels follow too.
    if (user && user.preferred_language !== code) {
      try {
        const { data } = await api.patch("/auth/me/", {
          preferred_language: code,
        });
        setUser({ ...user, ...data });
      } catch {
        // A failed save is not worth blocking the UI language change.
      }
    }
  };

  return (
    <div
      className="flex items-center rounded-xl border border-ink-200 p-0.5"
      role="group"
      aria-label="Language"
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => void change(language.code)}
          aria-pressed={current === language.code}
          title={language.label}
          className={
            current === language.code
              ? "rounded-md bg-brand-600 px-2 py-1 text-xs font-semibold text-on-colour"
              : "rounded-md px-2 py-1 text-xs font-medium text-ink-500 hover:bg-ink-100"
          }
        >
          {language.short}
        </button>
      ))}
    </div>
  );
}
