import { useTranslation } from "react-i18next";

import { useTheme } from "@/shared/theme/ThemeContext";

/**
 * Light / dark toggle.
 *
 * A single button rather than a two-option group: there are exactly two states,
 * so the control's job is to show the one you would get by pressing it. The
 * icon is the *destination*, which is the convention people already read.
 */
export function ThemeSwitcher() {
  const { theme, toggle, followsSystem } = useTheme();
  const { t } = useTranslation();

  const nextIsDark = theme !== "dark";
  const label = t(nextIsDark ? "theme.switchToDark" : "theme.switchToLight");

  return (
    <button
      type="button"
      onClick={toggle}
      title={followsSystem ? `${label} · ${t("theme.followingSystem")}` : label}
      aria-label={label}
      className="relative flex h-9 w-9 items-center justify-center rounded-(--radius-control) border border-ink-200 text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-900"
    >
      {nextIsDark ? <MoonIcon /> : <SunIcon />}

      {/* A dot while the theme is still following the OS, so "why did it change
          by itself at sunset" has a visible answer. */}
      {followsSystem && (
        <span
          aria-hidden
          className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-brand-400"
        />
      )}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
