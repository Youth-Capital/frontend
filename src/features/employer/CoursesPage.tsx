import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import {
  Badge,
  Button,
  Card,
  CardSkeleton,
  EmptyState,
} from "@/shared/ui";
import type {
  Course,
  ModerationStatus,
  Paginated,
} from "@/shared/types/api";

const STATUS_TONE: Record<ModerationStatus, "neutral" | "warning" | "success" | "danger"> =
  {
    DRAFT: "neutral",
    PENDING_REVIEW: "warning",
    PUBLISHED: "success",
    REJECTED: "danger",
    ARCHIVED: "neutral",
  };

export default function CoursesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [error, setError] = useState("");
  const courses = useQuery({
    queryKey: ["employer-courses"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Course>>(
        "/learning/courses/?page_size=100",
      );
      return data.results;
    },
  });

  const submit = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/learning/courses/${id}/submit/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employer-courses"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const mine = (courses.data ?? []).filter(
    (course) => course.provider_type === "EMPLOYER",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">{t("employer.courses")}</h1>
        <Link to="/employer/courses/new">
          <Button>{t("employer.newCourse")}</Button>
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {courses.isLoading && <CardSkeleton rows={4} />}
      {!courses.isLoading && mine.length === 0 && (
        <EmptyState
          title={t("courses.empty")}
          action={
            <Link to="/employer/courses/new">
              <Button>{t("employer.newCourse")}</Button>
            </Link>
          }
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {mine.map((course) => (
          <Card key={course.id} className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-2">
              <Badge tone={STATUS_TONE[course.status]}>
                {t(`moderation.${course.status}`)}
              </Badge>
              <Badge tone="neutral">{t(`courses.level_${course.level}`)}</Badge>
            </div>

            <h3 className="mt-3 font-semibold text-ink-900">{course.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-ink-500">{course.summary}</p>

            {course.moderation_note && (
              <p className="mt-2 rounded-md bg-danger-soft px-2 py-1.5 text-xs text-danger">
                {t("employer.moderationNote")}: {course.moderation_note}
              </p>
            )}

            <div className="mt-3 text-xs text-ink-500">
              {course.enrollment_count} {t("employer.students").toLowerCase()} ·{" "}
              {course.completion_rate}% {t("employer.completions").toLowerCase()}
            </div>

            <div className="mt-auto flex gap-2 pt-4">
              {(course.status === "DRAFT" || course.status === "REJECTED") && (
                <Button
                  size="sm"
                  onClick={() => submit.mutate(course.id)}
                  loading={submit.isPending}
                >
                  {t("employer.publish")}
                </Button>
              )}
              {/* The whole course, not three numbers in a box: the figures
                  are on that page too, beside what they are about. */}
              <Link to={`/employer/courses/${course.id}`}>
                <Button variant="secondary" size="sm">
                  {t("employer.openCourse")}
                </Button>
              </Link>
              <Link to={`/employer/courses/${course.id}/edit`}>
                <Button variant="ghost" size="sm">
                  {t("common.edit")}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>


    </div>
  );
}
