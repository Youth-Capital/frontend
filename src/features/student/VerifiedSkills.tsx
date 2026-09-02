import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { CardSkeleton } from "@/shared/ui";
import type { Paginated, UserSkill } from "@/shared/types/api";

/**
 * The proven part of the profile, on the page an employer reads.
 *
 * A CV lists what someone says about themselves. This block is the other kind
 * of claim — the skills where the evidence came from a test, a mentor or an
 * employer rather than from the student — so it is kept separate and named
 * for what makes it different.
 *
 * Skills are ordered by level, and each says where its evidence came from.
 * A verified skill with no visible source would be asking for the same trust
 * as a self-assessment, which is the thing this product exists to replace.
 */
export function VerifiedSkills() {
  const { t } = useTranslation();

  const skills = useQuery({
    queryKey: ["my-skills"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<UserSkill>>("/me/skills/?page_size=100");
      return data.results;
    },
  });

  if (skills.isLoading) return <CardSkeleton rows={3} />;

  const verified = (skills.data ?? [])
    .filter((skill) => skill.is_verified)
    .sort((a, b) => b.proficiency - a.proficiency);

  return (
    <section className="rounded-(--radius-card) border border-ink-200 bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink-900">{t("cv.verifiedSkills")}</h2>
        <Link
          to="/student/skills"
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          {t("nav.skills")} →
        </Link>
      </div>

      {verified.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          {t("cv.noVerifiedSkills")}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {verified.map((skill) => (
            <li key={skill.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-xs font-medium text-ink-800">
                  {skill.skill_name}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-800">
                  {skill.proficiency}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(skill.proficiency, 100)}%` }}
                />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-500">
                <ShieldGlyph />
                {t(`evidence.${skill.best_source}`, {
                  defaultValue: skill.best_source,
                })}
                {" · "}
                {skill.category_name}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ShieldGlyph() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-success"
    >
      <path
        d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.7"
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
