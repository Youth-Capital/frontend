import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/shared/auth/AuthContext";
import { AssistantChat } from "./AssistantChat";

const STORAGE_KEY = "yk_assistant_wide";

/**
 * The assistant, reachable from every screen.
 *
 * The question "how was this calculated?" arrives where the number is — on the
 * vacancy list, the candidate table, the skills page — so the assistant has to
 * be one click away from all of them rather than a place you navigate to.
 *
 * Two widths, because the panel serves two lengths of question. Narrow keeps
 * the screen behind it readable while you check one number against it. Wide
 * gives the answer's receipts room to be tables instead of wrapped fragments,
 * and only then is there space for the list of past conversations.
 */
export function ChatLauncher() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Private windows throw on access rather than returning null, and that
      // is no reason to fail to render.
      return false;
    }
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const toggleWidth = () => {
    setWide((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Preference is lost on reload; the panel still works.
      }
      return next;
    });
  };

  // Escape closes and returns focus to the button that opened it — otherwise a
  // keyboard user is dropped at the top of the document.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector("textarea")?.focus();
  }, [open]);

  if (!user || (user.role !== "STUDENT" && user.role !== "EMPLOYER")) return null;

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={t("chat.title")}
          className={
            wide
              ? "fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] top-[calc(4rem+env(safe-area-inset-top))] z-40 flex flex-col rounded-(--radius-card) border border-ink-200 bg-surface shadow-2xl sm:inset-x-6 sm:left-auto sm:w-[min(56rem,calc(100%-3rem))]"
              : "fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex max-h-[70dvh] flex-col rounded-(--radius-card) border border-ink-200 bg-surface shadow-2xl sm:inset-x-auto sm:right-6 sm:w-[26rem]"
          }
        >
          <div className="flex items-center justify-between gap-2 border-b border-ink-200 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">
                {t("chat.title")}
              </p>
              <p className="truncate text-xs text-ink-500">{t("chat.launcherHint")}</p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={toggleWidth}
                aria-pressed={wide}
                title={t(wide ? "chat.narrow" : "chat.widen")}
                aria-label={t(wide ? "chat.narrow" : "chat.widen")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-800 coarse:h-11 coarse:w-11"
              >
                {wide ? <CollapseIcon /> : <ExpandIcon />}
              </button>
              <button
                type="button"
                onClick={close}
                aria-label={t("common.close")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-800 coarse:h-11 coarse:w-11"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4">
            {/* History only in the wide panel: in the narrow one a sidebar
                would take the space the answer needs. */}
            <AssistantChat compact showHistory={wide} />
          </div>
        </div>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={t("chat.title")}
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-[calc(1.25rem+env(safe-area-inset-right))] z-40 flex h-12 items-center gap-2 rounded-full bg-brand-fill px-4 text-sm font-semibold text-on-brand shadow-lg transition-transform hover:bg-brand-fill-hover focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95"
      >
        <SparkIcon />
        <span className="hidden sm:inline">{t("chat.ask")}</span>
      </button>
    </>
  );
}

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 3H3v6M15 21h6v-6M3 3l7 7M21 21l-7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M10 4v6H4M14 20v-6h6M3 21l7-7M21 3l-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
