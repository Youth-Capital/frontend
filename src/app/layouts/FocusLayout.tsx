import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ChatLauncher } from "@/features/assistant/ChatLauncher";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { NotificationBell } from "@/shared/ui/NotificationBell";
import { ThemeSwitcher } from "@/shared/ui/ThemeSwitcher";

import { ProfileMenu } from "./ProfileMenu";
import { Logo } from "@/shared/ui/Logo";

/**
 * A screen with nothing to click away to.
 *
 * The app shell is right for pages you move between — a dashboard, a list, a
 * profile. It is wrong for a lesson. A learner watching a video does not need
 * ten other destinations in their peripheral vision, and the sidebar was
 * taking a fifth of the width from the one thing they came for.
 *
 * The header stays, minus the navigation: theme, language, notifications and
 * the profile menu are how somebody leaves, and a screen with no way out is
 * a trap rather than a focus mode. The way back to the course is inside the
 * page, next to the lesson it belongs to.
 */
export function FocusLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-surface">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <Logo size={32} />
            <p className="truncate text-sm font-semibold leading-tight text-ink-900">
              {t("app.name")}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <NotificationBell />
            <div className="border-l border-ink-200 pl-2">
              <ProfileMenu />
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Kept: it is a floating button, not a sidebar, and asking about the
          lesson you are on is exactly what it is for. */}
      <ChatLauncher />
    </div>
  );
}
