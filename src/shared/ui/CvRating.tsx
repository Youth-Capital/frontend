import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { Badge, ProgressBar, type BadgeTone } from "@/shared/ui";

export interface CvRatingComponent {
  key: string;
  score: number;
  max: number;
  facts?: { code: string; data?: Record<string, unknown> }[];
  tips?: { code: string; severity: string; data?: Record<string, unknown> }[];
}

export interface CvRating {
  overall: number;
  band: string;
  components: CvRatingComponent[];
  tips?: { code: string; severity: string; gain?: number; data?: Record<string, unknown> }[];
}

/**
 * The band, not the number, is what a reader acts on.
 *
 * Two candidates at 71 and 74 are the same candidate; 44 and 74 are not. The
 * colour says which comparison is worth making, and the number stays there for
 * anyone who wants it.
 */
export function bandTone(band: string): BadgeTone {
  if (band === "EXCELLENT") return "success";
  if (band === "STRONG") return "brand";
  if (band === "FAIR") return "warning";
  return "danger";
}

/** Compact form: the score and its band, for a list row or a card header. */
export function CvRatingBadge({
  score,
  band,
  size = "md",
}: {
  score: number | null | undefined;
  band?: string;
  size?: "sm" | "md";
}) {
  const { t } = useTranslation();

  if (score === null || score === undefined) {
    return <span className="text-xs text-ink-400">{t("cvRating.none")}</span>;
  }

  const resolved = band ?? scoreBand(score);
  const tones: Record<BadgeTone, string> = {
    success: "bg-success-soft text-success",
    brand: "bg-brand-50 text-brand-700",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    neutral: "bg-ink-100 text-ink-600",
    info: "bg-info-soft text-info",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-baseline gap-1.5 rounded-full font-semibold tabular-nums",
        tones[bandTone(resolved)],
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
      )}
      title={t(`cvRating.band.${resolved}`)}
    >
      {score}
      <span className="text-[0.7em] font-medium opacity-70">/ 100</span>
    </span>
  );
}

/** Client-side band, for rows that carry a score without one. */
function scoreBand(score: number): string {
  if (score >= 85) return "EXCELLENT";
  if (score >= 70) return "STRONG";
  if (score >= 50) return "FAIR";
  if (score >= 30) return "WEAK";
  return "EMPTY";
}

/**
 * Full form: the score, what it is made of, and — for the person who owns the
 * CV — what would raise it.
 *
 * The breakdown is not decoration. "Your CV scores 61" is not feedback; "20 of
 * your 25 proof points are missing because nothing is verified" is.
 */
export function CvRatingPanel({
  rating,
  showTips = true,
}: {
  rating: CvRating;
  showTips?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
            {t("cvRating.title")}
          </p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums text-ink-900">
              {rating.overall}
            </span>
            <span className="text-sm text-ink-400">/ 100</span>
          </p>
        </div>
        <Badge tone={bandTone(rating.band)} className="mb-1.5">
          {t(`cvRating.band.${rating.band}`)}
        </Badge>
      </div>

      <ul className="flex flex-col gap-3">
        {rating.components.map((component) => {
          const share = component.max ? (100 * component.score) / component.max : 0;
          return (
            <li key={component.key}>
              <ProgressBar
                value={share}
                tone={share >= 70 ? "success" : share >= 40 ? "brand" : "warning"}
                size="sm"
                label={t(`cvRating.component.${component.key}`)}
              />
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-xs text-ink-500">
                  {component.facts
                    ?.map((fact) =>
                      t(`cvRating.fact.${fact.code.replace("cv.fact.", "")}`, {
                        ...fact.data,
                        defaultValue: "",
                      }),
                    )
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <span className="shrink-0 text-xs font-medium tabular-nums text-ink-600">
                  {component.score}/{component.max}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {showTips && (rating.tips?.length ?? 0) > 0 && (
        <div className="rounded-(--radius-card) border border-ink-200/70 bg-ink-100/55 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {t("cvRating.howToRaise")}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {rating.tips?.map((tip) => (
              <li key={tip.code} className="flex items-start gap-2 text-sm">
                <span
                  className={clsx(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    tip.severity === "high"
                      ? "bg-danger"
                      : tip.severity === "medium"
                        ? "bg-warning"
                        : "bg-ink-300",
                  )}
                  aria-hidden
                />
                <span className="text-ink-700">
                  {t(`cvRating.tip.${tip.code.replace("cv.", "")}`, {
                    ...tip.data,
                    defaultValue: tip.code,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
