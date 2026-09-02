import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatDate } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  Table,
  Td,
  Th,
} from "@/shared/ui";
import type { ModerationStatus, Paginated, Vacancy } from "@/shared/types/api";

const STATUS_TONE: Record<
  ModerationStatus,
  "neutral" | "warning" | "success" | "danger"
> = {
  DRAFT: "neutral",
  PENDING_REVIEW: "warning",
  PUBLISHED: "success",
  REJECTED: "danger",
  ARCHIVED: "neutral",
};

export default function VacanciesPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const vacancies = useQuery({
    queryKey: ["employer-vacancies"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Vacancy>>(
        "/jobs/vacancies/?page_size=100",
      );
      return data.results;
    },
  });

  const submit = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/jobs/vacancies/${id}/submit/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employer-vacancies"] });
    },
  });

  const close = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/jobs/vacancies/${id}/close/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employer-vacancies"] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("employer.vacancies")}
        action={
            <Link to="/employer/vacancies/new">
              <Button>{t("employer.newVacancy")}</Button>
            </Link>
        }
      />

      {(submit.isError || close.isError) && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {describeError(submit.error ?? close.error)}
        </div>
      )}

      {vacancies.isLoading && <CardSkeleton rows={5} />}
      {!vacancies.isLoading && (vacancies.data?.length ?? 0) === 0 && (
        <EmptyState
          title={t("jobs.empty")}
          action={
            <Link to="/employer/vacancies/new">
              <Button>{t("employer.newVacancy")}</Button>
            </Link>
          }
        />
      )}

      {(vacancies.data?.length ?? 0) > 0 && (
        <Card padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>{t("jobs.title")}</Th>
                <Th>{t("employer.publish")}</Th>
                <Th align="center">{t("jobs.title")}</Th>
                <Th align="right">{t("common.edit")}</Th>
              </tr>
            </thead>
            <tbody>
              {vacancies.data?.map((vacancy) => (
                <tr key={vacancy.id}>
                  <Td>
                    <div className="min-w-0">
                      <p className="font-medium text-ink-900">{vacancy.title}</p>
                      <p className="text-xs text-ink-500">
                        {t(`jobs.type_${vacancy.employment_type}`)} ·{" "}
                        {vacancy.city || vacancy.region_name}
                        {vacancy.published_at &&
                          ` · ${formatDate(vacancy.published_at, i18n.resolvedLanguage)}`}
                      </p>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[vacancy.status]}>
                      {t(`moderation.${vacancy.status}`)}
                    </Badge>
                    {vacancy.moderation_note && (
                      <p className="mt-1 text-xs text-danger">
                        {vacancy.moderation_note}
                      </p>
                    )}
                  </Td>
                  <Td align="center">
                    <span className="tabular-nums text-ink-500">
                      {vacancy.views_count}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-2">
                      {vacancy.status === "PUBLISHED" && (
                        <Link to={`/employer/vacancies/${vacancy.id}/candidates`}>
                          <Button variant="secondary" size="sm">
                            {t("employer.candidates")}
                          </Button>
                        </Link>
                      )}
                      <Link to={`/employer/vacancies/${vacancy.id}`}>
                        <Button variant="ghost" size="sm">
                          {t("common.edit")}
                        </Button>
                      </Link>
                      {(vacancy.status === "DRAFT" || vacancy.status === "REJECTED") && (
                        <Button
                          size="sm"
                          onClick={() => submit.mutate(vacancy.id)}
                          loading={submit.isPending}
                        >
                          {t("employer.publish")}
                        </Button>
                      )}
                      {vacancy.status === "PUBLISHED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => close.mutate(vacancy.id)}
                        >
                          {t("employer.close")}
                        </Button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
