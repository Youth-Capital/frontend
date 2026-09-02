import type { ReactNode } from "react";

/**
 * The top of every page.
 *
 * Forty-three screens had grown their own copy of the same three lines, which
 * is why they had quietly drifted apart: some carried a subtitle, some did
 * not, the action sat in a different place on each. One component makes them
 * one family, and gives the visual language somewhere to live on pages that
 * are otherwise plain lists and forms.
 *
 * The signature is the rule underneath. It starts as a short solid segment in
 * the brand colour and fades out across the page — the same "moves forward,
 * then opens up" idea as the pathway on the landing hero, at the smallest
 * scale it can be drawn. It is one detail repeated everywhere rather than an
 * ornament competing with the content, which is what a system is.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  mark,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Buttons or links belonging to the page as a whole. */
  action?: ReactNode;
  /** A small figure for pages that carry one; most do not need it. */
  mark?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {mark && <span className="mt-0.5 shrink-0 text-brand-400">{mark}</span>}
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold leading-tight text-ink-900">
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <span
        aria-hidden
        className="h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, var(--color-brand-500) 0, var(--color-brand-500) 3.5rem, var(--color-ink-200) 3.5rem, transparent 100%)",
        }}
      />
    </header>
  );
}
