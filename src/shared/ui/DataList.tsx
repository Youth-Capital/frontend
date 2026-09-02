import clsx from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Dense list primitives.
 *
 * Summary surfaces stay as cards; lists become rows inside one card. The
 * card-per-item layout fit six skills on a 1080p screen and pushed each row's
 * actions ~1400px away from the content they act on — the eye had to cross the
 * whole viewport to connect "SQL" with "Remove".
 *
 * Rows put actions in an overflow menu at the end of the row, so the distance
 * is bounded by the row, not by the viewport. Below `sm` the grid collapses to
 * stacked blocks, because a five-column row on a phone is a horizontal scroll
 * bar with extra steps.
 */

export function DataList({
  title,
  subtitle,
  action,
  children,
  empty,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="card overflow-hidden">
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-ink-900">{title}</h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {empty ? children : <div className="divide-y divide-ink-100">{children}</div>}
    </div>
  );
}

export function DataRow({
  children,
  onClick,
  highlighted,
  expanded,
}: {
  children: ReactNode;
  onClick?: () => void;
  highlighted?: boolean;
  /** Rendered under the row, full width — evidence trails, history, details. */
  expanded?: ReactNode;
}) {
  return (
    <div className={clsx(highlighted && "bg-brand-50/50")}>
      <div
        className={clsx(
          "flex flex-col gap-3 px-5 py-3.5 transition-colors sm:flex-row sm:items-center sm:gap-4",
          onClick && "cursor-pointer hover:bg-ink-50",
        )}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        {children}
      </div>
      {expanded && (
        <div className="border-t border-ink-100 bg-ink-50 px-5 py-4">{expanded}</div>
      )}
    </div>
  );
}

/** Leading cell: the thing the row is about. */
export function RowMain({
  title,
  subtitle,
  badges,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="truncate font-medium text-ink-900">{title}</span>
        {badges}
      </div>
      {subtitle && (
        <p className="mt-0.5 truncate text-xs text-ink-500">{subtitle}</p>
      )}
    </div>
  );
}

/** Fixed-width numeric cell so columns line up down the list. */
export function RowValue({
  value,
  hint,
  tone = "ink",
}: {
  value: ReactNode;
  hint?: ReactNode;
  tone?: "ink" | "brand" | "success" | "warning" | "danger";
}) {
  const tones = {
    ink: "text-ink-800",
    brand: "text-brand-700",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  } as const;

  return (
    <div className="shrink-0 text-left sm:w-20 sm:text-right">
      <span className={clsx("text-sm font-semibold tabular-nums", tones[tone])}>
        {value}
      </span>
      {hint && <p className="text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

/**
 * Overflow menu.
 *
 * Actions live here rather than as inline links: on a dense row a set of text
 * links becomes visual noise repeated on every line, and it is what pushed the
 * controls to the far edge of the screen in the card layout.
 */
export interface RowAction {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

export function RowMenu({ actions, label }: { actions: RowAction[]; label: string }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div ref={container} className="relative shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className={clsx(
          "rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700",
          open && "bg-ink-100 text-ink-700",
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="5" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <circle cx="12" cy="19" r="1.6" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-44 overflow-hidden rounded-xl border border-ink-200 bg-surface py-1 shadow-lg"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                action.onSelect();
              }}
              className={clsx(
                "block w-full px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                action.tone === "danger"
                  ? "text-danger hover:bg-danger-soft"
                  : "text-ink-700 hover:bg-ink-100",
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Inline meter for a 0-100 value inside a row. */
export function RowMeter({
  value,
  color,
  tone = "brand",
}: {
  value: number;
  /** Explicit colour wins — used where a row carries its own identity hue. */
  color?: string;
  tone?: "brand" | "success" | "warning" | "danger" | "neutral";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const tones = {
    brand: "bg-brand-600",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    neutral: "bg-ink-400",
  } as const;

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200 sm:w-32">
      <div
        className={clsx("h-full rounded-full", !color && tones[tone])}
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
