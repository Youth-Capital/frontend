import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBlocker, useNavigate, useParams } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { matchTone } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Modal,
  ProgressBar,
  Spinner,
} from "@/shared/ui";
import "@/shared/styles/deep.css";
import type { TestAttempt } from "@/shared/types/api";

type Answers = Record<string, { option_ids: string[]; text: string }>;

export default function TestRunnerPage() {
  const { testId } = useParams<{ testId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [result, setResult] = useState<TestAttempt | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  /*
   * Leaving mid-test costs the answers, so it asks first.
   *
   * The exact cost, because the warning has to be true: the answers given so
   * far live in this component and are sent to the server once, on submit —
   * navigate away and every one of them is gone. The attempt itself survives
   * and can be resumed, but its clock never stopped, so what comes back is an
   * empty answer sheet with less time on it.
   *
   * `useBlocker` catches anything the router does — the mark in the header,
   * the profile menu, the back button. It cannot catch a closed tab, which is
   * what the beforeunload handler below is for; that one shows the browser's
   * own dialogue and cannot be worded by us.
   */
  const inProgress = attempt !== null && result === null;
  const blocker = useBlocker(inProgress);

  useEffect(() => {
    if (!inProgress) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      //: Chrome ignores a custom string and shows its own text; assigning
      //: returnValue is still what arms the dialogue at all.
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [inProgress]);

  const start = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<TestAttempt>(
        `/assessment/tests/${testId}/start/`,
      );
      return data;
    },
    onSuccess: (data) => setAttempt(data),
    onError: (caught) => setError(describeError(caught)),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!attempt) throw new Error("no attempt");
      const payload = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: questionId,
        option_ids: answer.option_ids,
        text: answer.text,
      }));
      const { data } = await api.post<TestAttempt>(
        `/assessment/attempts/${attempt.id}/submit/`,
        { answers: payload },
      );
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      setConfirmOpen(false);
      // Grading can verify a skill, which cascades everywhere.
      void queryClient.invalidateQueries({ queryKey: ["my-skills"] });
      void queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["my-attempts"] });
    },
    onError: (caught) => {
      setError(describeError(caught));
      setConfirmOpen(false);
    },
  });

  // Start once on mount.
  useEffect(() => {
    if (testId && !attempt && !start.isPending && !start.isError) {
      start.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // Countdown. The server also enforces `expires_at`; this is the visible half.
  useEffect(() => {
    if (!attempt?.expires_at || result) return;
    const deadline = new Date(attempt.expires_at).getTime();

    const tick = () => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) submit.mutate();
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.expires_at, result]);

  const questions = useMemo(() => attempt?.questions ?? [], [attempt]);
  const current = questions[index];
  const answeredCount = Object.values(answers).filter(
    (answer) => answer.option_ids.length > 0 || answer.text.trim() !== "",
  ).length;

  const toggleOption = (questionId: string, optionId: string, multiple: boolean) => {
    setAnswers((previous) => {
      const existing = previous[questionId] ?? { option_ids: [], text: "" };
      const selected = multiple
        ? existing.option_ids.includes(optionId)
          ? existing.option_ids.filter((id) => id !== optionId)
          : [...existing.option_ids, optionId]
        : [optionId];
      return { ...previous, [questionId]: { ...existing, option_ids: selected } };
    });
  };

  if (start.isPending) {
    return (
      <div className="flex justify-center py-20 text-brand-600">
        <Spinner size={28} />
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <ErrorState
        title={error}
        onRetry={() => navigate("/student/tests")}
        retryLabel={t("common.back")}
      />
    );
  }

  /* ---------------------------------------------------------------- result */
  if (result) {
    /*
     * A soft-skill assessment is not an exam and must not read like one.
     *
     * There is no pass mark, so a percentage presented as a verdict is a lie
     * told to a seventeen-year-old about their character. The number they get
     * is the competency profile; the headline says the assessment is done.
     */
    const isSoft = result.test_type === "SOFT_SKILL";

    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {/*
          The verdict on the deep surface. A pass here becomes evidence with
          the heaviest weight in the whole model, so the moment is worth a
          surface of its own rather than another white card in the stack.

          The success and danger tokens are not used on it: both are solved
          against a pale page, and neither clears 4.5:1 on the band's #302357.
          The pink already lives on this surface and carries the pass; a fail
          is stated in words on the plain ink, which needs no colour to be
          understood.
        */}
        <section className="deep rounded-(--radius-card) px-6 py-10 text-center">
          <p
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--band-dim)" }}
          >
            {t("tests.resultTitle")}
          </p>

          {isSoft ? (
            <>
              <p
                className="mt-3 text-3xl font-semibold"
                style={{ color: "var(--band-ink)" }}
              >
                {t("tests.soft.done")}
              </p>
              <p className="mt-2 text-sm" style={{ color: "var(--band-muted)" }}>
                {t("tests.soft.doneHint")}
              </p>
            </>
          ) : (
            <>
              <p
                className="mt-3 text-6xl font-semibold tabular-nums"
                style={{
                  color: result.passed ? "var(--band-accent)" : "var(--band-ink)",
                }}
              >
                {result.percentage}%
              </p>

              <p className="mt-2 text-sm" style={{ color: "var(--band-muted)" }}>
                {t("tests.correctAnswers", {
                  correct: result.score,
                  total: result.max_score,
                })}
              </p>

              <p
                className="mt-5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold"
                style={
                  result.passed
                    ? { background: "var(--band-accent)", color: "var(--band-on-accent)" }
                    : {
                        color: "var(--band-ink)",
                        background:
                          "color-mix(in oklab, var(--band-dim) 30%, transparent)",
                      }
                }
              >
                {result.passed && <TrophyGlyph />}
                {result.passed ? t("tests.passed") : t("tests.failed")}
              </p>
            </>
          )}
        </section>

        {result.skill_results.length > 0 && (
          <Card>
            <CardHeader
              title={isSoft ? t("tests.soft.byCompetency") : t("tests.bySkill")}
              subtitle={isSoft ? t("tests.soft.byCompetencyHint") : undefined}
            />
            <div className="flex flex-col gap-3">
              {result.skill_results.map((skill) => (
                <ProgressBar
                  key={skill.skill}
                  label={
                    isSoft
                      ? skill.skill_name
                      : `${skill.skill_name} (${skill.questions_correct}/${skill.questions_total})`
                  }
                  value={skill.percentage}
                  showLabel
                  tone={matchTone(skill.percentage)}
                />
              ))}
            </div>
          </Card>
        )}

        {result.review && (
          <Card>
            <CardHeader
              title={isSoft ? t("tests.soft.reviewTitle") : t("tests.reviewAnswers")}
            />
            <ul className="flex flex-col gap-3">
              {result.review.map((item) => (
                <li
                  key={item.question_id}
                  className={
                    isSoft
                      ? "rounded-xl border border-ink-200/70 bg-ink-100/55 p-3"
                      : item.is_correct
                        ? "rounded-xl border border-success-soft bg-success-soft/30 p-3"
                        : "rounded-xl border border-danger-soft bg-danger-soft/30 p-3"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-ink-800">{item.question}</p>
                    {isSoft ? (
                      /* Points, not a verdict: how much of the competency the
                         chosen action showed. */
                      <Badge tone="neutral">
                        {t("tests.soft.pointsAwarded", {
                          points: item.points_awarded,
                        })}
                      </Badge>
                    ) : (
                      <Badge tone={item.is_correct ? "success" : "danger"}>
                        {item.is_correct ? t("tests.correct") : t("tests.incorrect")}
                      </Badge>
                    )}
                  </div>
                  {item.explanation && (
                    <p className="mt-2 text-xs text-ink-600">
                      <span className="font-medium">{t("tests.explanation")}: </span>
                      {item.explanation}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={() => navigate("/student/tests")}>
            {t("nav.tests")}
          </Button>
          <Button onClick={() => navigate("/student/skills")}>
            {t("nav.skills")}
          </Button>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------------- taking */
  if (!attempt || !current) {
    return <ErrorState title={t("errors.loadFailed")} />;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">{attempt.test_title}</h1>
          <p className="text-sm text-ink-500">
            {t("tests.question", { current: index + 1, total: questions.length })}
          </p>
        </div>
        {secondsLeft !== null && (
          <div
            className={
              secondsLeft < 60
                ? "rounded-xl bg-danger-soft px-3 py-2 text-sm font-semibold tabular-nums text-danger"
                : "rounded-xl bg-ink-100 px-3 py-2 text-sm font-semibold tabular-nums text-ink-700"
            }
          >
            {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, "0")}
          </div>
        )}
      </div>

      <ProgressBar value={((index + 1) / questions.length) * 100} size="sm" />

      <Card>
        <p className="text-base font-medium text-ink-900">{current.text}</p>
        {current.type === "SITUATIONAL" && (
          /* Said before they answer, not after. A person who thinks they are
             being graded picks the answer they think is wanted, and the
             instrument measures nothing. */
          <p className="mt-2 text-sm text-ink-500">{t("tests.soft.noRightAnswer")}</p>
        )}
        <div className="mt-4 flex flex-col gap-2">
          {current.options.map((option) => {
            const selected =
              answers[current.id]?.option_ids.includes(option.id) ?? false;
            return (
              <label
                key={option.id}
                className={
                  selected
                    ? "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-brand-500 bg-brand-50 p-3"
                    : "flex cursor-pointer items-center gap-3 rounded-xl border border-ink-300 p-3 hover:border-ink-400"
                }
              >
                <input
                  type={current.type === "MULTIPLE" ? "checkbox" : "radio"}
                  name={current.id}
                  checked={selected}
                  onChange={() =>
                    toggleOption(current.id, option.id, current.type === "MULTIPLE")
                  }
                />
                <span className="text-sm text-ink-800">{option.text}</span>
              </label>
            );
          })}

          {current.type === "SHORT_ANSWER" && (
            <input
              type="text"
              value={answers[current.id]?.text ?? ""}
              onChange={(event) =>
                setAnswers((previous) => ({
                  ...previous,
                  [current.id]: {
                    option_ids: [],
                    text: event.target.value,
                  },
                }))
              }
              className="w-full rounded-xl border border-ink-300 px-3 py-2 text-sm"
            />
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
        >
          {t("common.back")}
        </Button>

        <span className="text-sm text-ink-500">
          {answeredCount} / {questions.length}
        </span>

        {index < questions.length - 1 ? (
          <Button onClick={() => setIndex((value) => value + 1)}>
            {t("common.next")}
          </Button>
        ) : (
          <Button variant="success" onClick={() => setConfirmOpen(true)}>
            {t("common.submit")}
          </Button>
        )}
      </div>

      <Modal
        open={blocker.state === "blocked"}
        onClose={() => blocker.reset?.()}
        title={t("tests.leaveTitle")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => blocker.reset?.()}>
              {t("tests.leaveStay")}
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              {t("tests.leaveAnyway")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">{t("tests.leaveHint")}</p>
        <p className="mt-2 text-sm text-ink-500">
          {t("tests.leaveAnswered", {
            answered: answeredCount,
            total: questions.length,
          })}
        </p>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={t("tests.submitConfirm")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => submit.mutate()} loading={submit.isPending}>
              {t("common.submit")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">{t("tests.submitConfirmHint")}</p>
        <p className="mt-2 text-sm text-ink-500">
          {answeredCount} / {questions.length}
        </p>
      </Modal>

      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
    </div>
  );
}

function TrophyGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M9 20h6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
