import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { Badge, Button } from "@/shared/ui";

interface Question {
  index: number;
  question: string;
  options: string[];
}

interface Result {
  index: number;
  chosen: number | null;
  correct_option: number;
  is_correct: boolean;
  why: string;
}

/**
 * A few questions at the end, to find out whether the lesson landed.
 *
 * The questions arrive without their answers and are marked on the server —
 * a quiz whose answer key is in the page measures nothing, and the page is the
 * first place anyone looks. So this component genuinely does not know which
 * option is right until the attempt comes back.
 *
 * A wrong answer is shown with the reason. Marking somebody wrong and moving
 * on teaches nothing; the whole point of asking is the sentence that follows.
 *
 * Retrying is allowed and the best attempt stands. The question is whether the
 * learner understands it now, not whether they understood it first time.
 */
export function LessonCheck({
  lessonId,
  available,
  onPassed,
}: {
  lessonId: string;
  available: boolean;
  onPassed?: (score: number) => void;
}) {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Record<number, number>>({});
  const [results, setResults] = useState<Result[] | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const start = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{
        available: boolean;
        reason?: string;
        questions: Question[];
      }>(`/learning/lessons/${lessonId}/check/`);
      return data;
    },
    onSuccess: (data) => {
      if (data.available) {
        setQuestions(data.questions);
        setReason(null);
      } else {
        setQuestions(null);
        setReason(data.reason ?? "no_text");
      }
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const answers: Record<string, number> = {};
      for (const [index, option] of Object.entries(chosen)) {
        answers[index] = option;
      }
      const { data } = await api.post<{
        stale: boolean;
        score: number;
        results: Result[];
      }>(`/learning/lessons/${lessonId}/check/submit/`, { answers });
      return data;
    },
    onSuccess: (data) => {
      setResults(data.results);
      setScore(data.score);
      onPassed?.(data.score);
    },
  });

  if (!available) return null;

  const answeredAll =
    questions !== null && Object.keys(chosen).length === questions.length;

  return (
    <div className="mt-4 rounded-(--radius-card) border border-ink-200 bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">
            {t("courses.checkTitle")}
          </p>
          <p className="text-xs text-ink-500">{t("courses.checkHint")}</p>
        </div>
        {questions === null && reason === null && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => start.mutate()}
            loading={start.isPending}
          >
            {t("courses.checkStart")}
          </Button>
        )}
        {score !== null && (
          <Badge tone={score >= 67 ? "success" : score >= 34 ? "warning" : "danger"}>
            {score}%
          </Badge>
        )}
      </div>

      {start.isError && (
        <p className="mt-3 text-sm text-danger">{t("errors.generic")}</p>
      )}

      {reason && (
        <p className="mt-3 text-sm text-ink-500">
          {t(`courses.check_${reason}`, {
            defaultValue: t("courses.recap_no_text"),
          })}
        </p>
      )}

      {questions?.map((item) => {
        const result = results?.find((row) => row.index === item.index);
        return (
          <fieldset key={item.index} className="mt-4">
            <legend className="mb-2 text-sm font-medium text-ink-800">
              {item.index + 1}. {item.question}
            </legend>
            <div className="flex flex-col gap-1.5">
              {item.options.map((option, optionIndex) => {
                // Before marking, the page knows nothing. After it, the right
                // answer is shown whether or not the learner picked it.
                const picked = chosen[item.index] === optionIndex;
                const isRight = result && result.correct_option === optionIndex;
                const isWrongPick = result && picked && !result.is_correct;

                return (
                  <label
                    key={optionIndex}
                    className={[
                      "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                      isRight
                        ? "border-success bg-success-soft/40 text-ink-900"
                        : isWrongPick
                          ? "border-danger bg-danger-soft/40 text-ink-900"
                          : picked
                            ? "border-brand-400 text-ink-900"
                            : "border-ink-200 text-ink-700 hover:border-brand-400",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name={`q-${item.index}`}
                      checked={picked}
                      disabled={Boolean(results)}
                      onChange={() =>
                        setChosen({ ...chosen, [item.index]: optionIndex })
                      }
                    />
                    <span className="min-w-0">{option}</span>
                  </label>
                );
              })}
            </div>

            {result && result.why && (
              <p className="mt-2 text-xs text-ink-600">{result.why}</p>
            )}
          </fieldset>
        );
      })}

      {questions && !results && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={() => submit.mutate()}
            disabled={!answeredAll || submit.isPending}
            loading={submit.isPending}
          >
            {t("courses.checkSubmit")}
          </Button>
        </div>
      )}

      {results && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-600">
            {score === 100
              ? t("courses.checkAllRight")
              : t("courses.checkReview")}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setResults(null);
              setScore(null);
              setChosen({});
            }}
          >
            {t("courses.checkRetry")}
          </Button>
        </div>
      )}
    </div>
  );
}
