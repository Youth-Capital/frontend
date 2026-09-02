import { useTranslation } from "react-i18next";

import type { MatchReason } from "@/shared/types/api";

const TONE = {
  positive: "border-success-soft bg-success-soft/40 text-success",
  neutral: "border-ink-200 bg-ink-50 text-ink-600",
  negative: "border-danger-soft bg-danger-soft/40 text-danger",
} as const;

/**
 * Renders the "why this score" reasons.
 *
 * The backend sends codes plus data, never sentences, so the same explanation
 * reads correctly in Uzbek, Russian and English — and so it can be audited
 * (TZ §13, prompt §19).
 */
export function MatchExplanation({ reasons }: { reasons: MatchReason[] }) {
  const { t } = useTranslation();

  if (!reasons || reasons.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {reasons.map((reason, index) => {
        const data = reason.data as Record<string, unknown>;
        const skills = data.skills;

        const values: Record<string, unknown> = {
          ...data,
          skills: Array.isArray(skills)
            ? skills
                .map((entry) =>
                  typeof entry === "string"
                    ? entry
                    : `${(entry as { skill: string }).skill} ` +
                      `(${(entry as { current: number }).current}/${(entry as { required: number }).required})`,
                )
                .join(", ")
            : skills,
        };

        return (
          <li
            key={`${reason.code}-${index}`}
            className={`rounded-xl border px-3 py-2 text-sm ${TONE[reason.sentiment]}`}
          >
            {t(`match.reason.${reason.code}`, {
              ...values,
              defaultValue: reason.code,
            })}
          </li>
        );
      })}
    </ul>
  );
}
