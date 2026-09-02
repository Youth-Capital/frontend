import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { DemandSupplyChart, FunnelChart } from "@/shared/ui/charts";
import {
  Badge,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  ProgressBar,
  Select,
  StatCard,
  Table,
  Td,
  Th,
} from "@/shared/ui";
import type { RiskRow } from "@/shared/types/api";

interface CohortRow {
  segment: string;
  count: number;
  avg_profile_completion: number;
}

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [dimension, setDimension] = useState("region");
  const [inactiveDays, setInactiveDays] = useState("14");

  const funnel = useQuery({
    queryKey: ["analytics", "funnel"],
    queryFn: async () => {
      const { data } = await api.get<
        { step: string; count: number; rate: number }[]
      >("/analytics/funnel/");
      return data;
    },
  });

  const outcomes = useQuery({
    queryKey: ["analytics", "outcomes"],
    queryFn: async () => {
      const { data } = await api.get<Record<string, number>>("/analytics/outcomes/");
      return data;
    },
  });

  const cohorts = useQuery({
    queryKey: ["analytics", "cohorts", dimension],
    queryFn: async () => {
      const { data } = await api.get<{ dimension: string; rows: CohortRow[] }>(
        `/analytics/cohorts/?dimension=${dimension}`,
      );
      return data.rows;
    },
  });

  const demand = useQuery({
    queryKey: ["analytics", "skill-demand"],
    queryFn: async () => {
      const { data } = await api.get<
        {
          skill: string;
          skill_id: string;
          demand: number;
          supply: number;
          verified_supply: number;
          gap: number;
        }[]
      >("/analytics/skill-demand/?limit=20");
      return data;
    },
  });

  const risk = useQuery({
    queryKey: ["analytics", "risk", inactiveDays],
    queryFn: async () => {
      const { data } = await api.get<RiskRow[]>(
        `/analytics/risk-list/?inactive_days=${inactiveDays}&limit=100`,
      );
      return data;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("nav.analytics")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("nav.applications")}
          value={outcomes.data?.applications ?? 0}
        />
        <StatCard
          label={t("admin.step.placed")}
          value={outcomes.data?.hired ?? 0}
          hint={`${outcomes.data?.conversion_rate ?? 0}%`}
          tone="success"
        />
        <StatCard
          label="Retention 90"
          value={outcomes.data?.retention_90 ?? 0}
          tone="brand"
        />
        <StatCard
          label="Retention 180"
          value={outcomes.data?.retention_180 ?? 0}
          tone="brand"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("admin.funnel")} subtitle={t("admin.funnelHint")} />
          {funnel.isLoading ? (
            <CardSkeleton rows={4} />
          ) : (
            <>
              <FunnelChart
                data={(funnel.data ?? []).map((step) => ({
                  ...step,
                  step: t(`admin.step.${step.step}`, { defaultValue: step.step }),
                }))}
              />
              <div className="mt-3 flex flex-col gap-1.5">
                {funnel.data?.map((step) => (
                  <div
                    key={step.step}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-ink-600">
                      {t(`admin.step.${step.step}`, { defaultValue: step.step })}
                    </span>
                    <span className="tabular-nums text-ink-800">
                      {step.count}{" "}
                      <span className="text-ink-400">({step.rate}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHeader
            title={t("admin.skillDemand")}
            subtitle={t("admin.skillDemandHint")}
          />
          {demand.isLoading ? (
            <CardSkeleton rows={4} />
          ) : (
            <DemandSupplyChart
              data={demand.data ?? []}
              labels={{ demand: t("admin.skillDemand"), supply: t("skills.verified") }}
            />
          )}
        </Card>
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 p-5 pb-3 sm:flex-row sm:items-end sm:justify-between">
          <CardHeader title={t("admin.cohorts")} />
          <div className="w-56">
            <Select
              id="cohort-dimension"
              value={dimension}
              onChange={(event) => setDimension(event.target.value)}
            >
              <option value="region">{t("auth.region")}</option>
              <option value="education_status">{t("onboarding.educationStatus")}</option>
              <option value="employment_status">{t("nav.jobs")}</option>
              <option value="target_profession">{t("nav.professions")}</option>
              <option value="gender">gender</option>
            </Select>
          </div>
        </div>

        {cohorts.isLoading ? (
          <div className="p-5">
            <CardSkeleton rows={3} />
          </div>
        ) : (cohorts.data?.length ?? 0) === 0 ? (
          <div className="p-5">
            <EmptyState title={t("common.none")} />
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("admin.cohorts")}</Th>
                <Th align="right">{t("admin.students")}</Th>
                <Th>{t("dashboard.stats.profileCompletion")}</Th>
              </tr>
            </thead>
            <tbody>
              {cohorts.data?.map((row) => (
                <tr key={row.segment}>
                  <Td>
                    <span className="text-ink-800">
                      {t(`education.${row.segment}`, {
                        defaultValue: t(`employment.${row.segment}`, {
                          defaultValue: row.segment,
                        }),
                      })}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="tabular-nums font-medium">{row.count}</span>
                  </Td>
                  <Td>
                    <ProgressBar
                      value={row.avg_profile_completion}
                      showLabel
                      size="sm"
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card padded={false}>
        <div className="flex flex-col gap-3 p-5 pb-3 sm:flex-row sm:items-end sm:justify-between">
          <CardHeader title={t("admin.riskList")} subtitle={t("admin.riskListHint")} />
          <div className="w-44">
            <Select
              id="inactive-days"
              value={inactiveDays}
              onChange={(event) => setInactiveDays(event.target.value)}
            >
              <option value="7">7</option>
              <option value="14">14</option>
              <option value="30">30</option>
              <option value="60">60</option>
            </Select>
          </div>
        </div>

        {risk.isLoading ? (
          <div className="p-5">
            <CardSkeleton rows={4} />
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
                <Th>{t("nav.professions")}</Th>
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
                  <Td>{row.region ?? "—"}</Td>
                  <Td>{row.target_profession ?? "—"}</Td>
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
