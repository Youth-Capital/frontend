import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatDateTime, initials } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  Input,
  Modal,
  Tabs,
  Textarea,
} from "@/shared/ui";
import type { Mentor, MentorSession, Paginated } from "@/shared/types/api";

type Tab = "directory" | "sessions";

export default function MentorsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [tab, setTab] = useState<Tab>("directory");
  const [search, setSearch] = useState("");
  const [requestFor, setRequestFor] = useState<Mentor | null>(null);
  const [topic, setTopic] = useState("");
  const [agenda, setAgenda] = useState("");
  const [error, setError] = useState("");

  const mentors = useQuery({
    queryKey: ["mentors", search],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "50" });
      if (search) params.set("search", search);
      const { data } = await api.get<Paginated<Mentor>>(
        `/mentorship/mentors/?${params.toString()}`,
      );
      return data.results;
    },
    enabled: tab === "directory",
  });

  const sessions = useQuery({
    queryKey: ["mentor-sessions"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<MentorSession>>(
        "/mentorship/sessions/?page_size=50",
      );
      return data.results;
    },
  });

  const request = useMutation({
    mutationFn: async () => {
      if (!requestFor) return;
      await api.post("/mentorship/sessions/", {
        mentor: requestFor.id,
        topic,
        agenda,
      });
    },
    onSuccess: () => {
      setRequestFor(null);
      setTopic("");
      setAgenda("");
      setError("");
      setTab("sessions");
      void queryClient.invalidateQueries({ queryKey: ["mentor-sessions"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("mentors.title")}
        subtitle={t("mentors.subtitle")}
      />

      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "directory", label: t("mentors.title") },
          {
            key: "sessions",
            label: t("mentors.mySessions"),
            count: sessions.data?.length ?? 0,
          },
        ]}
      />

      {tab === "directory" && (
        <>
          <Input
            id="mentor-search"
            placeholder={t("common.search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {mentors.isLoading && <CardSkeleton rows={4} />}
          {!mentors.isLoading && (mentors.data?.length ?? 0) === 0 && (
            <EmptyState title={t("mentors.empty")} />
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mentors.data?.map((mentor) => (
              <Card key={mentor.id} className="flex h-full flex-col">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                    {initials(mentor.full_name || "?")}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-ink-900">{mentor.full_name}</h3>
                    <p className="text-xs text-ink-500">{mentor.headline}</p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 text-sm text-ink-600">{mentor.bio}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {mentor.expertise_names.slice(0, 4).map((skill) => (
                    <Badge key={skill} tone="brand">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-500">
                  <span>
                    {t("mentors.yearsExperience", { count: mentor.years_experience })}
                  </span>
                  <span>·</span>
                  <span>{t("mentors.sessions", { count: mentor.sessions_count })}</span>
                  {mentor.rating_count > 0 && (
                    <>
                      <span>·</span>
                      <span>★ {mentor.rating_avg}</span>
                    </>
                  )}
                  {mentor.is_free && (
                    <>
                      <span>·</span>
                      <span className="text-success">{t("mentors.free")}</span>
                    </>
                  )}
                </div>

                <div className="mt-auto pt-4">
                  <Button
                    fullWidth
                    disabled={!mentor.accepting_students}
                    onClick={() => setRequestFor(mentor)}
                  >
                    {t("mentors.request")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "sessions" && (
        <>
          {sessions.isLoading && <CardSkeleton rows={3} />}
          {!sessions.isLoading && (sessions.data?.length ?? 0) === 0 && (
            <EmptyState title={t("mentors.sessionsEmpty")} />
          )}

          <div className="flex flex-col gap-3">
            {sessions.data?.map((session) => (
              <Card key={session.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-ink-900">{session.topic}</h3>
                    <p className="text-sm text-ink-600">{session.mentor_name}</p>
                    {session.agenda && (
                      <p className="mt-1 text-sm text-ink-500">{session.agenda}</p>
                    )}
                    {session.scheduled_at && (
                      <p className="mt-1 text-xs text-ink-500">
                        {formatDateTime(session.scheduled_at, i18n.resolvedLanguage)}
                      </p>
                    )}
                    {session.meeting_link && (
                      <a
                        href={session.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-sm text-brand-600 hover:underline"
                      >
                        {t("mentors.meetingLink")}
                      </a>
                    )}
                  </div>
                  <Badge
                    tone={
                      session.status === "COMPLETED"
                        ? "success"
                        : session.status === "ACCEPTED"
                          ? "brand"
                          : session.status === "DECLINED"
                            ? "danger"
                            : "neutral"
                    }
                  >
                    {t(`mentors.status.${session.status}`)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={Boolean(requestFor)}
        onClose={() => setRequestFor(null)}
        title={`${t("mentors.request")} — ${requestFor?.full_name ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRequestFor(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => request.mutate()}
              loading={request.isPending}
              disabled={!topic.trim()}
            >
              {t("common.submit")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="session-topic"
            label={t("mentors.topic")}
            required
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />
          <Textarea
            id="session-agenda"
            label={t("mentors.agenda")}
            value={agenda}
            onChange={(event) => setAgenda(event.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
