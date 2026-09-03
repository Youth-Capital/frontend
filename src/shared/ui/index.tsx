/**
 * The UI kit.
 *
 * Deliberately small and unstyled-by-props: components take a `variant`, not a
 * `className` grab-bag, so three portals built by different hands still look
 * like one product.
 */
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/* ------------------------------------------------------------------ Button */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-on-colour hover:bg-brand-700 disabled:bg-brand-300 shadow-sm",
  secondary:
    "bg-surface text-ink-700 border border-ink-300 hover:bg-ink-50 disabled:text-ink-400",
  ghost: "bg-transparent text-ink-600 hover:bg-ink-100 disabled:text-ink-400",
  danger: "bg-danger text-on-colour hover:brightness-95 disabled:opacity-50 shadow-sm",
  success: "bg-success text-on-colour hover:brightness-95 disabled:opacity-50 shadow-sm",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    icon,
    fullWidth,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center rounded-(--radius-control) font-medium",
        /*
         * Press had no state of its own: hover and active looked identical, so
         * a click gave no acknowledgement until the request came back. The dip
         * is a transform rather than a colour or a size change — transform and
         * opacity are the two properties that do not force layout, which is
         * what keeps this smooth on a mid-range phone.
         *
         * 140ms sits in the micro-feedback range; anything slower reads as lag
         * on a control that is meant to feel immediate.
         */
        "transition-[color,background-color,border-color,transform] duration-140 ease-out",
        "active:scale-[0.98] disabled:active:scale-100",
        "disabled:cursor-not-allowed",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === "lg" ? 20 : 16} /> : icon}
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------- Input */
interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

function FieldShell({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: FieldProps & { htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink-700">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

/*
 * 16px on phones, 14px from the small breakpoint up.
 *
 * Not a taste decision: iOS Safari zooms the whole page in when a focused
 * input's font-size is under 16px, and it does not zoom back out. Every form in
 * the product was 14px, so tapping a field on an iPhone threw the layout off
 * screen and left the person pinching to find the next one. Desktop keeps the
 * denser size, where no such rule applies.
 */
const CONTROL_CLASS =
  "w-full rounded-(--radius-control) border bg-surface px-3 py-2 text-base text-ink-800 sm:text-sm " +
  "placeholder:text-ink-400 transition-colors focus:border-brand-500 " +
  "disabled:bg-ink-100 disabled:text-ink-500";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & FieldProps
>(function Input({ label, hint, error, required, className, id, ...rest }, ref) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={id}
    >
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        className={clsx(
          CONTROL_CLASS,
          error ? "border-danger" : "border-ink-300",
          className,
        )}
        {...rest}
      />
    </FieldShell>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(function Textarea({ label, hint, error, required, className, id, ...rest }, ref) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={id}
    >
      <textarea
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        className={clsx(
          CONTROL_CLASS,
          "min-h-24 resize-y",
          error ? "border-danger" : "border-ink-300",
          className,
        )}
        {...rest}
      />
    </FieldShell>
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & FieldProps
>(function Select({ label, hint, error, required, className, id, children, ...rest }, ref) {
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={id}
    >
      <select
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        className={clsx(
          CONTROL_CLASS,
          error ? "border-danger" : "border-ink-300",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
});

/* -------------------------------------------------------------------- Card */
export function Card({
  className,
  children,
  padded = true,
}: {
  className?: string;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div className={clsx("card", padded && "p-5", className)}>{children}</div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------- Badge */
type BadgeTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- ProgressBar */
export function ProgressBar({
  value,
  tone = "brand",
  showLabel = false,
  size = "md",
  label,
}: {
  value: number;
  tone?: BadgeTone;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const fill: Record<BadgeTone, string> = {
    neutral: "bg-ink-400",
    brand: "bg-brand-600",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    info: "bg-info",
  };
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" };

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          {label && <span className="text-sm text-ink-600">{label}</span>}
          {showLabel && (
            <span className="text-sm font-semibold tabular-nums text-ink-800">
              {clamped}%
            </span>
          )}
        </div>
      )}
      <div
        className={clsx("w-full overflow-hidden rounded-full bg-ink-200", heights[size])}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={clsx("h-full rounded-full transition-[width] duration-500", fill[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Spinner */
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-brand-600">
      <Spinner size={32} />
    </div>
  );
}

/* --------------------------------------------------------------- Skeletons */
export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} />;
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <Skeleton className="mb-4 h-5 w-1/3" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="mb-2.5 h-4 w-full last:w-2/3" />
      ))}
    </Card>
  );
}

/* ------------------------------------------------------------ Empty / Error */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-(--radius-card) border border-dashed border-ink-300 bg-surface px-6 py-12 text-center">
      {icon && <div className="text-ink-400">{icon}</div>}
      <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-ink-500">{description}</p>
      )}
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Retry",
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-(--radius-card) border border-danger-soft bg-danger-soft/40 px-6 py-10 text-center">
      <h3 className="text-sm font-semibold text-danger">{title}</h3>
      {description && <p className="max-w-md text-sm text-ink-600">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- Table */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-(--radius-card) border border-ink-200 bg-surface">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      className={clsx(
        "border-b border-ink-200 bg-ink-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <td
      className={clsx(
        "border-b border-ink-100 px-4 py-3 text-ink-700",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

/* ------------------------------------------------------------------- Modal */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  panelClassName,
  overlayClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Extra classes on the dialog itself — to leave room for a side panel. */
  panelClassName?: string;
  /** Raise the whole dialog above a panel that sits over the normal layer. */
  overlayClassName?: string;
}) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  /*
   * What `role="dialog"` promises and the browser does not give you.
   *
   * The markup said "modal" while the keyboard said otherwise: focus stayed on
   * the button behind the overlay, Tab walked straight out into the page the
   * dialog was covering, Escape did nothing, and on close focus landed at the
   * top of the document instead of back on the control that opened it. Someone
   * working without a mouse could open this and then not reach it.
   *
   * Returning focus is the step usually left out, and it is the one people
   * actually feel: without it every close throws you back to the start.
   */
  useEffect(() => {
    if (!open) return;

    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();

    const SELECTOR =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(SELECTOR),
      ).filter((node) => node.offsetParent !== null);
      if (focusable.length === 0) {
        // Nothing to land on inside: keep the ring on the panel rather than
        // letting Tab escape to the page behind.
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);

    // The page behind a modal should not scroll under it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" };

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-4",
        overlayClassName,
      )}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-surface shadow-xl outline-none sm:rounded-2xl",
          widths[size],
          panelClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-ink-200 bg-surface px-5 py-4">
          {/* Named, so a screen reader announces which dialog opened rather
              than the word "dialog" on its own. */}
          <h2 id={titleId} className="text-base font-semibold text-ink-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label={t("common.close")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-ink-200 bg-surface px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- Tabs */
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: ReactNode; count?: number }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto border-b border-ink-200"
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            active === tab.key
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-700",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-ink-100 px-1.5 py-0.5 text-xs tabular-nums text-ink-600">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- StatCard */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: BadgeTone;
  icon?: ReactNode;
}) {
  const accents: Record<BadgeTone, string> = {
    neutral: "text-ink-900",
    brand: "text-brand-700",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-info",
  };

  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-ink-500">
          {label}
        </p>
        <p className={clsx("mt-1.5 text-2xl font-semibold tabular-nums", accents[tone])}>
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      </div>
      {icon && <div className="shrink-0 text-ink-300">{icon}</div>}
    </Card>
  );
}
