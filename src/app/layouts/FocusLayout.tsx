import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { HOME_BY_ROLE, useAuth } from "@/shared/auth/AuthContext";
import { ChatLauncher } from "@/features/assistant/ChatLauncher";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { NotificationBell } from "@/shared/ui/NotificationBell";
import { ThemeSwitcher } from "@/shared/ui/ThemeSwitcher";

import { ProfileMenu } from "./ProfileMenu";
import { Logo } from "@/shared/ui/Logo";
import { SkipLink } from "@/shared/ui/SkipLink";

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
 * a trap rather than a focus mode. The mark is the way back to the dashboard,
 * which is where people already expect a logo to take them; the way back to
 * the course is inside the page, next to the lesson it belongs to.
 */
export function FocusLayout() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const home = user ? HOME_BY_ROLE[user.role] : "/";

  /*
   * The page declares `viewport-fit=cover`, so the document starts at the
   * physical top of the screen. This bar is full-bleed and sticks to `top-0`,
   * which means the inset belongs on the bar itself rather than on the
   * wrapper: padded here, the glass runs up under the status bar and the row
   * of controls sits below it. The wrapper carries the side insets for
   * landscape, where the notch eats one edge.
   */
  return (
    <div className="min-h-dvh pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <SkipLink />

      <header className="glass-bar sticky top-0 z-30 border-x-0 border-t-0 pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <Link
            to={home}
            className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl py-1 pr-2 transition-colors hover:bg-ink-100"
          >
            <Logo size={32} />
            <p className="truncate text-sm font-semibold leading-tight text-ink-900">
              {t("app.name")}
            </p>
          </Link>

          {/* Same trade as the app shell: on a phone the preferences move into
              the profile menu so the wordmark and the bell keep their room. */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
            <NotificationBell />
            <div className="border-l border-ink-200 pl-1.5 sm:pl-2">
              <ProfileMenu />
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
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
