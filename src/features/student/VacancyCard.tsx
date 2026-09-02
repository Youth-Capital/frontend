import { useTranslation } from "react-i18next";

import { formatSalary, matchTone } from "@/shared/lib/format";
import type { Vacancy } from "@/shared/types/api";

/**
 * One vacancy, as a card rather than a table row.
 *
 * A row fits more on screen; a card gives the company somewhere to be. Who is
 * hiring is half of what a young person is deciding on, and in a dense list it
 * was a grey clause after the job title.
 */
export function VacancyCard({
  vacancy,
  onOpen,
  selected = false,
}: {
  vacancy: Vacancy;
  onOpen: () => void;
  selected?: boolean;
}) {
  const { t } = useTranslation();

  const chips = [
    t(`jobs.type_${vacancy.employment_type}`),
    t(`jobs.mode_${vacancy.work_mode}`),
    vacancy.city || vacancy.region_name,
    formatSalary(
      vacancy.salary_min,
      vacancy.salary_max,
      vacancy.currency,
      t("jobs.salaryHidden"),
    ),
  ].filter(Boolean) as string[];

  const score = vacancy.my_match?.score;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? "true" : undefined}
      className={
        selected
          ? "flex w-full gap-3.5 rounded-(--radius-card) border border-brand-400 bg-brand-50 p-4 text-left transition-colors"
          : "flex w-full gap-3.5 rounded-(--radius-card) border border-ink-200 bg-surface p-4 text-left transition-colors hover:border-brand-400"
      }
    >
      <Logo vacancy={vacancy} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{vacancy.title}</p>
            <p className="flex items-center gap-1 truncate text-xs text-ink-500">
              {vacancy.company.name}
              {vacancy.company.is_verified && <VerifiedGlyph />}
            </p>
          </div>

          {score !== undefined && (
            <span className="shrink-0 text-right">
              <span
                className={
                  matchTone(score) === "success"
                    ? "text-sm font-semibold tabular-nums text-success"
                    : matchTone(score) === "warning"
                      ? "text-sm font-semibold tabular-nums text-warning"
                      : "text-sm font-semibold tabular-nums text-ink-600"
                }
              >
                {score}%
              </span>
              <span className="block text-[10px] text-ink-400">{t("jobs.match")}</span>
            </span>
          )}
        </div>

        {vacancy.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-600">
            {vacancy.description}
          </p>
        )}

        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] text-ink-600"
            >
              {chip}
            </li>
          ))}
          {vacancy.min_experience_months === 0 && (
            <li className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] text-success">
              {t("jobs.noExperienceRequired")}
            </li>
          )}
          {vacancy.my_application && (
            <li className="rounded-full bg-info-soft px-2.5 py-1 text-[11px] text-info">
              {t(`applications.status.${vacancy.my_application.status}`)}
            </li>
          )}
        </ul>
      </div>
    </button>
  );
}

/** The company's logo, or its initials — never an empty grey square. */
function Logo({ vacancy }: { vacancy: Vacancy }) {
  if (vacancy.company.logo) {
    return (
      <img
        src={vacancy.company.logo}
        alt=""
        className="h-11 w-11 shrink-0 rounded-xl object-cover"
      />
    );
  }

  const initials = vacancy.company.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-xs font-bold text-brand-700">
      {initials}
    </span>
  );
}

function VerifiedGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-success"
    >
      <path
        d="M12 3l2.2 1.6 2.7-.2.9 2.6 2.2 1.6-1 2.6 1 2.6-2.2 1.6-.9 2.6-2.7-.2L12 21l-2.2-1.6-2.7.2-.9-2.6L4 15.4l1-2.6-1-2.6 2.2-1.6.9-2.6 2.7.2L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
