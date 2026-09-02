import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatDate , resolveTaskTitle } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  ProgressBar,
  StatCard,
} from "@/shared/ui";
import type { DevelopmentPlan, Task } from "@/shared/types/api";

export default function PlanPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const plan = useQuery({
    queryKey: ["plan", "active"],
    queryFn: async () => {
      const { data } = await api.get<DevelopmentPlan | null>("/plan/plans/active/");
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<DevelopmentPlan>("/plan/plans/generate/", {
        period_days: 90,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plan"] });
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.post(`/plan/tasks/${id}/status/`, { status });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plan"] });
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
    },
  });

  if (plan.isLoading) return <CardSkeleton rows={8} />;

  const data = plan.data;

  const taskTitle = (task: Task) => resolveTaskTitle(task.title, t);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("plan.title")}
        subtitle={t("plan.subtitle")}
        action={
            <Button
              variant={data ? "secondary" : "primary"}
              onClick={() => generate.mutate()}
              loading={generate.isPending}
            >
              {data ? t("plan.regenerate") : t("plan.generate")}
            </Button>
        }
      />

      {generate.isError && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {describeError(generate.error)}
        </div>
      )}

      {!data ? (
        <EmptyState
          title={t("plan.noPlan")}
          description={t("plan.noPlanHint")}
          action={
            <Button onClick={() => generate.mutate()} loading={generate.isPending}>
              {t("plan.generate")}
            </Button>
          }
        />
      ) : (
        <>
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink-900">
                  {resolveTaskTitle(data.title, t)}
                </h2>
                <p className="text-sm text-ink-500">
                  {resolveTaskTitle(data.summary, t)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold tabular-nums text-brand-700">
                  {data.progress}%
                </p>
                <p className="text-xs text-ink-500">
                  {t("dashboard.daysLeft", { count: data.days_remaining })}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <ProgressBar value={data.progress} size="lg" />
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label={t("plan.tasks")}
              value={`${data.tasks_done} / ${data.tasks_total}`}
              tone="brand"
            />
            <StatCard
              label={t("plan.milestones")}
              value={data.milestones?.length ?? 0}
            />
            <StatCard
              label={t("common.days", { count: data.period_days })}
              value={formatDate(data.end_date, i18n.resolvedLanguage)}
            />
          </div>

          {(data.reviews?.length ?? 0) > 0 && (
            <Card>
              <CardHeader title={t("plan.reviews")} />
              <ul className="flex flex-col gap-2">
                {data.reviews?.map((review) => (
                  <li
                    key={review.id}
                    className="rounded-xl border border-ink-200 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink-800">
                        {review.reviewer}
                      </span>
                      <Badge
                        tone={review.status === "APPROVED" ? "success" : "warning"}
                      >
                        {review.status}
                      </Badge>
                    </div>
                    {review.comment && (
                      <p className="mt-1 text-ink-600">{review.comment}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="flex flex-col gap-4">
            {data.milestones?.map((milestone) => (
              <Card key={milestone.id}>
                <CardHeader
                  title={resolveTaskTitle(milestone.title, t)}
                  subtitle={
                    milestone.due_date
                      ? t("plan.dueOn", {
                          date: formatDate(milestone.due_date, i18n.resolvedLanguage),
                        })
                      : undefined
                  }
                  action={
                    <Badge
                      tone={
                        milestone.status === "DONE"
                          ? "success"
                          : milestone.status === "MISSED"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {milestone.progress}%
                    </Badge>
                  }
                />

                <ul className="flex flex-col gap-2">
                  {milestone.tasks.map((task) => (
                    <li
                      key={task.id}
                      className={
                        task.status === "DONE"
                          ? "flex items-start gap-3 rounded-xl border border-ink-200 bg-ink-50 p-3 opacity-70"
                          : "flex items-start gap-3 rounded-xl border border-ink-200 p-3"
                      }
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setStatus.mutate({
                            id: task.id,
                            status: task.status === "DONE" ? "TODO" : "DONE",
                          })
                        }
                        className={
                          task.status === "DONE"
                            ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-on-colour"
                            : "mt-0.5 flex h-5 w-5 shrink-0 rounded-full border-2 border-ink-300 hover:border-success"
                        }
                        aria-label={
                          task.status === "DONE" ? t("plan.markTodo") : t("plan.markDone")
                        }
                      >
                        {task.status === "DONE" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 13l4 4L19 7"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={
                            task.status === "DONE"
                              ? "text-sm text-ink-500 line-through"
                              : "text-sm font-medium text-ink-800"
                          }
                        >
                          {taskTitle(task)}
                        </p>
                        {task.description && (
                          <p className="mt-0.5 text-xs text-ink-500">
                            {resolveTaskTitle(task.description, t)}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                          <Badge tone={task.priority === "HIGH" ? "warning" : "neutral"}>
                            {t(`plan.type.${task.type}`)}
                          </Badge>
                          {task.is_overdue && (
                            <Badge tone="danger">{t("plan.overdue")}</Badge>
                          )}
                          {task.due_date && (
                            <span>
                              {t("plan.dueOn", {
                                date: formatDate(task.due_date, i18n.resolvedLanguage),
                              })}
                            </span>
                          )}
                          <span>
                            {t("plan.estimate", { count: task.estimated_minutes })}
                          </span>
                        </div>
                      </div>

                      {task.ref_type === "Course" && task.ref_id && (
                        <Link
                          to={`/student/courses/${task.ref_id}`}
                          className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700"
                        >
                          {t("plan.openLinked")}
                        </Link>
                      )}
                      {task.ref_type === "Test" && task.ref_id && (
                        <Link
                          to={`/student/tests/${task.ref_id}/run`}
                          className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700"
                        >
                          {t("plan.openLinked")}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
