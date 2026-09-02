import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatDate, matchTone } from "@/shared/lib/format";
import { MatchExplanation } from "@/features/student/MatchExplanation";
import {
  DataList,
  DataRow,
  RowMain,
  RowMenu,
  RowValue,
  type RowAction,
} from "@/shared/ui/DataList";
import {
  Badge,
  Button,
  CardSkeleton,
  EmptyState,
  Modal,
  Tabs,
  Textarea,
} from "@/shared/ui";
import type {
  Application,
  ApplicationStatus,
  MatchReason,
  Paginated,
} from "@/shared/types/api";

/* Mirrors the server-side transition table; the server is still the authority. */
const NEXT_STATUSES: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  APPLIED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED"],
  SHORTLISTED: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["OFFER", "REJECTED"],
  OFFER: ["ACCEPTED", "REJECTED"],
};

const TABS: (ApplicationStatus | "ALL")[] = [
  "ALL",
  "APPLIED",
  "UNDER_REVIEW",
  "SHORTLISTED",
  "INTERVIEW",
  "ACCEPTED",
];

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

export default function ApplicationsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [tab, setTab] = useState<ApplicationStatus | "ALL">("ALL");
  const [explainFor, setExplainFor] = useState<Application | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const applications = useQuery({
    queryKey: ["employer-applications", tab],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "100" });
      if (tab !== "ALL") params.set("status", tab);
      const { data } = await api.get<Paginated<Application>>(
        `/jobs/applications/?${params.toString()}`,
      );
      return data.results;
    },
  });

  const explanation = useQuery({
    queryKey: ["application-explain", explainFor?.id],
    queryFn: async () => {
      const { data } = await api.get<{
        summary_code: string;
        reasons: MatchReason[];
        data: Record<string, unknown>;
      }>(`/jobs/applications/${explainFor!.id}/explain/`);
      return data;
    },
    enabled: Boolean(explainFor),
  });

  const changeStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: ApplicationStatus;
    }) => {
      await api.post(`/jobs/applications/${id}/status/`, { status, note });
    },
    onSuccess: () => {
      setNote("");
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
      void queryClient.invalidateQueries({ queryKey: ["employer", "dashboard"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const rows = applications.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("employer.applications")}
      />

      <Tabs<ApplicationStatus | "ALL">
        active={tab}
        onChange={setTab}
        tabs={TABS.map((status) => ({
          key: status,
          label:
            status === "ALL" ? t("common.all") : t(`applications.status.${status}`),
        }))}
      />

      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {applications.isLoading && <CardSkeleton rows={6} />}
      {!applications.isLoading && rows.length === 0 && (
        <EmptyState title={t("applications.empty")} />
      )}

      {rows.length > 0 && (
        <DataList>
          {rows.map((application) => {
            /* Status moves live in the row menu: the same four links repeated
               on every line was the noise that pushed controls to the far
               edge of the screen in the card layout. */
            const actions: RowAction[] = [
              {
                label: t("employer.whyCandidate"),
                onSelect: () => setExplainFor(application),
              },
              ...(NEXT_STATUSES[application.status] ?? []).map((next) => ({
                label: t(`applications.status.${next}`),
                tone: next === "REJECTED" ? ("danger" as const) : ("default" as const),
                onSelect: () =>
                  changeStatus.mutate({ id: application.id, status: next }),
              })),
            ];

            return (
              <DataRow key={application.id}>
                <RowMain
                  title={
                    application.candidate?.name ??
                    t("employer.anonymousCandidate")
                  }
                  subtitle={[
                    application.vacancy_detail.title,
                    application.candidate?.youth_id,
                    t("applications.appliedOn", {
                      date: formatDate(
                        application.applied_at,
                        i18n.resolvedLanguage,
                      ),
                    }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  badges={
                    <Badge tone={STATUS_TONE[application.status]}>
                      {t(`applications.status.${application.status}`)}
                    </Badge>
                  }
                />

                <RowValue
                  value={`${application.match_score_at_apply}%`}
                  hint={t("jobs.match")}
                  tone={matchTone(application.match_score_at_apply)}
                />

                <RowMenu label={t("employer.changeStatus")} actions={actions} />
              </DataRow>
            );
          })}
        </DataList>
      )}

      <Modal
        open={Boolean(explainFor)}
        onClose={() => setExplainFor(null)}
        title={t("employer.whyCandidate")}
        footer={
          <Button variant="secondary" onClick={() => setExplainFor(null)}>
            {t("common.close")}
          </Button>
        }
      >
        {explanation.isLoading ? (
          <CardSkeleton rows={4} />
        ) : explanation.data ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-brand-50 p-3 text-center">
              <p className="text-sm text-brand-700">
                {t(`match.summary.${explanation.data.summary_code}`)}
              </p>
              <p className="text-3xl font-semibold tabular-nums text-brand-800">
                {String(explanation.data.data.overall)}%
              </p>
            </div>

            <MatchExplanation reasons={explanation.data.reasons} />

            {explainFor?.cover_letter && (
              <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-700">
                {explainFor.cover_letter}
              </p>
            )}

            <Textarea
              id="status-note"
              label={t("employer.note")}
              hint={t("employer.changeStatus")}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
