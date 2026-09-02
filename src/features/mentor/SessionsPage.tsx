import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatDateTime } from "@/shared/lib/format";
import {
  DataList,
  DataRow,
  RowMain,
  RowMenu,
  type RowAction,
} from "@/shared/ui/DataList";
import {
  Badge,
  Button,
  CardSkeleton,
  EmptyState,
  Input,
  Modal,
  Spinner,
  Tabs,
  Textarea,
} from "@/shared/ui";
import type { MentorSession, Paginated, Skill } from "@/shared/types/api";

type Tab = "REQUESTED" | "ACCEPTED" | "COMPLETED" | "ALL";

export default function SessionsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [tab, setTab] = useState<Tab>("REQUESTED");
  const [accepting, setAccepting] = useState<MentorSession | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<MentorSession | null>(null);
  const [meetingLink, setMeetingLink] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [assessments, setAssessments] = useState<
    { skill: string; name: string; score: number }[]
  >([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [error, setError] = useState("");

  const sessions = useQuery({
    queryKey: ["mentor-sessions", tab],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "50" });
      if (tab !== "ALL") params.set("status", tab);
      const { data } = await api.get<Paginated<MentorSession>>(
        `/mentorship/sessions/?${params.toString()}`,
      );
      return data.results;
    },
  });

  const skillSearch = useQuery({
    queryKey: ["skill-search", skillQuery],
    queryFn: async () => {
      const { data } = await api.get<Skill[]>(
        `/taxonomy/skills/search/?q=${encodeURIComponent(skillQuery)}`,
      );
      return data;
    },
    enabled: skillQuery.trim().length >= 2,
  });

  const respond = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      await api.post(`/mentorship/sessions/${id}/respond/`, {
        accept,
        meeting_link: meetingLink,
        scheduled_at: scheduledAt || null,
      });
    },
    onSuccess: () => {
      setAccepting(null);
      setMeetingLink("");
      setScheduledAt("");
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["mentor-sessions"] });
      void queryClient.invalidateQueries({ queryKey: ["mentor", "dashboard"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/mentorship/sessions/${id}/complete/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mentor-sessions"] });
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async () => {
      if (!feedbackFor) return;
      await api.post(`/mentorship/sessions/${feedbackFor.id}/feedback/`, {
        rating,
        comment,
        skill_assessments: assessments.map((item) => ({
          skill: item.skill,
          score: item.score,
        })),
      });
    },
    onSuccess: () => {
      setFeedbackFor(null);
      setAssessments([]);
      setComment("");
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["mentor-sessions"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("nav.sessions")}
      />

      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "REQUESTED", label: t("mentors.status.REQUESTED") },
          { key: "ACCEPTED", label: t("mentors.status.ACCEPTED") },
          { key: "COMPLETED", label: t("mentors.status.COMPLETED") },
          { key: "ALL", label: t("common.all") },
        ]}
      />

      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {sessions.isLoading && <CardSkeleton rows={4} />}
      {!sessions.isLoading && (sessions.data?.length ?? 0) === 0 && (
        <EmptyState title={t("mentors.sessionsEmpty")} />
      )}

      {(sessions.data?.length ?? 0) > 0 && (
        <DataList>
          {sessions.data?.map((session) => {
            const actions: RowAction[] = [];

            if (session.status === "REQUESTED") {
              actions.push(
                {
                  label: t("mentors.accept"),
                  onSelect: () => setAccepting(session),
                },
                {
                  label: t("mentors.decline"),
                  tone: "danger",
                  onSelect: () =>
                    respond.mutate({ id: session.id, accept: false }),
                },
              );
            }
            if (session.status === "ACCEPTED") {
              actions.push({
                label: t("mentors.complete"),
                onSelect: () => complete.mutate(session.id),
              });
            }
            if (session.status === "COMPLETED") {
              actions.push({
                label: t("common.add"),
                onSelect: () => setFeedbackFor(session),
              });
            }

            return (
              <DataRow
                key={session.id}
                expanded={
                  session.agenda ? (
                    <p className="text-sm text-ink-600">{session.agenda}</p>
                  ) : null
                }
              >
                <RowMain
                  title={session.topic}
                  subtitle={[
                    session.student_name,
                    session.scheduled_at
                      ? formatDateTime(session.scheduled_at, i18n.resolvedLanguage)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  badges={
                    <Badge
                      tone={
                        session.status === "COMPLETED"
                          ? "success"
                          : session.status === "ACCEPTED"
                            ? "brand"
                            : session.status === "DECLINED"
                              ? "danger"
                              : "warning"
                      }
                    >
                      {t(`mentors.status.${session.status}`)}
                    </Badge>
                  }
                />

                <RowMenu label={t("common.edit")} actions={actions} />
              </DataRow>
            );
          })}
        </DataList>
      )}

      <Modal
        open={Boolean(accepting)}
        onClose={() => setAccepting(null)}
        title={t("mentors.accept")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAccepting(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() =>
                accepting && respond.mutate({ id: accepting.id, accept: true })
              }
              loading={respond.isPending}
            >
              {t("mentors.accept")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="scheduled-at"
            type="datetime-local"
            label={t("mentors.topic")}
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
          />
          <Input
            id="meeting-link"
            label={t("mentors.meetingLink")}
            value={meetingLink}
            onChange={(event) => setMeetingLink(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={Boolean(feedbackFor)}
        onClose={() => setFeedbackFor(null)}
        title={t("common.add")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFeedbackFor(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => submitFeedback.mutate()}
              loading={submitFeedback.isPending}
            >
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">
              {rating} / 5
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="w-full accent-brand-600"
            />
          </div>

          <Textarea
            id="feedback-comment"
            label={t("employer.note")}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />

          {/* A mentor's assessment becomes skill evidence, so it is worth
              being explicit that this affects the student's profile. */}
          <div>
            <p className="mb-1 text-sm font-medium text-ink-700">
              {t("skills.title")}
            </p>
            <p className="mb-2 text-xs text-ink-500">{t("skills.verifyPrompt")}</p>

            <div className="mb-2 flex flex-col gap-2">
              {assessments.map((item, index) => (
                <div
                  key={item.skill}
                  className="flex items-center gap-3 rounded-xl border border-ink-200 p-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={item.score}
                    onChange={(event) =>
                      setAssessments((previous) =>
                        previous.map((entry, i) =>
                          i === index
                            ? { ...entry, score: Number(event.target.value) }
                            : entry,
                        ),
                      )
                    }
                    className="w-32 accent-brand-600"
                  />
                  <span className="w-8 text-right text-sm tabular-nums">
                    {item.score}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAssessments((previous) =>
                        previous.filter((_, i) => i !== index),
                      )
                    }
                    className="text-xs text-danger"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <Input
              id="assessment-skill"
              placeholder={t("onboarding.searchSkill")}
              value={skillQuery}
              onChange={(event) => setSkillQuery(event.target.value)}
              autoComplete="off"
            />
            {skillQuery.trim().length >= 2 && (
              <div className="mt-1 max-h-36 overflow-y-auto rounded-xl border border-ink-200">
                {skillSearch.isLoading && (
                  <div className="flex justify-center p-2 text-ink-400">
                    <Spinner size={14} />
                  </div>
                )}
                {skillSearch.data?.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => {
                      if (!assessments.some((item) => item.skill === skill.id)) {
                        setAssessments((previous) => [
                          ...previous,
                          { skill: skill.id, name: skill.name, score: 60 },
                        ]);
                      }
                      setSkillQuery("");
                    }}
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-ink-50"
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
