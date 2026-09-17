import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet } from "react-router-dom";

import { HOME_BY_ROLE, useAuth } from "@/shared/auth/AuthContext";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { NotificationBell } from "@/shared/ui/NotificationBell";
import { ChatLauncher } from "@/features/assistant/ChatLauncher";
import { ProfileMenu } from "./ProfileMenu";
import { ThemeSwitcher } from "@/shared/ui/ThemeSwitcher";
import { LogoMark } from "@/shared/ui/Logo";
import { SkipLink } from "@/shared/ui/SkipLink";

export interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ReactNode;
  end?: boolean;
}

interface Props {
  navItems: NavItem[];
  portalLabel: string;
  accent?: "brand" | "info" | "warning";
}

export function AppShell({ navItems, portalLabel, accent = "brand" }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  /**
   * The shell only ever renders behind RequireRole, so a user is present. The
   * fallback is for the frame between a session expiring and the redirect
   * landing — a dead href there is worse than one that points at the door.
   */
  const home = user ? HOME_BY_ROLE[user.role] : "/";

  /*
   * Ground and ink together, because they no longer agree with each other.
   * The brand tile is a pastel and takes the dark ink solved for it; `info`
   * and `warning` are saturated and still take the pale one. Keeping them in
   * one map is what stops a portal being given a ground without its text.
   */
  const accents = {
    brand: "bg-brand-fill text-on-brand",
    info: "bg-info text-on-colour",
    warning: "bg-warning text-on-colour",
  } as const;

  /* `overscroll-contain` keeps a flick at the end of the rail from carrying on
     into the page underneath it, which on a phone reads as the menu dragging
     the whole app around. */
  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto overscroll-contain p-3">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            clsx(
              /* A pill, like every other pressable thing in the system. The
                 filled state is the periwinkle itself carrying the dark ink
                 solved for it — the rail is where someone checks where they
                 are, so it gets the colour at full strength rather than a
                 tint of it. */
              "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors coarse:py-3",
              isActive
                ? "bg-brand-fill text-on-brand"
                : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
            )
          }
        >
          <span className="shrink-0">{item.icon}</span>
          <span className="truncate">{t(item.labelKey)}</span>
        </NavLink>
      ))}

    </nav>
  );

  /*
   * The shell floats.
   *
   * Full-bleed chrome is the one thing that would still read as an opaque app
   * on a page built from frosted panels: the aurora has to run *past* the bar
   * and the rail, not stop underneath them. So both are inset from the edge,
   * rounded, and lit by the wash showing in the gap around them. The page
   * itself carries no background — the body's aurora is the ground, and any
   * colour painted here would hide the thing every panel is frosting.
   *
   * The vertical geometry is one chain of numbers and each is used in more
   * than one place, so it is written down once here rather than re-derived at
   * four call sites:
   *
   *   header inset       0.75rem   top-3 / mt-3
   *   header height      3.5rem    h-14
   *   header bottom      4.25rem   where the mobile scrim starts
   *   gap under the bar  0.75rem
   *   rail top           5rem      top-20, desktop rail and mobile drawer
   *   rail bottom inset  0.75rem   so the rail is 100dvh − 5.75rem tall
   *
   * The inset is deliberately not responsive — only the horizontal margin
   * opens up on wider screens. A breakpoint-dependent top would need a
   * breakpoint-dependent rail offset and height to match, and those three
   * would drift apart the first time one of them was edited.
   *
   * On top of that chain sits the device's own safe area. The page declares
   * `viewport-fit=cover`, so the document now starts at the physical top of
   * the screen rather than below the status bar, and every number above is
   * measured from there. The status bar inset is therefore added to the
   * wrapper's padding and to the bar's sticky offset — added, not replaced,
   * so a phone with no notch reports zero and the geometry is unchanged.
   */
  return (
    <div className="min-h-dvh pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <SkipLink />

      <header className="glass-bar sticky top-[calc(0.75rem+env(safe-area-inset-top))] z-30 mx-3 mt-3 rounded-(--radius-card) shadow-sm sm:mx-4 lg:mx-6">
        <div className="flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-600 hover:bg-ink-100 coarse:h-11 coarse:w-11 lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={t("common.menu")}
            aria-expanded={mobileOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d={mobileOpen ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* The mark and the name are one control: the way back to the
              dashboard from anywhere in the portal. */}
          <Link
            to={home}
            onClick={() => setMobileOpen(false)}
            className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-full py-1 pr-3 pl-1 transition-colors hover:bg-ink-100"
          >
            <div
              className={clsx(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-(--radius-control)",
                accents[accent],
              )}
            >
              <LogoMark size={23} />
            </div>
            {/*
              * "Youth Capital" needs 90px. On a 360px screen the bar has 91
              * left once the menu button, the bell and the avatar have taken
              * theirs, so it fits from there up — but at 320 it has 52, and a
              * name cut to "Youth Ca…" reads as a bug rather than as a name.
              * Below that width the mark carries the identity on its own,
              * which is what a mark is for. It stays the same link either way.
              */}
            <div className="hidden min-w-0 min-[360px]:block">
              <p className="truncate text-sm font-semibold leading-tight text-ink-900">
                {t("app.name")}
              </p>
              <p className="truncate text-xs leading-tight text-ink-500">
                {portalLabel}
              </p>
            </div>
          </Link>

          {/* Theme and language are preferences someone sets once. On a 320px
              phone they are also the two controls that push the wordmark off
              the bar — measured at 56px of overflow with all four present. So
              below `sm` they move into the profile menu, where the rest of the
              account preferences already live. The bell and the avatar stay:
              those are read on every visit, not set once. */}
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

      <div className="flex">
        {/* The rail hangs under the bar rather than off the viewport: 5rem
            down, 0.75rem left at the bottom, and `overflow-hidden` so the
            nav's own scroll is cut by the corners instead of running past
            them. Its left margin matches the bar's at this breakpoint, which
            is the only one it is ever shown at. */}
        <aside className="glass-bar sticky top-20 ml-6 hidden h-[calc(100dvh-5.75rem)] w-60 shrink-0 overflow-hidden rounded-(--radius-card) shadow-sm lg:block">
          {sidebar}
        </aside>

        {mobileOpen && (
          <>
            {/* The scrim starts at the bar's bottom edge — 4.25rem, the third
                line of the chain above — so the button that opened the drawer
                is still the button that closes it. */}
            <div
              className="fixed inset-0 top-[calc(4.25rem+env(safe-area-inset-top))] z-20 bg-ink-900/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            {/* Raised rather than barred: this one sits *over* the content it
                covers, and a menu has to stay readable whatever is beneath.
                It is `fixed`, so it is placed against the screen rather than
                against the padded wrapper and has to carry the insets itself —
                otherwise its last nav item sits under the home indicator. */}
            <aside className="glass-raised fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-[calc(0.75rem+env(safe-area-inset-left))] top-[calc(5rem+env(safe-area-inset-top))] z-30 w-64 overflow-hidden rounded-(--radius-card) lg:hidden">
              {sidebar}
            </aside>
          </>
        )}

        <main id="main" className="min-w-0 flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Reachable from every screen, because "how was this calculated?" is
          asked where the number is, not on the assistant page. */}
      <ChatLauncher />
    </div>
  );
}

/* Icons kept inline: nine small paths beat a 40 KB icon dependency. */
export const icons = {
  billing: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
      <path d="M6 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  notes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 3h8l4 4v14H6V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v4h4M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  career: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 18l5-5 4 4 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 9h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  skills: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  knowledge: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19V6a2 2 0 0 1 2-2h12v15M6 19h12M6 19a2 2 0 0 0 2 2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  courses: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5L3 9l9 4 9-4-9-4zM6 12v4c0 1.1 2.7 2 6 2s6-.9 6-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  tests: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 11l2 2 4-4M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  experience: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8zM9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  cv: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4zM14 3v4h4M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  jobs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 9h18v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9zM8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3M3 13h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  applications: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 5h16v14H4zM4 8l8 5 8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plan: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 3v3M16 3v3M4 8h16M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM9 14l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  assistant: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3a7 7 0 0 1 7 7c0 2.5-1.4 4-2.5 5.2-.8.9-1.5 1.6-1.5 2.8v1h-6v-1c0-1.2-.7-1.9-1.5-2.8C6.4 14 5 12.5 5 10a7 7 0 0 1 7-7zM10 22h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  company: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M4 21h16M8 8h3M8 12h3M8 16h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  candidates: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M17 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM22 20v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  moderation: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l8 3v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6l8-3zM9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  taxonomy: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 4h11M9 12h11M9 20h11M4 4h.01M4 12h.01M4 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  audit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 8v4l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  reviews: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-4.6A8 8 0 0 1 13 4a8 8 0 0 1 8 8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 11h8M9 15h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};
