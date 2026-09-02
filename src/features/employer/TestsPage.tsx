import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { matchTone } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  Input,
  Modal,
  Select,
  Table,
  Td,
  Textarea,
  Th,
} from "@/shared/ui";
import type { Course, ModerationStatus, Paginated, Test } from "@/shared/types/api";

const STATUS_TONE: Record<ModerationStatus, "neutral" | "warning" | "success" | "danger"> =
  {
    DRAFT: "neutral",
    PENDING_REVIEW: "warning",
    PUBLISHED: "success",
    REJECTED: "danger",
    ARCHIVED: "neutral",
  };

interface TestResultRow {
  user_id: string;
  youth_id: string | null;
  attempt_no: number;
  percentage: number;
  passed: boolean;
  time_spent_seconds: number;
}

export default function TestsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [open, setOpen] = useState(false);
  const [resultsFor, setResultsFor] = useState<Test | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "SKILL_TEST",
    course: "",
    passing_score: 60,
    time_limit_minutes: 20,
    max_attempts: 3,
  });

  const tests = useQuery({
    queryKey: ["employer-tests"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Test>>(
        "/assessment/tests/?page_size=100",
      );
      return data.results;
    },
  });

  const courses = useQuery({
    queryKey: ["employer-courses"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Course>>(
        "/learning/courses/?page_size=100",
      );
      return data.results;
    },
  });

  const results = useQuery({
    queryKey: ["test-results", resultsFor?.id],
    queryFn: async () => {
      const { data } = await api.get<TestResultRow[]>(
        `/assessment/tests/${resultsFor!.id}/results/`,
      );
      return data;
    },
    enabled: Boolean(resultsFor),
  });

  const create = useMutation({
    mutationFn: async () => {
      await api.post("/assessment/tests/", {
        ...form,
        course: form.course || null,
      });
    },
    onSuccess: () => {
      setOpen(false);
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["employer-tests"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const submit = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/assessment/tests/${id}/submit-for-review/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employer-tests"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  // Ownership comes from the server, not from matching a display name — that
  // comparison broke the day the product was renamed.
  const mine = (tests.data ?? []).filter((test) => !test.is_platform);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">{t("employer.tests")}</h1>
        <Button onClick={() => setOpen(true)}>{t("employer.newTest")}</Button>
      </div>

      {/* The rule from docs/01-ANALYSIS.md §3.2, surfaced where it matters. */}
      <div className="rounded-(--radius-card) border border-info-soft bg-info-soft/40 p-3 text-sm text-ink-700">
        {t("tests.screeningNote")}
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {tests.isLoading && <CardSkeleton rows={4} />}
      {!tests.isLoading && mine.length === 0 && (
        <EmptyState
          title={t("tests.empty")}
          action={<Button onClick={() => setOpen(true)}>{t("employer.newTest")}</Button>}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {mine.map((test) => (
          <Card key={test.id} className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-2">
              <Badge tone={STATUS_TONE[test.status]}>
                {t(`moderation.${test.status}`)}
              </Badge>
              <Badge tone={test.type === "SCREENING" ? "warning" : "neutral"}>
                {test.type}
              </Badge>
            </div>

            <h3 className="mt-3 font-semibold text-ink-900">{test.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-ink-500">{test.description}</p>

            <dl className="mt-3 space-y-1 text-xs text-ink-500">
              <div className="flex justify-between">
                <dt>{t("tests.questions", { count: test.question_count })}</dt>
                <dd>{t("tests.timeLimit", { minutes: test.time_limit_minutes })}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t("tests.passingScore", { score: test.passing_score })}</dt>
              </div>
            </dl>

            <div className="mt-auto flex gap-2 pt-4">
              {(test.status === "DRAFT" || test.status === "REJECTED") && (
                <Button
                  size="sm"
                  onClick={() => submit.mutate(test.id)}
                  loading={submit.isPending}
                >
                  {t("employer.publish")}
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setResultsFor(test)}
              >
                {t("employer.results")}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("employer.newTest")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => create.mutate()}
              loading={create.isPending}
              disabled={!form.title.trim()}
            >
              {t("common.create")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="test-title"
            label={t("jobs.title")}
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <Textarea
            id="test-description"
            label={t("cv.summary")}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <Select
            id="test-type"
            label={t("experience.type")}
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          >
            <option value="SKILL_TEST">SKILL_TEST</option>
            <option value="COURSE_TEST">COURSE_TEST</option>
            <option value="SCREENING">SCREENING</option>
          </Select>
          {form.type === "COURSE_TEST" && (
            <Select
              id="test-course"
              label={t("nav.courses")}
              value={form.course}
              onChange={(event) => setForm({ ...form, course: event.target.value })}
            >
              <option value="">{t("common.notSpecified")}</option>
              {courses.data
                ?.filter((course) => course.provider_type === "EMPLOYER")
                .map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
            </Select>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              id="passing-score"
              type="number"
              min={0}
              max={100}
              label="%"
              value={form.passing_score}
              onChange={(event) =>
                setForm({ ...form, passing_score: Number(event.target.value) })
              }
            />
            <Input
              id="time-limit"
              type="number"
              min={1}
              label="min"
              value={form.time_limit_minutes}
              onChange={(event) =>
                setForm({ ...form, time_limit_minutes: Number(event.target.value) })
              }
            />
            <Input
              id="max-attempts"
              type="number"
              min={1}
              label="n"
              value={form.max_attempts}
              onChange={(event) =>
                setForm({ ...form, max_attempts: Number(event.target.value) })
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(resultsFor)}
        onClose={() => setResultsFor(null)}
        title={resultsFor?.title ?? ""}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setResultsFor(null)}>
            {t("common.close")}
          </Button>
        }
      >
        {results.isLoading ? (
          <CardSkeleton rows={4} />
        ) : (results.data?.length ?? 0) === 0 ? (
          <EmptyState title={t("common.none")} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("employer.participants")}</Th>
                <Th align="center">#</Th>
                <Th align="right">{t("tests.yourScore")}</Th>
                <Th align="center">{t("tests.passed")}</Th>
              </tr>
            </thead>
            <tbody>
              {results.data?.map((row) => (
                <tr key={`${row.user_id}-${row.attempt_no}`}>
                  <Td>
                    <span className="font-mono text-xs text-ink-600">
                      {row.youth_id ?? row.user_id.slice(0, 8)}
                    </span>
                  </Td>
                  <Td align="center">{row.attempt_no}</Td>
                  <Td align="right">
                    <Badge tone={matchTone(row.percentage)}>{row.percentage}%</Badge>
                  </Td>
                  <Td align="center">
                    {row.passed ? (
                      <Badge tone="success">✓</Badge>
                    ) : (
                      <Badge tone="danger">✗</Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal>
    </div>
  );
}
