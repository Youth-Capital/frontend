import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";
import { SUPPORTED_LANGUAGES } from "@/shared/i18n";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
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

  /*
   * Inner radius = outer radius − padding.
   *
   * The container is one control radius with 2px of padding, so a corner
   * inside it has 2px less room to turn in. The active pill was a flat 6px
   * against the container's 12px, which is what made it read as a square
   * sitting in a rounded box — the curves were not concentric, and that reads
   * as wrong long before anyone can say why.
   *
   * Written as a calc off the token rather than as 10px, so the two stay in
   * step if the control radius is ever retuned.
   */
  const itemRadius = "rounded-[calc(var(--radius-control)-2px)]";

  /*
   * 32x24 with a mouse, 44x44 with a fingertip.
   *
   * Three codes sit side by side, so at the small size the gap between the
   * middle of one and the middle of the next is under 40px — inside the width
   * of the fingertip pressing it. Growing them only for a coarse pointer keeps
   * the bar compact on a desktop, where the pointer is a few pixels wide.
   */
  const size =
    "px-2 py-1 text-xs coarse:flex coarse:h-11 coarse:min-w-11 coarse:items-center coarse:justify-center coarse:text-sm";

  return (
    <div
      className="flex items-center rounded-(--radius-control) border border-ink-200 p-0.5"
      role="group"
      aria-label={t("settings.language")}
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
              ? `${itemRadius} ${size} bg-brand-fill font-semibold text-on-colour`
              : `${itemRadius} ${size} font-medium text-ink-500 hover:bg-ink-100`
          }
        >
          {language.short}
        </button>
      ))}
    </div>
  );
}
