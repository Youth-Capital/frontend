import { useTranslation } from "react-i18next";

import { Badge } from "@/shared/ui";
import type { ExternalVacancy } from "@/shared/types/api";

/**
 * A job posted on somebody else's board.
 *
 * The whole card is the link, because there is exactly one thing to do with
 * it. Opening in a new tab is deliberate: a student comparing six listings
 * loses the comparison if each one replaces it, and `rel="noopener"` keeps
 * the opened page from reaching back into this one through `window.opener`.
 *
 * The caveat is printed on the card rather than waiting on the other side of
 * the click. Somebody read these and wrote down what the catch was — "берут
 * со второго курса, но просят год опыта" — and that sentence is worth more
 * than the title it sits under, because it is the part that decides whether
 * the click is worth making.
 */
export function ExternalVacancyCard({ vacancy }: { vacancy: ExternalVacancy }) {
  const { t } = useTranslation();

  const meta = [vacancy.company, vacancy.city].filter(Boolean).join(" · ");
  const terms = [vacancy.schedule, vacancy.pay].filter(Boolean).join(" · ");

  return (
    <a
      href={vacancy.external_url}
      target="_blank"
      rel="noopener noreferrer"
      className="card glass-lift flex flex-col gap-2 p-4 transition-colors fine:hover:border-brand-edge"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-ink-900">{vacancy.title}</p>
          {meta && <p className="mt-0.5 text-xs text-ink-500">{meta}</p>}
        </div>
        <Badge tone={vacancy.fit === "FITS" ? "success" : "neutral"}>
          {t(`jobs.external.fit_${vacancy.fit}`)}
        </Badge>
      </div>

      {terms && <p className="text-sm text-ink-700">{terms}</p>}
      {vacancy.note && <p className="text-sm text-ink-600">{vacancy.note}</p>}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-ink-500">
          {t("jobs.external.collectedOn", { date: vacancy.collected_on })}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
          {t("jobs.external.openOn", { source: vacancy.source_label })}
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 3h7v7M13 3 4 12" />
          </svg>
        </span>
      </div>
    </a>
  );
}
