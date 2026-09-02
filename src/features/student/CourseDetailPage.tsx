import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  ErrorState,
  ProgressBar,
} from "@/shared/ui";
import type { Course, Enrollment, Paginated } from "@/shared/types/api";

import { NoteIcon } from "./notes/NotesEmpty";
import { NotesPanel } from "./notes/NotesPanel";

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const describeError = useApiError();

  const [notesOpen, setNotesOpen] = useState(false);
  const [error, setError] = useState("");

  const course = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data } = await api.get<Course>(`/learning/courses/${courseId}/`);
      return data;
    },
    enabled: Boolean(courseId),
  });

  const enrollments = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Enrollment>>(
        "/learning/my/enrollments/?page_size=100",
      );
      return data.results;
    },
  });

  const enrollment = enrollments.data?.find((item) => item.course === courseId);
  const completedLessons = new Set(
    (enrollment?.lesson_progress ?? [])
      .filter((progress) => progress.status === "COMPLETED")
      .map((progress) => progress.lesson),
  );

  const enroll = useMutation({
    mutationFn: async () => {
      await api.post(`/learning/courses/${courseId}/enroll/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      void queryClient.invalidateQueries({ queryKey: ["course", courseId] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  if (course.isLoading) return <CardSkeleton rows={8} />;
  if (course.isError || !course.data) {
    return (
      <ErrorState
        title={t("errors.loadFailed")}
        onRetry={() => void course.refetch()}
      />
    );
  }

  const data = course.data;
  const totalLessons =
    data.modules?.reduce((sum, module) => sum + module.lessons.length, 0) ?? 0;

  const lessonOptions =
    data.modules?.flatMap((module) =>
      module.lessons.map((item) => ({ id: item.id, title: item.title })),
    ) ?? [];

  const shell =
    notesOpen
      ? "flex flex-col gap-6 transition-[padding] sm:pr-88"
      : "flex flex-col gap-6 transition-[padding]";

  return (
    <div className={shell}>
      <Link
        to="/student/courses"
        className="text-sm text-brand-600 hover:text-brand-700"
      >
        ← {t("common.back")}
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{t(`courses.level_${data.level}`)}</Badge>
            <span className="text-sm text-ink-500">{data.provider_name}</span>
            {data.is_certified && <Badge tone="brand">{t("courses.certificate")}</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-ink-900">{data.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-600">{data.description}</p>
        </div>

        <div className="w-full shrink-0 lg:w-64">
          <Card>
            {enrollment ? (
              <>
                <ProgressBar
                  value={enrollment.progress}
                  showLabel
                  label={t("plan.progress")}
                  tone={enrollment.status === "COMPLETED" ? "success" : "brand"}
                />
                <p className="mt-2 text-xs text-ink-500">
                  {completedLessons.size} / {totalLessons} {t("courses.lessons")}
                </p>
                {enrollment.status === "COMPLETED" && (
                  <p className="mt-3 rounded-md bg-success-soft px-3 py-2 text-xs text-success">
                    {t("courses.courseCompleted")}
                  </p>
                )}
              </>
            ) : (
              <Button
                fullWidth
                onClick={() => enroll.mutate()}
                loading={enroll.isPending}
              >
                {t("courses.enroll")}
              </Button>
            )}

            <Button
              fullWidth
              variant="secondary"
              size="sm"
              className="mt-3 gap-2"
              icon={<NoteIcon size={15} />}
              onClick={() => setNotesOpen(true)}
            >
              {t("notes.panelTitle")}
            </Button>

            {(data.tests?.length ?? 0) > 0 && (
              <div className="mt-4 border-t border-ink-200 pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                  {t("nav.tests")}
                </p>
                {data.tests?.map((test) => (
                  <Link
                    key={test.id}
                    to={`/student/tests/${test.id}/run`}
                    className="block rounded-md px-2 py-1.5 text-sm text-brand-600 hover:bg-brand-50"
                  >
                    {test.title}
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <CardHeader title={t("courses.skillsYouGain")} />
        <div className="flex flex-wrap gap-2">
          {data.skills.map((skill) => (
            <Badge key={skill.id} tone="brand">
              {skill.name}
            </Badge>
          ))}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {data.modules?.map((module) => (
          <Card key={module.id}>
            <CardHeader
              title={module.title}
              subtitle={`${module.lessons.length} ${t("courses.lessons").toLowerCase()}`}
            />
            <ul className="flex flex-col gap-1.5">
              {module.lessons.map((item) => {
                const done = completedLessons.has(item.id);
                const locked = !enrollment && !item.is_free_preview;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() =>
                        navigate(
                          `/student/courses/${courseId}/lessons/${item.id}`,
                        )
                      }
                      className={
                        locked
                          ? "flex w-full cursor-not-allowed items-center gap-3 rounded-xl border border-ink-200 px-3 py-2.5 text-left opacity-60"
                          : "flex w-full items-center gap-3 rounded-xl border border-ink-200 px-3 py-2.5 text-left hover:border-brand-400"
                      }
                    >
                      <span
                        className={
                          done
                            ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-on-colour"
                            : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink-300"
                        }
                      >
                        {done && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M5 13l4 4L19 7"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-800">
                        {item.title}
                      </span>
                      {item.is_free_preview && !enrollment && (
                        <Badge tone="success">{t("courses.freePreview")}</Badge>
                      )}
                      {locked && <Badge tone="neutral">{t("courses.locked")}</Badge>}
                      <span className="shrink-0 text-xs text-ink-400">
                        {item.duration_minutes} min
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>

      <NotesPanel
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        courseId={data.id}
        courseTitle={data.title}
        lessons={lessonOptions}
        currentLessonId={null}
      />
    </div>
  );
}
