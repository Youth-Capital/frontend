import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { CardSkeleton } from "@/shared/ui";
import type { MatchResult, Vacancy } from "@/shared/types/api";

/**
 * The strongest match, with the reasons behind the number.
 *
 * A ranked list answers "what is there"; it does not answer "why am I 56% and
 * what would move it". The ring gives the score and the two lists underneath
 * give the argument: these requirements you meet, these you do not, at these
 * levels. The number stops being a verdict and becomes something to check.
 *
 * Every figure comes from the matching engine's own endpoint. Nothing is
 * recomputed in the browser — an explanation that disagreed with the score the
 * employer sees would be worse than no explanation at all.
 */
export function BestMatchCard({
  vacancy,
  isBest = true,
}: {
  vacancy: Vacancy;
  /** The label changes with it: only the top row is the best match. */
  isBest?: boolean;
}) {
  const { t } = useTranslation();

  const match = useQuery({
    queryKey: ["match", vacancy.id],
    queryFn: async () => {
      const { data } = await api.get<MatchResult | null>(
        `/matching/vacancy/${vacancy.id}/`,
      );
      return data;
    },
  });

  if (match.isLoading) return <CardSkeleton rows={5} />;

  const result = match.data;
  const score = result?.overall_score ?? vacancy.my_match?.score ?? 0;
  const met = result?.matched_skills ?? [];
  const missing = result?.missing_skills ?? [];

  return (
    <aside className="rounded-(--radius-card) border border-ink-200 bg-surface p-5">
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
        {isBest ? t("jobs.bestMatch") : t("jobs.thisMatch")}
      </p>

      <div className="mt-4 flex justify-center">
        <Ring value={score} />
      </div>

      <div className="mt-4 text-center">
        <p className="truncate text-sm font-semibold text-ink-900">{vacancy.title}</p>
        <p className="truncate text-xs text-ink-500">{vacancy.company.name}</p>
      </div>

      <div className="mt-5 border-t border-ink-200 pt-4">
        <p className="text-xs font-semibold text-ink-800">{t("jobs.whyMatches")}</p>

        {met.length > 0 && (
          <Group label={t("jobs.strongMatch")}>
            {met.slice(0, 4).map((skill) => (
              <li key={skill.skill_id} className="flex items-center gap-2 text-xs">
                <Mark ok />
                <span className="min-w-0 flex-1 truncate text-ink-700">{skill.skill}</span>
                {skill.verified && (
                  <span className="shrink-0 text-[10px] font-medium text-success">
                    {t("skills.verified")}
                  </span>
                )}
              </li>
            ))}
          </Group>
        )}

        {missing.length > 0 && (
          <Group label={t("jobs.youMiss")}>
            {missing.slice(0, 4).map((skill) => (
              <li key={skill.skill_id} className="flex items-center gap-2 text-xs">
                <Mark />
                <span className="min-w-0 flex-1 truncate text-ink-700">{skill.skill}</span>
                <span className="shrink-0 tabular-nums text-[10px] text-ink-500">
                  {skill.current_level}/{skill.required_level}
                </span>
              </li>
            ))}
          </Group>
        )}

        {met.length === 0 && missing.length === 0 && (
          <p className="mt-2 text-xs text-ink-500">{t("jobs.noBreakdown")}</p>
        )}
      </div>

      <Link
        to={`/student/jobs/${vacancy.id}`}
        className="mt-5 block rounded-(--radius-control) bg-brand-600 py-2.5 text-center text-sm font-semibold text-on-colour hover:bg-brand-700"
      >
        {t("jobs.openVacancy")}
      </Link>
    </aside>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </p>
      <ul className="mt-1.5 space-y-1.5">{children}</ul>
    </div>
  );
}

/** A tick or a cross — shape as well as colour, so it survives being unseen. */
function Mark({ ok = false }: { ok?: boolean }) {
  return (
    <span
      className={
        ok
          ? "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
          : "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-400"
      }
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d={ok ? "M5 13l4 4L19 7" : "M6 6l12 12M18 6L6 18"}
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function Ring({ value }: { value: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden>
      <circle cx="64" cy="64" r={radius} fill="none" strokeWidth="11" className="stroke-ink-100" />
      <circle
        cx="64"
        cy="64"
        r={radius}
        fill="none"
        strokeWidth="11"
        strokeLinecap="round"
        className="stroke-brand-600"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(Math.max(value, 0), 100) / 100)}
        transform="rotate(-90 64 64)"
      />
      <text
        x="64"
        y="64"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink-900 text-2xl font-semibold tabular-nums"
      >
        {value}%
      </text>
    </svg>
  );
}
