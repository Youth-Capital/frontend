import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { DemandSupplyChart, FunnelChart } from "@/shared/ui/charts";
import {
  Badge,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  ErrorState,
  StatCard,
  Table,
  Td,
  Th,
} from "@/shared/ui";
import type { AdminDashboard, RiskRow } from "@/shared/types/api";

export default function DashboardPage() {
  const { t } = useTranslation();

  const dashboard = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get<AdminDashboard>("/analytics/dashboard/");
      return data;
    },
  });

  const risk = useQuery({
    queryKey: ["admin", "risk"],
    queryFn: async () => {
      const { data } = await api.get<RiskRow[]>("/analytics/risk-list/?limit=10");
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

  const overview = dashboard.data.overview;
  const outcomes = dashboard.data.outcomes;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.dashboard")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("admin.totalUsers")}
          value={overview.total_users ?? 0}
          hint={`${overview.active_users_30d ?? 0} ${t("admin.activeUsers").toLowerCase()}`}
          tone="brand"
        />
        <StatCard label={t("admin.students")} value={overview.students ?? 0} />
        <StatCard label={t("admin.employers")} value={overview.employers ?? 0} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("nav.courses")}
          value={overview.courses_published ?? 0}
          hint={
            overview.courses_pending
              ? `${overview.courses_pending} ${t("employer.pendingReview").toLowerCase()}`
              : undefined
          }
          tone={overview.courses_pending ? "warning" : "neutral"}
        />
        <StatCard
          label={t("nav.vacancies")}
          value={overview.vacancies_published ?? 0}
          hint={
            overview.vacancies_pending
              ? `${overview.vacancies_pending} ${t("employer.pendingReview").toLowerCase()}`
              : undefined
          }
          tone={overview.vacancies_pending ? "warning" : "neutral"}
        />
        <StatCard
          label={t("nav.applications")}
          value={overview.applications ?? 0}
        />
        <StatCard
          label={t("admin.step.placed")}
          value={outcomes.placements ?? 0}
          hint={`${outcomes.conversion_rate ?? 0}%`}
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("admin.funnel")} subtitle={t("admin.funnelHint")} />
          <FunnelChart
            data={dashboard.data.funnel.map((step) => ({
              ...step,
              step: t(`admin.step.${step.step}`, { defaultValue: step.step }),
            }))}
          />
        </Card>

        <Card>
          <CardHeader
            title={t("admin.skillDemand")}
            subtitle={t("admin.skillDemandHint")}
          />
          <DemandSupplyChart
            data={dashboard.data.skill_demand}
            labels={{
              demand: t("admin.skillDemand"),
              supply: t("skills.verified"),
            }}
          />
        </Card>
      </div>

      <Card padded={false}>
        <div className="p-5 pb-3">
          <CardHeader
            title={t("admin.riskList")}
            subtitle={t("admin.riskListHint")}
            action={
              <Link
                to="/admin/analytics"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {t("common.showMore")}
              </Link>
            }
          />
        </div>

        {risk.isLoading ? (
          <div className="p-5">
            <CardSkeleton rows={3} />
          </div>
        ) : (risk.data?.length ?? 0) === 0 ? (
          <div className="p-5">
            <EmptyState title={t("common.none")} />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("admin.students")}</Th>
                <Th>{t("auth.region")}</Th>
                <Th align="right">{t("admin.idleDays", { count: 0 }).replace("0", "")}</Th>
                <Th align="right">{t("plan.overdue")}</Th>
                <Th align="right">{t("admin.riskScore")}</Th>
              </tr>
            </thead>
            <tbody>
              {risk.data?.map((row) => (
                <tr key={row.user_id}>
                  <Td>
                    <div>
                      <p className="font-medium text-ink-800">{row.name || "—"}</p>
                      <p className="font-mono text-xs text-ink-400">{row.youth_id}</p>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-ink-500">{row.region ?? "—"}</span>
                  </Td>
                  <Td align="right">
                    <span className="tabular-nums">{row.idle_days}</span>
                  </Td>
                  <Td align="right">
                    <span className="tabular-nums">{row.overdue_tasks}</span>
                  </Td>
                  <Td align="right">
                    <Badge
                      tone={
                        row.risk_score >= 70
                          ? "danger"
                          : row.risk_score >= 40
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {row.risk_score}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
