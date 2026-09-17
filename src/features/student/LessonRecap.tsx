import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { Button } from "@/shared/ui";

interface RecapResponse {
  available: boolean;
  reason?: string;
  recap: string;
  cached?: boolean;
}

/**
 * A short recap, for coming back to a lesson you already watched.
 *
 * The button is only offered when there is something to summarise. The
 * platform holds a link to a video, not the video, so a recap is built from
 * the lesson's own text and the transcript its author pasted — and when there
 * is neither, this says so instead of producing a fluent summary of a video
 * nobody read. A confident wrong recap of a security lesson is worse than
 * none: the learner revises the wrong thing and cannot tell.
 */
export function LessonRecap({
  lessonId,
  available,
}: {
  lessonId: string;
  available: boolean;
}) {
  const { t } = useTranslation();
  const [result, setResult] = useState<RecapResponse | null>(null);

  const ask = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<RecapResponse>(
        `/learning/lessons/${lessonId}/recap/`,
      );
      return data;
    },
    onSuccess: setResult,
  });

  if (!available) {
    return null;
  }

  return (
    <div className="mt-4 rounded-(--radius-card) border border-ink-200/70 bg-ink-100/55 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">
            {t("courses.recapTitle")}
          </p>
          <p className="text-xs text-ink-500">{t("courses.recapHint")}</p>
        </div>
        {!result && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => ask.mutate()}
            loading={ask.isPending}
          >
            {t("courses.recapAsk")}
          </Button>
        )}
      </div>

      {ask.isError && (
        <p className="mt-3 text-sm text-danger">{t("errors.generic")}</p>
      )}

      {result && !result.available && (
        <p className="mt-3 text-sm text-ink-500">
          {t(`courses.recap_${result.reason}`, {
            defaultValue: t("courses.recap_no_text"),
          })}
        </p>
      )}

      {result?.available && (
        <>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-700">
            {result.recap}
          </p>
          {/* Where it came from, because a recap is a claim about the lesson. */}
          <p className="mt-3 text-xs text-ink-400">{t("courses.recapSource")}</p>
        </>
      )}
    </div>
  );
}
