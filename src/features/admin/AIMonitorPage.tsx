import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  StatCard,
  Table,
  Td,
  Th,
} from "@/shared/ui";
import type { Paginated } from "@/shared/types/api";

interface Monitoring {
  requests_30d: number;
  by_use_case: { use_case: string; count: number }[];
  by_status: { status: string; count: number }[];
  avg_latency_ms: number;
  tokens: { in: number; out: number };
  safety_events: {
    rule: string;
    action: string;
    severity: string;
    count: number;
  }[];
  feedback: { rating: string; count: number }[];
  active_provider: { provider: string; name: string; model?: string };
}

interface WeightProfile {
  id: string;
  name: string;
  version: string;
  is_active: boolean;
  weights: Record<string, number>;
  min_score_to_notify: number;
  notes: string;
}

export default function AIMonitorPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const monitoring = useQuery({
    queryKey: ["ai", "monitoring"],
    queryFn: async () => {
      const { data } = await api.get<Monitoring>("/ai/monitoring/");
      return data;
    },
  });

  const profiles = useQuery({
    queryKey: ["match-weight-profiles"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<WeightProfile>>(
        "/matching/weight-profiles/",
      );
      return data.results;
    },
  });

  const activate = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/matching/weight-profiles/${id}/activate/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["match-weight-profiles"] });
    },
  });

  const refreshStale = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ refreshed: number }>(
        "/matching/weight-profiles/refresh-stale/",
        { batch_size: 500 },
      );
      return data;
    },
  });

  if (monitoring.isLoading) return <CardSkeleton rows={6} />;

  const data = monitoring.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.aiMonitoring")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("admin.requests30d")}
          value={data?.requests_30d ?? 0}
          tone="brand"
        />
        <StatCard
          label={t("admin.avgLatency")}
          value={`${data?.avg_latency_ms ?? 0} ms`}
        />
        <StatCard
          label={t("admin.safetyEvents")}
          value={data?.safety_events.reduce((sum, event) => sum + event.count, 0) ?? 0}
          tone={data?.safety_events.length ? "warning" : "neutral"}
        />
        <StatCard
          label={t("admin.activeProvider")}
          value={data?.active_provider.provider ?? "RULE_BASED"}
          hint={data?.active_provider.model}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("admin.byUseCase")} />
          {(data?.by_use_case.length ?? 0) === 0 ? (
            <EmptyState title={t("common.none")} />
          ) : (
            <div className="flex flex-col gap-2">
              {data?.by_use_case.map((row) => (
                <div
                  key={row.use_case}
                  className="flex items-center justify-between rounded-xl border border-ink-200 px-3 py-2 text-sm"
                >
                  <span className="text-ink-700">{row.use_case}</span>
                  <span className="font-medium tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title={t("admin.safetyEvents")}
            subtitle={t("assistant.disclaimer")}
          />
          {(data?.safety_events.length ?? 0) === 0 ? (
            <EmptyState title={t("common.none")} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>rule</Th>
                  <Th>action</Th>
                  <Th align="right">n</Th>
                </tr>
              </thead>
              <tbody>
                {data?.safety_events.map((event, index) => (
                  <tr key={index}>
                    <Td>{event.rule}</Td>
                    <Td>
                      <Badge
                        tone={event.action === "BLOCKED" ? "danger" : "warning"}
                      >
                        {event.action}
                      </Badge>
                    </Td>
                    <Td align="right">{event.count}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title={t("admin.matchWeights")}
          subtitle={t("admin.matchWeightsHint")}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refreshStale.mutate()}
              loading={refreshStale.isPending}
            >
              {t("common.retry")}
              {refreshStale.data ? ` (${refreshStale.data.refreshed})` : ""}
            </Button>
          }
        />

        {activate.isError && (
          <p role="alert" className="mb-3 text-sm text-danger">
            {describeError(activate.error)}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {profiles.data?.map((profile) => (
            <div
              key={profile.id}
              className={
                profile.is_active
                  ? "rounded-xl border-2 border-brand-500 bg-brand-50 p-3"
                  : "rounded-xl border border-ink-200 p-3"
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-900">{profile.name}</span>
                    <Badge tone="neutral">v{profile.version}</Badge>
                    {profile.is_active && <Badge tone="brand">✓</Badge>}
                  </div>
                  {profile.notes && (
                    <p className="mt-1 text-xs text-ink-500">{profile.notes}</p>
                  )}
                </div>
                {!profile.is_active && (
                  <Button
                    size="sm"
                    onClick={() => activate.mutate(profile.id)}
                    loading={activate.isPending}
                  >
                    {t("admin.activate_")}
                  </Button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(profile.weights).map(([key, value]) => (
                  <Badge key={key} tone="neutral">
                    {t(`match.${key}`, { defaultValue: key })}:{" "}
                    {Math.round(Number(value) * 100)}%
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
