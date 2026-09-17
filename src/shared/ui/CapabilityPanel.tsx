import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { Card, CardHeader, CardSkeleton, EmptyState, ProgressBar } from "@/shared/ui";

export interface CapabilityCompetency {
  skill_id: string;
  skill: string;
  category: string;
  score: number;
  confidence: number;
  source: string;
  self_reported: boolean;
  assessed_at: string | null;
}

/**
 * What `/ai/capability/` returns. The `hard` half is still in the response —
 * the report is shared with the AI assistant — it is just not drawn here.
 */
export interface CapabilityReport {
  user_id: string;
  hard: {
    average: number;
    skill_count: number;
    verified_count: number;
    top: { skill: string; score: number; verified: boolean }[];
    weakest: { skill: string; score: number }[];
  };
  soft: {
    average: number;
    competency_count: number;
    competencies: CapabilityCompetency[];
    strongest: CapabilityCompetency[];
    weakest: CapabilityCompetency[];
    last_assessment: {
      test_id: string;
      title: string;
      submitted_at: string | null;
      percentage: number;
    } | null;
  };
  balance: string;
  notes: { code: string; data?: Record<string, unknown> }[];
  next_actions: { code: string; skill?: string; from?: number; to?: number }[];
}

/**
 * The notes and actions this panel is allowed to show.
 *
 * An allow-list, not a deny-list. The server also reports on technical skills
 * — the hard/soft gap, "no technical skill verified", "take a technical test" —
 * and those were removed from this card on purpose: technical skills already
 * have the whole list below on the skills page, and on a candidate's page. A
 * deny-list would let the next hard-skill code the server learns to emit slip
 * straight back in, rendered as its raw code.
 */
const SOFT_NOTES = new Set([
  "capability.take_soft_test",
  "capability.soft_strength",
  "capability.soft_gap",
  "capability.soft_all_self_reported",
]);

const SOFT_ACTIONS = new Set(["action.take_soft_skill_test", "action.develop_competency"]);

/**
 * Soft skills: what the situational assessment found.
 *
 * This card used to set hard and soft ability side by side, with a badge
 * comparing the two. Technical skills are listed in full elsewhere on the same
 * pages, so here they only repeated a number and pulled the eye away from the
 * one thing no other screen shows — the competencies.
 *
 * Used by the student about themselves and by an employer about a candidate
 * they can already reach; `userId` switches between the two.
 */
export function CapabilityPanel({
  userId,
  compact = false,
}: {
  userId?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  const report = useQuery({
    queryKey: ["capability", userId ?? "me"],
    queryFn: async () => {
      const { data } = await api.get<CapabilityReport>("/ai/capability/", {
        params: userId ? { user: userId } : undefined,
      });
      return data;
    },
  });

  if (report.isLoading) return <CardSkeleton rows={5} />;
  if (!report.data) return null;

  const { soft, balance } = report.data;
  // Set by the server when there are fewer than four competencies — decided by
  // the soft half alone, so it is still the right empty state here.
  const noProfile = balance === "insufficient_data";

  const notes = report.data.notes.filter((note) => SOFT_NOTES.has(note.code));
  const seen = new Set<string>();
  const actions = report.data.next_actions.filter((action) => {
    if (!SOFT_ACTIONS.has(action.code)) return false;
    const key = `${action.code}-${action.skill ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <Card>
      <CardHeader title={t("capability.title")} subtitle={t("capability.subtitle")} />

      {noProfile ? (
        <EmptyState
          title={t("capability.noProfile")}
          description={t("capability.noProfileHint")}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="rounded-(--radius-card) border border-ink-200 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              {t("capability.average")}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-info">
              {soft.average}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              {t("capability.softHint", { count: soft.competency_count })}
            </p>
          </div>

          {!compact && soft.competencies.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                {t("capability.competencies")}
              </p>
              <ul className="flex flex-col gap-2.5">
                {soft.competencies.map((row) => (
                  <li key={row.skill_id}>
                    <ProgressBar
                      value={row.score}
                      showLabel
                      size="sm"
                      tone={row.score >= 70 ? "success" : row.score >= 55 ? "brand" : "warning"}
                      label={row.skill}
                    />
                    {row.self_reported && (
                      /* ink-500, not ink-400: this is text somebody reads,
                         and ink-400 measures 3.07:1 on the glass card. */
                      <p className="mt-0.5 text-[11px] text-ink-500">
                        {t("capability.selfReported")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {notes.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {notes.map((note, index) => (
                <li
                  key={`${note.code}-${index}`}
                  className="flex items-start gap-2 text-sm text-ink-700"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300"
                    aria-hidden
                  />
                  <span>
                    {t(`capability.note.${note.code.replace("capability.", "")}`, {
                      ...note.data,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!compact && actions.length > 0 && (
            <div className="rounded-(--radius-card) border border-ink-200/70 bg-ink-100/55 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {t("capability.whatNext")}
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {actions.map((action, index) => (
                  <li key={`${action.code}-${index}`} className="text-sm text-ink-700">
                    {t(`capability.action.${action.code.replace("action.", "")}`, {
                      ...action,
                    })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
