import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import {
  Badge,
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  Modal,
  Tabs,
  Textarea,
} from "@/shared/ui";
import type { Course, Paginated, Test, Vacancy } from "@/shared/types/api";

type Tab = "vacancies" | "courses" | "tests" | "verification";

interface VerificationQueue {
  employers: {
    id: string;
    name: string;
    legal_name: string;
    tax_id: string;
    industry: string;
    email: string;
  }[];
  mentors: {
    id: string;
    name: string;
    headline: string;
    email: string;
    years_experience: number;
  }[];
}

export default function ModerationPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [tab, setTab] = useState<Tab>("vacancies");
  const [rejecting, setRejecting] = useState<{ kind: Tab; id: string } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const vacancies = useQuery({
    queryKey: ["moderation", "vacancies"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Vacancy>>(
        "/jobs/vacancies/?status=PENDING_REVIEW&page_size=50",
      );
      return data.results;
    },
  });

  const courses = useQuery({
    queryKey: ["moderation", "courses"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Course>>(
        "/learning/courses/?status=PENDING_REVIEW&page_size=50",
      );
      return data.results;
    },
  });

  const tests = useQuery({
    queryKey: ["moderation", "tests"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Test>>(
        "/assessment/tests/?status=PENDING_REVIEW&page_size=50",
      );
      return data.results;
    },
  });

  const verification = useQuery({
    queryKey: ["moderation", "verification"],
    queryFn: async () => {
      const { data } = await api.get<VerificationQueue>("/auth/admin/verification/");
      return data;
    },
  });

  const moderate = useMutation({
    mutationFn: async ({
      kind,
      id,
      approve,
      comment,
    }: {
      kind: Tab;
      id: string;
      approve: boolean;
      comment?: string;
    }) => {
      const endpoint =
        kind === "vacancies"
          ? `/jobs/vacancies/${id}/moderate/`
          : kind === "courses"
            ? `/learning/courses/${id}/moderate/`
            : `/assessment/tests/${id}/moderate/`;
      await api.post(endpoint, { approve, note: comment ?? "" });
    },
    onSuccess: () => {
      setRejecting(null);
      setNote("");
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["moderation"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const verify = useMutation({
    mutationFn: async ({
      kind,
      id,
      approve,
    }: {
      kind: "employer" | "mentor";
      id: string;
      approve: boolean;
    }) => {
      await api.post(`/auth/admin/verification/${kind}/`, { id, approve });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["moderation", "verification"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const counts = {
    vacancies: vacancies.data?.length ?? 0,
    courses: courses.data?.length ?? 0,
    tests: tests.data?.length ?? 0,
    verification:
      (verification.data?.employers.length ?? 0) +
      (verification.data?.mentors.length ?? 0),
  };

  const loading =
    tab === "vacancies"
      ? vacancies.isLoading
      : tab === "courses"
        ? courses.isLoading
        : tab === "tests"
          ? tests.isLoading
          : verification.isLoading;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.moderationQueue")}
      />

      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "vacancies", label: t("nav.vacancies"), count: counts.vacancies },
          { key: "courses", label: t("nav.courses"), count: counts.courses },
          { key: "tests", label: t("nav.tests"), count: counts.tests },
          {
            key: "verification",
            label: t("employer.company"),
            count: counts.verification,
          },
        ]}
      />

      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && <CardSkeleton rows={4} />}
      {!loading && counts[tab] === 0 && (
        <EmptyState title={t("admin.moderationEmpty")} />
      )}

      {tab === "vacancies" && (
        <div className="flex flex-col gap-3">
          {vacancies.data?.map((vacancy) => (
            <Card key={vacancy.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink-900">{vacancy.title}</h3>
                  <p className="text-sm text-ink-600">{vacancy.company.name}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-ink-500">
                    {vacancy.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {vacancy.required_skills.map((skill) => (
                      <Badge key={skill.id} tone="brand">
                        {skill.name} {skill.min_score}+
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 lg:flex-col">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() =>
                      moderate.mutate({
                        kind: "vacancies",
                        id: vacancy.id,
                        approve: true,
                      })
                    }
                  >
                    {t("admin.approve")}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRejecting({ kind: "vacancies", id: vacancy.id })}
                  >
                    {t("admin.reject")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "courses" && (
        <div className="flex flex-col gap-3">
          {courses.data?.map((course) => (
            <Card key={course.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold text-ink-900">{course.title}</h3>
                  <p className="text-sm text-ink-600">{course.provider_name}</p>
                  <p className="mt-2 line-clamp-3 text-sm text-ink-500">
                    {course.summary}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {course.skills.map((skill) => (
                      <Badge key={skill.id} tone="brand">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 lg:flex-col">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() =>
                      moderate.mutate({ kind: "courses", id: course.id, approve: true })
                    }
                  >
                    {t("admin.approve")}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRejecting({ kind: "courses", id: course.id })}
                  >
                    {t("admin.reject")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "tests" && (
        <div className="flex flex-col gap-3">
          {tests.data?.map((test) => (
            <Card key={test.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink-900">{test.title}</h3>
                    <Badge tone={test.type === "SCREENING" ? "warning" : "neutral"}>
                      {test.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-ink-600">{test.provider_name}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    {t("tests.questions", { count: test.question_count })} ·{" "}
                    {t("tests.passingScore", { score: test.passing_score })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2 lg:flex-col">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() =>
                      moderate.mutate({ kind: "tests", id: test.id, approve: true })
                    }
                  >
                    {t("admin.approve")}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRejecting({ kind: "tests", id: test.id })}
                  >
                    {t("admin.reject")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "verification" && (
        <div className="flex flex-col gap-3">
          {verification.data?.employers.map((employer) => (
            <Card key={employer.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div>
                  <h3 className="font-semibold text-ink-900">{employer.name}</h3>
                  <p className="text-sm text-ink-600">{employer.legal_name}</p>
                  <p className="text-xs text-ink-500">
                    {employer.industry} · {employer.tax_id} · {employer.email}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() =>
                      verify.mutate({ kind: "employer", id: employer.id, approve: true })
                    }
                  >
                    {t("admin.approve")}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      verify.mutate({ kind: "employer", id: employer.id, approve: false })
                    }
                  >
                    {t("admin.reject")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {verification.data?.mentors.map((mentor) => (
            <Card key={mentor.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div>
                  <h3 className="font-semibold text-ink-900">{mentor.name}</h3>
                  <p className="text-sm text-ink-600">{mentor.headline}</p>
                  <p className="text-xs text-ink-500">
                    {t("mentors.yearsExperience", { count: mentor.years_experience })} ·{" "}
                    {mentor.email}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() =>
                      verify.mutate({ kind: "mentor", id: mentor.id, approve: true })
                    }
                  >
                    {t("admin.approve")}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() =>
                      verify.mutate({ kind: "mentor", id: mentor.id, approve: false })
                    }
                  >
                    {t("admin.reject")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title={t("admin.rejectReason")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                rejecting &&
                moderate.mutate({
                  kind: rejecting.kind,
                  id: rejecting.id,
                  approve: false,
                  comment: note,
                })
              }
              loading={moderate.isPending}
            >
              {t("admin.reject")}
            </Button>
          </>
        }
      >
        <Textarea
          id="reject-note"
          label={t("admin.rejectReason")}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Modal>
    </div>
  );
}
