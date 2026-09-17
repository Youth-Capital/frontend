import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { api } from "@/shared/api/client";
import { InterviewInvites } from "./InterviewInvites";
import { formatDate, matchTone } from "@/shared/lib/format";
import {
  DataList,
  DataRow,
  RowMain,
  RowMenu,
  RowValue,
} from "@/shared/ui/DataList";
import { Badge, Button, CardSkeleton, EmptyState } from "@/shared/ui";
import type { Application, ApplicationStatus, Paginated } from "@/shared/types/api";

const STATUS_TONE: Record<
  ApplicationStatus,
  "neutral" | "brand" | "success" | "warning" | "danger" | "info"
> = {
  APPLIED: "neutral",
  UNDER_REVIEW: "info",
  SHORTLISTED: "brand",
  INTERVIEW: "warning",
  OFFER: "success",
  ACCEPTED: "success",
  REJECTED: "danger",
  WITHDRAWN: "neutral",
};

/** The funnel in order — used to show how far an application has travelled. */
const PIPELINE: ApplicationStatus[] = [
  "APPLIED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "OFFER",
  "ACCEPTED",
];

const OPEN_STATUSES: ApplicationStatus[] = [
  "APPLIED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
];

export default function ApplicationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const applications = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Application>>(
        "/jobs/applications/?page_size=50",
      );
      return data.results;
    },
  });

  const withdraw = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/jobs/applications/${id}/status/`, { status: "WITHDRAWN" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  if (applications.isLoading) return <CardSkeleton rows={5} />;

  const rows = applications.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("applications.title")}
        subtitle={t("applications.subtitle")}
      />

      {/*
        Above the empty-state branch on purpose. Someone invited through talent
        search has no applications at all yet — that is the whole point — so
        rendering this inside the "you have applications" arm would hide the
        invitation from exactly the person it was sent to.
      */}
      <InterviewInvites />

      {rows.length === 0 ? (
        <EmptyState
          title={t("applications.empty")}
          action={
            <Link to="/student/jobs">
              <Button>{t("nav.jobs")}</Button>
            </Link>
          }
        />
      ) : (
        <DataList>
          {rows.map((application) => {
            const isOpen = expanded === application.id;
            const stageIndex = PIPELINE.indexOf(application.status);
            const closed =
              application.status === "REJECTED" ||
              application.status === "WITHDRAWN";

            return (
              <DataRow
                key={application.id}
                onClick={() => setExpanded(isOpen ? null : application.id)}
                highlighted={isOpen}
                expanded={
                  isOpen ? (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                        {t("applications.history")}
                      </p>
                      <ol className="flex flex-col gap-2">
                        {application.events.map((event) => (
                          <li
                            key={event.id}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <span className="text-ink-700">
                              {event.from_status
                                ? `${t(
                                    `applications.status.${event.from_status as ApplicationStatus}`,
                                  )} → `
                                : ""}
                              {t(
                                `applications.status.${event.to_status as ApplicationStatus}`,
                              )}
                              {event.note && (
                                <span className="ml-2 text-ink-500">{event.note}</span>
                              )}
                            </span>
                            <span className="shrink-0 text-xs text-ink-400">
                              {formatDate(event.created_at, i18n.resolvedLanguage)}
                            </span>
                          </li>
                        ))}
                      </ol>
                      {application.employer_note && (
                        <p className="glass rounded-(--radius-control) p-3 text-sm text-ink-700">
                          {application.employer_note}
                        </p>
                      )}
                    </div>
                  ) : null
                }
              >
                <RowMain
                  title={application.vacancy_detail.title}
                  subtitle={`${application.vacancy_detail.company}${
                    application.vacancy_detail.city
                      ? ` · ${application.vacancy_detail.city}`
                      : ""
                  } · ${t("applications.appliedOn", {
                    date: formatDate(application.applied_at, i18n.resolvedLanguage),
                  })}`}
                  badges={
                    <Badge tone={STATUS_TONE[application.status]}>
                      {t(`applications.status.${application.status}`)}
                    </Badge>
                  }
                />

                {/* Stage pips: position in the funnel at a glance, without
                    spending a full progress bar and a legend on every row. */}
                <div
                  className="flex shrink-0 items-center gap-1"
                  title={t(`applications.status.${application.status}`)}
                  aria-label={t(`applications.status.${application.status}`)}
                >
                  {PIPELINE.map((stage, index) => (
                    <span
                      key={stage}
                      className={
                        closed
                          ? "h-1.5 w-4 rounded-full bg-ink-200"
                          : index <= stageIndex
                            ? "h-1.5 w-4 rounded-full bg-brand-fill"
                            : "h-1.5 w-4 rounded-full bg-ink-200"
                      }
                    />
                  ))}
                </div>

                <RowValue
                  value={`${application.match_score_at_apply}%`}
                  hint={t("applications.matchAtApply")}
                  tone={matchTone(application.match_score_at_apply)}
                />

                <RowMenu
                  label={t("common.edit")}
                  actions={[
                    {
                      label: t("nav.jobs"),
                      onSelect: () =>
                        navigate(`/student/jobs/${application.vacancy}`),
                    },
                    {
                      label: t("applications.history"),
                      onSelect: () => setExpanded(isOpen ? null : application.id),
                    },
                    {
                      label: t("applications.withdraw"),
                      tone: "danger",
                      disabled: !OPEN_STATUSES.includes(application.status),
                      onSelect: () => withdraw.mutate(application.id),
                    },
                  ]}
                />
              </DataRow>
            );
          })}
        </DataList>
      )}
    </div>
  );
}
