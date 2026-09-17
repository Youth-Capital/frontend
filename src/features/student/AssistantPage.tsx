import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { scoreTone } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  ProgressBar,
} from "@/shared/ui";
import type { Recommendation, SkillGapEntry } from "@/shared/types/api";

interface AssistantResponse {
  knowledge: {
    average_score: number;
    strongest: { skill: string; score: number }[];
    weakest: { skill: string; score: number }[];
    notes: { code: string; data: Record<string, unknown> }[];
  };
  skill_gap: {
    profession: string;
    readiness: number;
    matching: SkillGapEntry[];
    partial: SkillGapEntry[];
    missing: SkillGapEntry[];
    next_actions: {
      code: string;
      skill: string;
      skill_id: string;
      from: number;
      to: number;
    }[];
  } | null;
  careers: {
    type: string;
    ref_id: string;
    title: string;
    score: number;
    reason_code: string;
    reason_data: Record<string, unknown>;
  }[];
}

export default function AssistantPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const assistant = useQuery({
    queryKey: ["assistant"],
    queryFn: async () => {
      const { data } = await api.get<AssistantResponse>("/ai/assistant/");
      return data;
    },
  });

  const recommendations = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const { data } = await api.get<Recommendation[]>("/ai/recommendations/?limit=20");
      return data;
    },
  });

  const feedback = useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: "UP" | "DOWN" }) => {
      await api.post(`/ai/recommendations/${id}/feedback/`, { rating });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      await api.post("/ai/recommendations/refresh/");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      void queryClient.invalidateQueries({ queryKey: ["assistant"] });
    },
  });

  if (assistant.isLoading) return <CardSkeleton rows={8} />;

  const data = assistant.data;

  const linkFor = (type: string, refId: string | null) => {
    if (!refId) return null;
    if (type === "COURSE") return `/student/courses/${refId}`;
    if (type === "VACANCY") return `/student/jobs/${refId}`;
    if (type === "PROFESSION") return `/student/career`;
    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("assistant.title")}
        subtitle={t("assistant.subtitle")}
        action={
            <Button
              variant="secondary"
              onClick={() => refresh.mutate()}
              loading={refresh.isPending}
            >
              {t("common.retry")}
            </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("assistant.knowledgeInsight")}
            subtitle={`${t("knowledge.average")}: ${data?.knowledge.average_score ?? 0}%`}
          />

          {(data?.knowledge.strongest.length ?? 0) === 0 ? (
            <EmptyState title={t("knowledge.empty")} description={t("knowledge.emptyHint")} />
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {t("assistant.strongest")}
                </p>
                <div className="flex flex-col gap-2">
                  {data?.knowledge.strongest.map((topic) => (
                    <ProgressBar
                      key={topic.skill}
                      label={topic.skill}
                      value={topic.score}
                      showLabel
                      size="sm"
                      tone="success"
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {t("assistant.weakest")}
                </p>
                <div className="flex flex-col gap-2">
                  {data?.knowledge.weakest.map((topic) => (
                    <ProgressBar
                      key={topic.skill}
                      label={topic.skill}
                      value={topic.score}
                      showLabel
                      size="sm"
                      tone={scoreTone(topic.score)}
                    />
                  ))}
                </div>
              </div>

              {(data?.knowledge.notes.length ?? 0) > 0 && (
                <ul className="flex flex-col gap-2">
                  {data?.knowledge.notes.map((note, index) => (
                    <li
                      key={index}
                      className="rounded-xl bg-info-soft/50 px-3 py-2 text-sm text-ink-700"
                    >
                      {t(`assistant.note.${note.code}`, {
                        ...note.data,
                        skills: Array.isArray(note.data.skills)
                          ? (note.data.skills as string[]).join(", ")
                          : note.data.skills,
                        defaultValue: note.code,
                      })}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={t("assistant.skillGap")} />
          {!data?.skill_gap ? (
            <EmptyState
              title={t("career.selectProfession")}
              action={
                <Link to="/student/career">
                  <Button>{t("nav.career")}</Button>
                </Link>
              }
            />
          ) : (
            <>
              <div className="mb-4">
                <ProgressBar
                  label={data.skill_gap.profession}
                  value={data.skill_gap.readiness}
                  showLabel
                  tone={scoreTone(data.skill_gap.readiness)}
                />
              </div>

              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                {t("assistant.nextActions")}
              </p>
              <ol className="flex flex-col gap-2">
                {data.skill_gap.next_actions.map((action, index) => (
                  <li
                    key={action.skill_id || index}
                    className="flex items-center gap-3 rounded-xl border border-ink-200 px-3 py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {index + 1}
                    </span>
                    <span className="text-sm text-ink-800">
                      {action.skill}: {action.from} → {action.to}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title={t("assistant.careers")} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data?.careers.map((career) => (
            <div key={career.ref_id} className="rounded-xl border border-ink-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-ink-900">{career.title}</span>
                <Badge tone={scoreTone(career.score)}>{career.score}%</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                {t(`assistant.note.${career.reason_code}`, {
                  ...career.reason_data,
                  defaultValue: "",
                })}
              </p>
              {Array.isArray(career.reason_data.missing) &&
                (career.reason_data.missing as string[]).length > 0 && (
                  <p className="mt-1 text-xs text-warning">
                    {t("jobs.youMiss")}:{" "}
                    {(career.reason_data.missing as string[]).join(", ")}
                  </p>
                )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={t("dashboard.recommendations")} />
        {(recommendations.data?.length ?? 0) === 0 ? (
          <EmptyState title={t("dashboard.recommendationsEmpty")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {recommendations.data?.map((recommendation) => {
              const link = linkFor(recommendation.type, recommendation.ref_id);
              return (
                <li
                  key={recommendation.id}
                  className="flex flex-col gap-2 rounded-xl border border-ink-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">
                        {t(`plan.type.${recommendation.type}`, {
                          defaultValue: recommendation.type,
                        })}
                      </Badge>
                      <span className="truncate font-medium text-ink-900">
                        {recommendation.title}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      <span className="font-medium">{t("assistant.why")}: </span>
                      {t(`assistant.note.${recommendation.reason_code}`, {
                        ...recommendation.reason_data,
                        skills: Array.isArray(recommendation.reason_data.skills)
                          ? (recommendation.reason_data.skills as string[]).join(", ")
                          : recommendation.reason_data.skills,
                        matched: Array.isArray(recommendation.reason_data.matched)
                          ? (recommendation.reason_data.matched as string[]).join(", ")
                          : "—",
                        missing: Array.isArray(recommendation.reason_data.missing)
                          ? (recommendation.reason_data.missing as string[]).join(", ")
                          : "—",
                        defaultValue: recommendation.reason_code,
                      })}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone={scoreTone(recommendation.score)}>
                      {recommendation.score}%
                    </Badge>
                    {link && (
                      <Link
                        to={link}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        {t("plan.openLinked")}
                      </Link>
                    )}
                    <button
                      type="button"
                      title={t("assistant.helpful")}
                      onClick={() =>
                        feedback.mutate({ id: recommendation.id, rating: "UP" })
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-success-soft hover:text-success coarse:h-11 coarse:w-11"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      title={t("assistant.notHelpful")}
                      onClick={() =>
                        feedback.mutate({ id: recommendation.id, rating: "DOWN" })
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-danger-soft hover:text-danger coarse:h-11 coarse:w-11"
                    >
                      👎
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* TZ §13: AI never issues final medical, legal or financial verdicts. */}
      <p className="rounded-xl bg-ink-100 px-4 py-3 text-xs text-ink-600">
        {t("assistant.disclaimer")}
      </p>
    </div>
  );
}
