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
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/* ------------------------------------------------------------------ Button */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

/*
 * Buttons are pills now.
 *
 * On a page of frosted rectangles a rounded-rectangle button is one more
 * rectangle. The pill is the one shape in the system that is not a panel,
 * which is what makes it read as the thing you press.
 *
 * Primary stays opaque on purpose. It is the only element on most screens
 * that is a solid saturated fill, and that is the whole point: on glass, the
 * strongest signal available is *not* being translucent. It also sidesteps
 * the composite problem entirely — on-colour measures 5.34:1 on brand-600
 * whatever the aurora is doing behind it, which a frosted primary could not
 * promise.
 *
 * Secondary and ghost are glass, and lean on the shared `.glass` class rather
 * than restating the mix, so a change to the panel alpha moves them with
 * everything else.
 */
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  /*
   * The pastel measures 1.72:1 against a pale page — it cannot be its own
   * edge. The border is the solved 3:1 boundary, so the button has a shape
   * whether it sits on the page, on a card, or on glass.
   */
  primary:
    "bg-brand-fill text-on-brand border border-brand-edge " +
    "hover:bg-brand-fill-hover disabled:bg-brand-100 disabled:text-ink-400 " +
    "disabled:border-ink-200 shadow-sm",
  secondary:
    "glass text-ink-700 hover:bg-surface disabled:text-ink-400 shadow-xs",
  ghost: "bg-transparent text-ink-600 hover:bg-ink-100 disabled:text-ink-400",
  danger: "bg-danger text-on-colour hover:brightness-95 disabled:opacity-50 shadow-sm",
  success: "bg-success text-on-colour hover:brightness-95 disabled:opacity-50 shadow-sm",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 coarse:h-11",
  md: "h-10 px-4 text-sm gap-2 coarse:h-11",
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
        "inline-flex items-center justify-center rounded-full font-medium",
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
 * 16px under a fingertip, 14px under a mouse.
 *
 * Not a taste decision: iOS Safari zooms the whole page in when a focused
 * input's font-size is under 16px, and it does not zoom back out. Tapping a
 * field threw the layout off screen and left the person pinching to find the
 * next one.
 *
 * This was guarded by a width breakpoint — 16px below `sm`, 14px above — which
 * is the wrong question, and it let every iPad through: measured on iPad mini,
 * Air, Pro 11", Pro 12.9" and in landscape, all ten fields on the profile and
 * course pages came back at 14px, so tapping any of them zoomed the page. A
 * tablet is wide *and* touch-driven. `fine:` asks about the pointer instead,
 * so the denser size lands only where there is a real cursor, and the two
 * conditions stack: a mouse *and* room for it.
 */
/*
 * A field on glass has to read as an inset, and the panel it sits in is
 * already translucent — so the field is *more* opaque than its card, not
 * less. 82% white over the panel puts the worst composite lighter than the
 * panel's own, which is why the placeholder grey still clears 3:1 there.
 * On focus it goes fully solid: the field you are typing in is the one
 * surface on the screen that should not be showing you the wallpaper.
 */
const CONTROL_CLASS =
  "w-full rounded-(--radius-control) border bg-surface/82 backdrop-blur-sm px-3 py-2 coarse:py-2.5 " +
  "text-base text-ink-800 fine:sm:text-sm " +
  "placeholder:text-ink-400 transition-colors focus:border-brand-500 focus:bg-surface " +
  "disabled:bg-ink-100/70 disabled:text-ink-500";

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
export type BadgeTone =
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

const BADGE_DOTS: Record<BadgeTone, string> = {
  neutral: "bg-ink-400",
  brand: "bg-brand-fill",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

/**
 * A status chip.
 *
 * The ground stays an opaque tint rather than becoming glass. It is small and
 * it carries coloured text, and a translucent ground would put that text on a
 * composite that changes with whatever the aurora is doing behind it — the
 * one place in this design where a measured pair is worth more than the
 * effect. The tints are pale enough to belong to the palette anyway.
 *
 * The dot is what the frosted style buys instead: at chip size a colour reads
 * faster as a mark than as a background, and it survives being desaturated,
 * printed, or looked at by someone who cannot separate the two tints.
 */
export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  /** Show the tone as a mark as well as a ground. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", BADGE_DOTS[tone])}
        />
      )}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- Tile */

/**
 * The pictogram tile.
 *
 * This is the element that carries the palette. Every screen is otherwise
 * near-white panels on a soft wash, and without something at full strength
 * the five colours would only ever appear as a blur in the corners of the
 * viewport. The tile is where one of them lands as an actual square of
 * colour, holding a line icon.
 *
 * `hue` picks a stop off the palette's own fan. The default walks the fan by
 * index, so a row of stat cards or a list of vacancies gets five different
 * hues without any caller choosing them — which is what keeps it a system
 * rather than a decision made 60 times.
 *
 * The icon inside takes ink-800, never the tint: a tint measures 1.2–1.8:1
 * and cannot carry a stroke that has to be seen. On the tile ground ink-800
 * measures at worst 8.9:1.
 */
export type TileHue = "pink" | "mauve" | "peri" | "blue" | "sky";

const TILE_HUES: Record<TileHue, string> = {
  pink: "var(--aurora-1)",
  mauve: "var(--aurora-2)",
  peri: "var(--aurora-3)",
  blue: "var(--aurora-4)",
  sky: "var(--aurora-5)",
};

const TILE_ORDER: TileHue[] = ["peri", "pink", "sky", "mauve", "blue"];

const TILE_SIZES = {
  xs: "h-6 w-6 [&>svg]:h-3.5 [&>svg]:w-3.5",
  sm: "h-8 w-8 [&>svg]:h-4 [&>svg]:w-4",
  md: "h-11 w-11 [&>svg]:h-5 [&>svg]:w-5",
  lg: "h-14 w-14 [&>svg]:h-6 [&>svg]:w-6",
} as const;

export function Tile({
  children,
  hue,
  index,
  size = "md",
  className,
}: {
  children: ReactNode;
  /** An explicit stop off the fan. */
  hue?: TileHue;
  /** Or a position in a list, which walks the fan for you. */
  index?: number;
  size?: keyof typeof TILE_SIZES;
  className?: string;
}) {
  const resolved =
    hue ?? TILE_ORDER[(index ?? 0) % TILE_ORDER.length];

  return (
    <span
      aria-hidden
      style={{ "--tint": TILE_HUES[resolved] } as CSSProperties}
      className={clsx(
        "glass-tile inline-flex shrink-0 items-center justify-center",
        TILE_SIZES[size],
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
    brand: "bg-brand-fill",
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
    <div className="flex min-h-dvh items-center justify-center text-brand-600">
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
          "max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-xl outline-none sm:rounded-2xl sm:pb-0",
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-700 coarse:h-11 coarse:w-11"
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
            "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors coarse:py-3",
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
