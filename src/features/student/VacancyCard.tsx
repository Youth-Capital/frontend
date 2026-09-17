import { useTranslation } from "react-i18next";

import { formatSalary, matchTone } from "@/shared/lib/format";
import { Tile } from "@/shared/ui";
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

  /*
   * Why this vacancy is being shown, not how well it fits.
   *
   * The card used to carry one number, and one number cannot say whether 88%
   * is 88% of a job you asked for. Shown only when the platform actually has
   * a reason: a learner who has declared no interests is not told their feed
   * was filtered, because it was not.
   */
  const reason = vacancy.my_match?.relevance_known
    ? vacancy.my_match.relevance_reason
    : "";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? "true" : undefined}
      /*
       * Selection is a brand edge and a step of elevation, not a coloured
       * fill. A fill would have to be opaque to be seen, and an opaque row in
       * a list of frosted ones reads as a different kind of thing rather than
       * as the same thing, chosen.
       */
      className={
        selected
          ? "card glass-lift flex w-full items-center gap-3.5 border-brand-400 p-4 text-left shadow-md"
          : "card glass-lift flex w-full items-center gap-3.5 p-4 text-left"
      }
    >
      <Logo vacancy={vacancy} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{vacancy.title}</p>
        <p className="flex items-center gap-1 truncate text-xs text-ink-500">
          {vacancy.company.name}
          {vacancy.company.is_verified && <VerifiedGlyph />}
        </p>

        {reason && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-accent-ink">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-accent-solid" />
            {t(`jobs.why_${reason}`, { defaultValue: "" })}
          </p>
        )}

        {vacancy.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-600">
            {vacancy.description}
          </p>
        )}

        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <li
              key={chip}
              className="glass-chip rounded-full px-2.5 py-1 text-[11px] text-ink-600"
            >
              {chip}
            </li>
          ))}
          {/*
            The two chips that carry meaning keep an opaque tint instead. Their
            text is coloured, and a frosted ground would put that text on a
            composite that moves with whatever the aurora paints behind the row
            — the same call Badge makes, for the same reason.
          */}
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

      {score !== undefined && <MatchRing score={score} label={t("jobs.match")} />}
    </button>
  );
}

/**
 * The company's logo, or its initials — never an empty grey square.
 *
 * The initials sit on a palette tile now rather than a flat brand tint: in a
 * list of near-white panels the tile is the only place a palette colour lands
 * at full strength. The hue comes from the company's own name rather than from
 * the row's position, so filtering or re-sorting the list does not repaint an
 * employer — a mark that changes colour is not a mark.
 */
function Logo({ vacancy }: { vacancy: Vacancy }) {
  if (vacancy.company.logo) {
    return (
      <img
        src={vacancy.company.logo}
        alt=""
        className="h-14 w-14 shrink-0 rounded-(--radius-tile) object-cover"
      />
    );
  }

  const initials = vacancy.company.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <Tile index={hue(vacancy.company.name)} size="lg" className="text-sm font-bold">
      {initials}
    </Tile>
  );
}

/** A stable position on the palette fan for one name. Tile does the modulo. */
function hue(name: string): number {
  let sum = 0;
  for (let index = 0; index < name.length; index += 1) {
    sum += name.charCodeAt(index);
  }
  return sum;
}

/**
 * The match as a ring rather than a bare percentage.
 *
 * In a scannable list a number has to be read one row at a time, while a
 * filled arc is comparable straight down the column. The figure stays printed
 * inside it: the ring is a second encoding of the same number, not a
 * replacement for it, and it is the one that survives being glanced at.
 *
 * The tone thresholds are the shared ones — nothing about the score is decided
 * here.
 */
function MatchRing({ score, label }: { score: number; label: string }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(score, 0), 100);
  const tone = matchTone(score);

  return (
    <span className="flex shrink-0 flex-col items-center gap-0.5">
      <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden>
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="4"
          className="stroke-ink-200"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          /* Fills and meters, so 3:1: success 4.61, warning 4.61 and brand-500
             4.06 measured on the glass composite. */
          className={
            tone === "success"
              ? "stroke-success"
              : tone === "warning"
                ? "stroke-warning"
                : "stroke-brand-edge"
          }
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          transform="rotate(-90 24 24)"
        />
        <text
          x="24"
          y="24"
          textAnchor="middle"
          dominantBaseline="central"
          className={
            tone === "success"
              ? "fill-success text-[11px] font-semibold tabular-nums"
              : tone === "warning"
                ? "fill-warning text-[11px] font-semibold tabular-nums"
                : "fill-ink-600 text-[11px] font-semibold tabular-nums"
          }
        >
          {score}%
        </text>
      </svg>
      <span className="text-[10px] text-ink-400">{label}</span>
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
