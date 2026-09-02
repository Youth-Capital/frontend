import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  ErrorState,
  StatCard,
} from "@/shared/ui";
import type { EmployerDashboard } from "@/shared/types/api";

export default function DashboardPage() {
  const { t } = useTranslation();

  const dashboard = useQuery({
    queryKey: ["employer", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get<EmployerDashboard>("/jobs/employer/dashboard/");
      return data;
    },
  });

  if (dashboard.isLoading) return <CardSkeleton rows={6} />;
  if (dashboard.isError || !dashboard.data) {
    return (
      <ErrorState
        title={t("errors.loadFailed")}
        retryLabel={t("common.retry")}
        onRetry={() => void dashboard.refetch()}
      />
    );
  }

  const data = dashboard.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={data.company.name}
        subtitle={t("employer.dashboard")}
        action={
            <Link to="/employer/vacancies/new">
              <Button>{t("employer.newVacancy")}</Button>
            </Link>
        }
      />

      {data.company.verification_status !== "VERIFIED" && (
        <div className="rounded-(--radius-card) border border-warning-soft bg-warning-soft/40 p-4 text-sm text-warning">
          {t("employer.verificationPending")}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("employer.vacancies")}
          value={data.vacancies.published}
          hint={`${data.vacancies.pending} ${t("employer.pendingReview").toLowerCase()}`}
          tone="brand"
        />
        <StatCard
          label={t("employer.newApplications")}
          value={data.applications.new}
          hint={`${data.applications.total} ${t("common.all").toLowerCase()}`}
          tone={data.applications.new > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label={t("employer.strongMatches")}
          value={data.talent.strong_matches}
          tone="success"
        />
        <StatCard label={t("employer.hired")} value={data.applications.hired} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("employer.applications")}
            action={
              <Link
                to="/employer/applications"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {t("common.showMore")}
              </Link>
            }
          />
          <div className="flex flex-col gap-2">
            {[
              ["APPLIED", data.applications.new],
              ["SHORTLISTED", data.applications.shortlisted],
              ["INTERVIEW", data.applications.interview],
              ["ACCEPTED", data.applications.hired],
            ].map(([status, count]) => (
              <div
                key={status as string}
                className="flex items-center justify-between rounded-xl border border-ink-200 px-3 py-2"
              >
                <span className="text-sm text-ink-700">
                  {t(`applications.status.${status}`)}
                </span>
                <span className="font-semibold tabular-nums text-ink-900">
                  {count as number}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title={t("employer.topVacancies")} />
          {data.talent.top_vacancies.length === 0 ? (
            <EmptyState
              title={t("jobs.empty")}
              action={
                <Link to="/employer/vacancies/new">
                  <Button>{t("employer.newVacancy")}</Button>
                </Link>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.talent.top_vacancies.map((vacancy) => (
                <li key={vacancy.id}>
                  <Link
                    to={`/employer/vacancies/${vacancy.id}/candidates`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-3 py-2 hover:border-brand-400"
                  >
                    <span className="min-w-0 truncate text-sm text-ink-800">
                      {vacancy.title}
                    </span>
                    <Badge tone="brand">{vacancy.applicant_count}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={t("employer.courses")}
            action={
              <Link
                to="/employer/courses"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {t("common.showMore")}
              </Link>
            }
          />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-ink-900">
                {data.learning.courses}
              </p>
              <p className="text-xs text-ink-500">{t("employer.courses")}</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-ink-900">
                {data.learning.students}
              </p>
              <p className="text-xs text-ink-500">{t("employer.students")}</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-success">
                {data.learning.completions}
              </p>
              <p className="text-xs text-ink-500">{t("employer.completions")}</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={t("employer.tests")}
            action={
              <Link
                to="/employer/tests"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {t("common.showMore")}
              </Link>
            }
          />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-ink-900">
                {data.assessment.tests}
              </p>
              <p className="text-xs text-ink-500">{t("employer.tests")}</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-ink-900">
                {data.assessment.attempts}
              </p>
              <p className="text-xs text-ink-500">{t("employer.attempts")}</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-brand-700">
                {data.assessment.avg_score}%
              </p>
              <p className="text-xs text-ink-500">{t("employer.avgScore")}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
