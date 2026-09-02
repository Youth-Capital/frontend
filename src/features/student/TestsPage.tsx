import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { matchTone } from "@/shared/lib/format";
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
import type { Paginated, Test, TestAttempt } from "@/shared/types/api";

export default function TestsPage() {
  const { t } = useTranslation();

  const tests = useQuery({
    queryKey: ["tests"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Test>>(
        "/assessment/tests/?page_size=50",
      );
      return data.results;
    },
  });

  const attempts = useQuery({
    queryKey: ["my-attempts"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<TestAttempt>>(
        "/assessment/attempts/?page_size=30",
      );
      return data.results;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("tests.title")}
        subtitle={t("tests.subtitle")}
      />

      {tests.isLoading && <CardSkeleton rows={4} />}
      {!tests.isLoading && (tests.data?.length ?? 0) === 0 && (
        <EmptyState title={t("tests.empty")} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tests.data?.map((test) => {
          const mine = test.my_attempts;
          const exhausted = mine ? mine.remaining <= 0 : false;

          return (
            <Card key={test.id} className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-2">
                <Badge tone="neutral">{test.provider_name}</Badge>
                {mine?.passed && <Badge tone="success">{t("tests.passed")}</Badge>}
              </div>

              <h3 className="mt-3 font-semibold leading-snug text-ink-900">
                {test.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-ink-500">
                {test.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {test.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill.id} tone="brand">
                    {skill.skill_name}
                  </Badge>
                ))}
              </div>

              <dl className="mt-4 space-y-1 text-xs text-ink-500">
                <div className="flex justify-between">
                  <dt>{t("tests.questions", { count: test.question_count })}</dt>
                  <dd>{t("tests.timeLimit", { minutes: test.time_limit_minutes })}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t("tests.passingScore", { score: test.passing_score })}</dt>
                  <dd>
                    {mine
                      ? exhausted
                        ? t("tests.noAttempts")
                        : t("tests.attemptsLeft", { count: mine.remaining })
                      : null}
                  </dd>
                </div>
              </dl>

              {mine && mine.used > 0 && (
                <p className="mt-2 text-xs font-medium text-ink-600">
                  {t("tests.bestScore", { score: mine.best_percentage })}
                </p>
              )}

              <div className="mt-auto pt-4">
                <Link to={`/student/tests/${test.id}/run`}>
                  <Button fullWidth disabled={exhausted} variant={mine?.passed ? "secondary" : "primary"}>
                    {mine && mine.used > 0 ? t("tests.retake") : t("tests.start")}
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {(attempts.data?.length ?? 0) > 0 && (
        <Card padded={false}>
          <div className="p-5 pb-3">
            <h2 className="text-base font-semibold text-ink-900">
              {t("tests.resultTitle")}
            </h2>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>{t("tests.title")}</Th>
                <Th align="center">#</Th>
                <Th align="right">{t("tests.yourScore")}</Th>
                <Th align="center">{t("common.yes")}/{t("common.no")}</Th>
              </tr>
            </thead>
            <tbody>
              {attempts.data?.map((attempt) => (
                <tr key={attempt.id}>
                  <Td>
                    <span className="font-medium text-ink-800">
                      {attempt.test_title}
                    </span>
                  </Td>
                  <Td align="center">
                    <span className="tabular-nums text-ink-500">
                      {attempt.attempt_no}
                    </span>
                  </Td>
                  <Td align="right">
                    <Badge tone={matchTone(attempt.percentage)}>
                      {attempt.percentage}%
                    </Badge>
                  </Td>
                  <Td align="center">
                    {attempt.passed ? (
                      <Badge tone="success">{t("tests.passed")}</Badge>
                    ) : (
                      <Badge tone="danger">{t("tests.failed")}</Badge>
                    )}
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
