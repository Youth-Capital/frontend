import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";

import { StreakCard } from "./StreakCard";
import { api } from "@/shared/api/client";
import { CapitalBloom, CapitalUnlockList } from "@/shared/ui/CapitalBloom";
import { PERIOD_DEFAULT } from "./PlanPeriod";
import { matchTone, resolveTaskTitle } from "@/shared/lib/format";

import { JourneyBand } from "./journey/JourneyBand";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  ErrorState,
  ProgressBar,
} from "@/shared/ui";
import type { StudentDashboard } from "@/shared/types/api";

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const dashboard = useQuery({
    queryKey: ["student", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get<StudentDashboard>("/me/dashboard/");
      return data;
    },
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      await api.post(`/plan/tasks/${taskId}/status/`, { status: "DONE" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["plan"] });
    },
  });

  const generatePlan = useMutation({
    mutationFn: async () => {
      //: The same default the plan page offers. 90 was hardcoded here and is
      //: no longer one of the presets — the length is chosen on the plan page,
      //: and this shortcut should not quietly disagree with it.
      const { data } = await api.post("/plan/plans/generate/", {
        period_days: PERIOD_DEFAULT,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
      navigate("/student/plan");
    },
  });

  if (dashboard.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <CardSkeleton rows={4} />
        <CardSkeleton rows={4} />
        <CardSkeleton rows={4} />
      </div>
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <ErrorState
        title={t("errors.loadFailed")}
        onRetry={() => void dashboard.refetch()}
        retryLabel={t("common.retry")}
      />
    );
  }

  const data = dashboard.data;
  const stats = data.stats;

  return (
    <div className="flex flex-col gap-6">
      <JourneyBand data={data} />

      {/*
        The intake interview, offered until it is answered. An account that
        skipped it lands on a dashboard of zeroes with nothing to act on —
        which is exactly what this replaces.
      */}
      {!data.intake_completed && (
        <div
          style={{ "--tint": "var(--aurora-3)" } as CSSProperties}
          className="glass-tinted flex flex-col gap-3 rounded-(--radius-card) p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold text-ink-900">
              {t(data.intake_started ? "intake.resumeTitle" : "intake.startTitle")}
            </p>
            <p className="mt-0.5 text-sm text-ink-600">
              {t(data.intake_started ? "intake.resumeBody" : "intake.startBody")}
            </p>
          </div>
          <Link
            to="/intake"
            className="shrink-0 self-start rounded-full bg-brand-fill px-5 py-3 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-fill-hover sm:self-auto"
          >
            {t(data.intake_started ? "intake.resumeCta" : "intake.startCta")}
          </Link>
        </div>
      )}

      <StreakCard streak={data.streak} company={data.company} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's three tasks — the first-demo requirement (TZ §22.1) */}
        <Card className="lg:col-span-2">
          <CardHeader
            title={t("dashboard.todayTasks")}
            subtitle={
              data.overdue_tasks > 0
                ? t("dashboard.overdue", { count: data.overdue_tasks })
                : undefined
            }
            action={
              data.plan ? (
                <Link
                  to="/student/plan"
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  {t("nav.plan")}
                </Link>
              ) : null
            }
          />

          {data.today_tasks.length === 0 ? (
            <EmptyState
              title={t("dashboard.todayTasksEmpty")}
              action={
                <Button
                  onClick={() => generatePlan.mutate()}
                  loading={generatePlan.isPending}
                >
                  {t("dashboard.planGenerate")}
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.today_tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-3 rounded-xl border border-ink-200 p-3"
                >
                  <button
                    type="button"
                    onClick={() => completeTask.mutate(task.id)}
                    disabled={completeTask.isPending}
                    className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink-300 transition-colors hover:border-success hover:bg-success-soft before:absolute before:-inset-3.5 before:content-['']"
                    aria-label={t("plan.markDone")}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-transparent hover:text-success"
                      />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-800">
                      {/* The stored title is already the full key with its
                          skill appended after "::", so prefixing "plan.task."
                          again produced a key that resolves to nothing and
                          falls back to the raw string. */}
                      {resolveTaskTitle(task.title, t)}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <Badge
                        tone={task.priority === "HIGH" ? "warning" : "neutral"}
                      >
                        {t(`plan.type.${task.type}`)}
                      </Badge>
                      {task.is_overdue && (
                        <Badge tone="danger">{t("plan.overdue")}</Badge>
                      )}
                      <span>
                        {t("plan.estimate", { count: task.estimated_minutes })}
                      </span>
                    </div>
                  </div>
                  {task.ref_type === "Course" && task.ref_id && (
                    <Link
                      to={`/student/courses/${task.ref_id}`}
                      className="-my-3 shrink-0 py-3 text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      {t("plan.openLinked")}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}

          {data.plan && (
            <div className="mt-4 rounded-xl bg-brand-50 p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                {/* The server stores this as a key with arguments, the same as
                    a task title — `plan.generated.title::days=90::...`. Shown
                    raw it is both untranslated and a 48-character word with
                    nowhere to wrap, which was holding the whole dashboard open
                    to 508px on a 390px phone. */}
                <span className="min-w-0 font-medium text-brand-800">
                  {resolveTaskTitle(data.plan.title, t)}
                </span>
                <span className="text-brand-700">
                  {t("dashboard.daysLeft", { count: data.plan.days_remaining })}
                </span>
              </div>
              <div className="mt-2">
                <ProgressBar value={data.plan.progress} showLabel size="sm" />
              </div>
            </div>
          )}

          {/*
            The two figures worth keeping from the row of stat cards this
            replaced: how far to the profession, and what that distance has
            already opened. Profile completion, a count of skills and a count
            of courses each have a page of their own in the menu, and none of
            them told anybody what to do next.
          */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-ink-200 pt-4 text-sm">
            <span className="text-ink-600">
              {t("dashboard.careerProgress")}:{" "}
              <span className="font-semibold tabular-nums text-ink-900">
                {data.career_progress}%
              </span>
            </span>

            {stats.matching_vacancies > 0 && (
              <Link
                to="/student/jobs"
                className="-my-3 py-3 font-medium text-brand-600 hover:text-brand-700"
              >
                {t("dashboard.stats.matchingVacancies")}:{" "}
                <span className="tabular-nums">{stats.matching_vacancies}</span>
              </Link>
            )}
          </div>
        </Card>

        {/* Recommendations, each with a stated reason */}
        <Card>
          <CardHeader
            title={t("dashboard.recommendations")}
            action={
              <Link
                to="/student/assistant"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {t("nav.assistant")}
              </Link>
            }
          />
          {data.recommendations.length === 0 ? (
            <EmptyState title={t("dashboard.recommendationsEmpty")} />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.recommendations.map((recommendation) => (
                <li
                  key={recommendation.id}
                  className="rounded-xl border border-ink-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium text-ink-800">
                        {recommendation.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {t(`assistant.note.${recommendation.reason_code}`, {
                          ...recommendation.reason_data,
                          skills: Array.isArray(recommendation.reason_data.skills)
                            ? (recommendation.reason_data.skills as string[]).join(
                                ", ",
                              )
                            : recommendation.reason_data.skills,
                          matched: Array.isArray(recommendation.reason_data.matched)
                            ? (
                                recommendation.reason_data.matched as string[]
                              ).join(", ")
                            : "—",
                          missing: Array.isArray(recommendation.reason_data.missing)
                            ? (
                                recommendation.reason_data.missing as string[]
                              ).join(", ")
                            : "—",
                          defaultValue: "",
                        })}
                      </p>
                    </div>
                    <Badge tone={matchTone(recommendation.score)}>
                      {recommendation.score}%
                    </Badge>
                  </div>
                  {recommendation.ref_id &&
                    (recommendation.type === "COURSE" ||
                      recommendation.type === "VACANCY") && (
                      <Link
                        to={
                          recommendation.type === "COURSE"
                            ? `/student/courses/${recommendation.ref_id}`
                            : `/student/jobs/${recommendation.ref_id}`
                        }
                        className="mt-2 inline-block text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        {t("plan.openLinked")}
                      </Link>
                    )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/*
        Capital index gets a full-width row of its own. At a third of the grid
        the nine labels scaled down past legibility — and this is the concept
        the whole programme is named after (TZ §2.1), so it earns the space.
      */}
      <Card>
        <CardHeader
          title={t("capital.title")}
          subtitle={t("capital.measured", {
            measured: data.capital.measured_axes,
            total: data.capital.total_axes,
          })}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <CapitalBloom
            dimensions={data.capital.dimensions}
            overall={data.capital.overall}
            measured={data.capital.measured_axes}
            total={data.capital.total_axes}
          />

          <div className="flex flex-col justify-center">
            {/* The explainer paragraph that sat here repeated the subtitle
                above the chart. What is left is the half somebody can act on. */}
            {data.capital.measured_axes < data.capital.total_axes && (
              <>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {t("capital.unlockTitle")}
                </p>
                <p className="mb-3 text-xs text-ink-500">
                  {t("capital.unlockHint")}
                </p>
                <CapitalUnlockList dimensions={data.capital.dimensions} />
              </>
            )}
          </div>
        </div>
      </Card>

    </div>
  );
}
