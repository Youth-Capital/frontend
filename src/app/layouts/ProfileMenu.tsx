import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/shared/auth/AuthContext";

/**
 * Everything that describes *you*, gathered under one control.
 *
 * The sidebar had fifteen entries for a learner, which is past the point where
 * a list can be scanned. The split is by kind, not by count: the sidebar keeps
 * the places you go to **do** something — plan, courses, tests, vacancies —
 * and this menu holds your record and your account.
 *
 * The record items are the ones people check rather than work in, so a second
 * click is the right price for a shorter list. Their current values are shown
 * on the button itself, which is often the only reason someone was going to
 * open them.
 */

interface Item {
  to: string;
  labelKey: string;
}

/** Your record, per role. Empty for roles that have none. */
const RECORD: Record<string, Item[]> = {
  STUDENT: [
    { to: "/student/skills", labelKey: "nav.skills" },
    { to: "/student/knowledge", labelKey: "nav.knowledge" },
    { to: "/student/experience", labelKey: "nav.experience" },
    { to: "/student/cv", labelKey: "nav.cv" },
  ],
  EMPLOYER: [{ to: "/employer/company", labelKey: "nav.company" }],
  MENTOR: [],
  ADMIN: [],
};

/** Account settings, per role. */
const ACCOUNT: Record<string, Item[]> = {
  STUDENT: [
    { to: "/student/billing", labelKey: "nav.billing" },
    { to: "/student/settings", labelKey: "nav.settings" },
  ],
  EMPLOYER: [
    { to: "/employer/billing", labelKey: "nav.billing" },
    { to: "/employer/settings", labelKey: "nav.settings" },
  ],
  MENTOR: [{ to: "/mentor/settings", labelKey: "nav.settings" }],
  ADMIN: [{ to: "/admin/settings", labelKey: "nav.settings" }],
};

export function ProfileMenu() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Navigating away should close it; otherwise the panel hangs over the page
  // you just asked for.
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login", { replace: true });
  };

  if (!user) return null;

  const record = RECORD[user.role] ?? [];
  const account = ACCOUNT[user.role] ?? [];
  const initial = (user.display_name ?? "?").charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-ink-200 py-1 pl-1 pr-2 transition-colors hover:border-ink-300 sm:pr-3"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-on-colour">
          {initial}
        </span>
        <span className="hidden max-w-28 truncate text-sm text-ink-700 sm:block">
          {user.display_name}
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("profileMenu.title")}
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-(--radius-card) border border-ink-200 bg-surface shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-ink-200 bg-ink-50 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-on-colour">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">
                {user.display_name}
              </p>
              <p className="truncate text-xs text-ink-500">{user.email}</p>
            </div>
          </div>

          {record.length > 0 && (
            <Group label={t("profileMenu.record")} items={record} />
          )}
          {account.length > 0 && (
            <Group label={t("profileMenu.account")} items={account} />
          )}

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 border-t border-ink-200 px-4 py-3 text-left text-sm text-danger hover:bg-danger-soft"
          >
            <SignOutIcon />
            {t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

function Group({ label, items }: { label: string; items: Item[] }) {
  const { t } = useTranslation();
  return (
    <div className="border-t border-ink-200 py-1.5 first:border-t-0">
      <p className="px-4 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </p>
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          role="menuitem"
          className="block px-4 py-2 text-sm text-ink-700 hover:bg-ink-100 hover:text-ink-900"
        >
          {t(item.labelKey)}
        </Link>
      ))}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={open ? "rotate-180 text-ink-400 transition-transform" : "text-ink-400 transition-transform"}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 17l5-5-5-5M20 12H9M11 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
