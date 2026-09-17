import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import { api } from "@/shared/api/client";
import { matchTone } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  Table,
  Tabs,
  Td,
  Th,
} from "@/shared/ui";
import { PageHeader } from "@/shared/ui/PageHeader";
import type { Paginated, Test, TestAttempt } from "@/shared/types/api";

type Tab = "todo" | "passed" | "results";
const TABS: Tab[] = ["todo", "passed", "results"];

const SOFT_SKILL = "SOFT_SKILL";

/**
 * Tests, split by where the learner stands with each one.
 *
 * It was one grid of every test with a table of attempts underneath. Two
 * questions people actually come here with — "what have I still got to do?"
 * and "what did I get?" — were answered by scrolling past the answer to the
 * other one. Three tabs: not yet passed, passed, and the results themselves.
 *
 * The tab lives in the URL (`?tab=results`), so the back button and a shared
 * link land on the same view rather than always on the first one.
 */
export default function TestsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : "todo";

  const tests = useQuery({
    queryKey: ["tests"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Test>>("/assessment/tests/?page_size=50");
      return data.results;
    },
  });

  const attempts = useQuery({
    queryKey: ["my-attempts"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<TestAttempt>>(
        "/assessment/attempts/?page_size=50",
      );
      return data.results;
    },
  });

  const all = tests.data ?? [];
  const passed = all.filter((test) => test.my_attempts?.passed);
  const todo = all.filter((test) => !test.my_attempts?.passed);

  /*
   * Only finished attempts are results.
   *
   * The list endpoint returns attempts in every state, and the old table
   * showed all of them — so a test somebody had only just opened, whose
   * `passed` is still the model default of false, sat in the results marked
   * "failed". An attempt in progress is not an outcome.
   */
  const finished = (attempts.data ?? []).filter((attempt) => attempt.status !== "IN_PROGRESS");

  /** Tests with an attempt still open — their button resumes, it does not retake. */
  const open = new Set(
    (attempts.data ?? [])
      .filter((attempt) => attempt.status === "IN_PROGRESS")
      .map((attempt) => attempt.test),
  );

  const loading = tests.isLoading || attempts.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("tests.title")} subtitle={t("tests.subtitle")} />

      <Tabs<Tab>
        active={tab}
        onChange={(next) => setParams(next === "todo" ? {} : { tab: next }, { replace: true })}
        tabs={[
          { key: "todo", label: t("tests.tabTodo"), count: todo.length },
          { key: "passed", label: t("tests.tabPassed"), count: passed.length },
          { key: "results", label: t("tests.tabResults"), count: finished.length },
        ]}
      />

      {loading ? (
        <CardSkeleton rows={4} />
      ) : tab === "results" ? (
        <Results attempts={finished} />
      ) : (
        <TestGrid
          tests={tab === "todo" ? todo : passed}
          open={open}
          empty={tab === "todo" ? t("tests.emptyTodo") : t("tests.emptyPassed")}
        />
      )}
    </div>
  );
}

function TestGrid({
  tests,
  open,
  empty,
}: {
  tests: Test[];
  open: Set<string>;
  empty: string;
}) {
  const { t } = useTranslation();

  if (tests.length === 0) return <EmptyState title={empty} />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {tests.map((test) => {
        const mine = test.my_attempts;
        const soft = test.type === SOFT_SKILL;
        const resuming = open.has(test.id);
        // An open attempt can always be resumed, even on the last attempt.
        const exhausted = !resuming && (mine ? mine.remaining <= 0 : false);

        return (
          <Card key={test.id} className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-2">
              <Badge tone="neutral">{test.provider_name}</Badge>
              {mine?.passed && (
                <Badge tone="success">{soft ? t("tests.completed") : t("tests.passed")}</Badge>
              )}
            </div>

            <h3 className="mt-3 font-semibold leading-snug text-ink-900">{test.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-ink-500">{test.description}</p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {test.skills.slice(0, 3).map((skill) => (
                <Badge key={skill.id} tone="brand">
                  {skill.skill_name}
                </Badge>
              ))}
            </div>

            <dl className="mt-4 space-y-1 text-xs text-ink-500">
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt>{t("tests.questions", { count: test.question_count })}</dt>
                <dd>{t("tests.timeLimit", { minutes: test.time_limit_minutes })}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-3">
                {/* A soft-skill assessment has no pass mark — showing "passing
                    score 60%" on it contradicted the page it opens. */}
                <dt>
                  {soft
                    ? t("tests.noPassMark")
                    : t("tests.passingScore", { score: test.passing_score })}
                </dt>
                <dd>
                  {mine
                    ? exhausted
                      ? t("tests.noAttempts")
                      : t("tests.attemptsLeft", { count: mine.remaining })
                    : null}
                </dd>
              </div>
            </dl>

            {mine && mine.used > 0 && !soft && (
              <p className="mt-2 text-xs font-medium text-ink-600">
                {t("tests.bestScore", { score: mine.best_percentage })}
              </p>
            )}

            <div className="mt-auto pt-4">
              <Link to={`/student/tests/${test.id}/run`} aria-disabled={exhausted}>
                <Button
                  fullWidth
                  disabled={exhausted}
                  variant={mine?.passed ? "secondary" : "primary"}
                >
                  {resuming
                    ? t("tests.resume")
                    : mine && mine.used > 0
                      ? t("tests.retake")
                      : t("tests.start")}
                </Button>
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Results({ attempts }: { attempts: TestAttempt[] }) {
  const { t, i18n } = useTranslation();

  if (attempts.length === 0) return <EmptyState title={t("tests.emptyResults")} />;

  return (
    <Card padded={false}>
      <Table>
        <thead>
          <tr>
            <Th>{t("tests.title")}</Th>
            <Th>{t("tests.date")}</Th>
            <Th align="center">{t("tests.attempt")}</Th>
            <Th align="right">{t("tests.yourScore")}</Th>
            <Th align="center">{t("tests.outcome")}</Th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((attempt) => {
            const soft = attempt.test_type === SOFT_SKILL;
            return (
              <tr key={attempt.id}>
                <Td>
                  <span className="font-medium text-ink-800">{attempt.test_title}</span>
                </Td>
                <Td>
                  <span className="tabular-nums text-ink-600">
                    {attempt.submitted_at
                      ? new Date(attempt.submitted_at).toLocaleDateString(i18n.language)
                      : "—"}
                  </span>
                </Td>
                <Td align="center">
                  <span className="tabular-nums text-ink-600">{attempt.attempt_no}</span>
                </Td>
                <Td align="right">
                  <Badge tone={soft ? "neutral" : matchTone(attempt.percentage)}>
                    {attempt.percentage}%
                  </Badge>
                </Td>
                <Td align="center">
                  <div className="flex flex-col items-center gap-1">
                    {soft ? (
                      <Badge tone="info">{t("tests.completed")}</Badge>
                    ) : attempt.passed ? (
                      <Badge tone="success">{t("tests.passed")}</Badge>
                    ) : (
                      <Badge tone="danger">{t("tests.failed")}</Badge>
                    )}
                    {/* Said as well as graded: a low score from running out of
                        time and a low score from wrong answers are different
                        things to work on. */}
                    {attempt.status === "EXPIRED" && (
                      <span className="text-[11px] text-ink-500">{t("tests.expired")}</span>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
