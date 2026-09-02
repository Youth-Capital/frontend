import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { KnowledgeBars, TrendLine } from "@/shared/ui/charts";
import { scoreTone } from "@/shared/lib/format";
import {
  Badge,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  ProgressBar,
  StatCard,
  Table,
  Td,
  Th,
} from "@/shared/ui";
import type { KnowledgeOverview } from "@/shared/types/api";

interface HistoryPoint {
  date: string;
  skill: string;
  skill_id: string;
  score: number;
}

export default function KnowledgePage() {
  const { t } = useTranslation();

  const overview = useQuery({
    queryKey: ["knowledge", "overview"],
    queryFn: async () => {
      const { data } = await api.get<KnowledgeOverview>(
        "/knowledge/overview/?limit=30",
      );
      return data;
    },
  });

  const history = useQuery({
    queryKey: ["knowledge", "history"],
    queryFn: async () => {
      const { data } = await api.get<HistoryPoint[]>("/knowledge/history/?days=180");
      return data;
    },
  });

  if (overview.isLoading) return <CardSkeleton rows={6} />;

  const data = overview.data;
  const hasData = Boolean(data && data.topics.length > 0);

  /* Pivot the snapshot list into one row per date with a column per skill. */
  const trendSeries = Array.from(
    new Set((history.data ?? []).map((point) => point.skill)),
  ).slice(0, 5);

  const trendData = Object.values(
    (history.data ?? []).reduce<Record<string, Record<string, string | number>>>(
      (accumulator, point) => {
        accumulator[point.date] ??= { date: point.date };
        accumulator[point.date][point.skill] = point.score;
        return accumulator;
      },
      {},
    ),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("knowledge.title")}
        subtitle={t("knowledge.subtitle")}
      />

      {/* The explainer is load-bearing: it is what makes the number credible. */}
      <div className="rounded-(--radius-card) border border-info-soft bg-info-soft/40 p-4 text-sm text-ink-700">
        {t("knowledge.explainer")}
      </div>

      {!hasData ? (
        <EmptyState
          title={t("knowledge.empty")}
          description={t("knowledge.emptyHint")}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={t("knowledge.average")}
              value={`${data!.average_score}%`}
              tone={scoreTone(data!.average_score)}
            />
            <StatCard
              label={t("knowledge.trackedSkills")}
              value={data!.tracked_skills}
              tone="brand"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={t("knowledge.byTopic")} />
              <KnowledgeBars
                height={Math.max(220, data!.topics.length * 32)}
                data={data!.topics.map((topic) => ({
                  name: topic.skill,
                  score: topic.score,
                }))}
              />
            </Card>

            <Card>
              <CardHeader title={t("knowledge.byCategory")} />
              <div className="flex flex-col gap-3">
                {data!.by_category.map((row) => (
                  <div key={row.category}>
                    <ProgressBar
                      label={row.category}
                      value={row.score}
                      showLabel
                      tone={scoreTone(row.score)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {trendData.length > 1 && (
            <Card>
              <CardHeader title={t("knowledge.history")} />
              <TrendLine
                data={trendData.sort((a, b) =>
                  String(a.date).localeCompare(String(b.date)),
                )}
                series={trendSeries.map((skill) => ({ key: skill, label: skill }))}
              />
            </Card>
          )}

          <Card padded={false}>
            <div className="p-5 pb-0">
              <CardHeader title={t("knowledge.byTopic")} />
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>{t("skills.title")}</Th>
                  <Th>{t("nav.taxonomy")}</Th>
                  <Th align="right">{t("knowledge.average")}</Th>
                  <Th align="right">{t("skills.confidence")}</Th>
                  <Th align="right">{t("skills.evidence")}</Th>
                </tr>
              </thead>
              <tbody>
                {data!.topics.map((topic) => (
                  <tr key={topic.skill_id}>
                    <Td>
                      <span className="font-medium text-ink-800">{topic.skill}</span>
                    </Td>
                    <Td>
                      <span className="text-ink-500">{topic.category}</span>
                    </Td>
                    <Td align="right">
                      <Badge tone={scoreTone(topic.score)}>{topic.score}%</Badge>
                    </Td>
                    <Td align="right">
                      <span className="tabular-nums">
                        {Math.round(topic.confidence * 100)}%
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="tabular-nums text-ink-500">
                        {topic.evidence_count}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
