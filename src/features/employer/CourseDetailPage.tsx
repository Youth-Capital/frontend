import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { api, httpStatus } from "@/shared/api/client";
import { LessonVideo } from "@/features/student/LessonVideo";
import { PageHeader } from "@/shared/ui/PageHeader";
import {
  Badge,
  Card,
  CardHeader,
  CardSkeleton,
  ErrorState,
  ProgressBar,
  StatCard,
} from "@/shared/ui";
import type { Course, Lesson } from "@/shared/types/api";

interface CourseAnalytics {
  enrolled: number;
  completed: number;
  in_progress: number;
  completion_rate: number;
  average_test_score: number;
  tests_passed: number;
}

/**
 * The whole course, as the company that owns it sees it.
 *
 * The employer used to get a modal with three numbers in it. Three numbers
 * cannot answer the questions an author actually has — is the video on that
 * lesson? which lessons are still empty? what does a learner see when they
 * open it? — so this is the course itself: every module, every lesson, the
 * video playing in place, and the figures alongside rather than instead.
 *
 * The lesson body is fetched only when a lesson is opened. A course is a
 * dozen lessons, and loading all of them to show a list of titles would make
 * the page slow at exactly the size where it starts being useful.
 */
export default function EmployerCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { t } = useTranslation();
  const [openLesson, setOpenLesson] = useState<string | null>(null);

  const course = useQuery({
    queryKey: ["employer-course", courseId],
    queryFn: async () => {
      const { data } = await api.get<Course>(`/learning/courses/${courseId}/`);
      return data;
    },
    enabled: Boolean(courseId),
  });

  const analytics = useQuery({
    queryKey: ["course-analytics", courseId],
    queryFn: async () => {
      const { data } = await api.get<CourseAnalytics>(
        `/learning/courses/${courseId}/analytics/`,
      );
      return data;
    },
    enabled: Boolean(courseId),
  });

  const lesson = useQuery({
    queryKey: ["lesson", openLesson],
    queryFn: async () => {
      const { data } = await api.get<Lesson>(`/learning/lessons/${openLesson}/`);
      return data;
    },
    enabled: Boolean(openLesson),
  });

  const back = (
    <Link
      to="/employer/courses"
      className="text-sm text-brand-600 hover:text-brand-700"
    >
      ← {t("nav.courses")}
    </Link>
  );

  if (course.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <CardSkeleton rows={8} />
      </div>
    );
  }

  if (course.isError || !course.data) {
    const gone = [403, 404].includes(httpStatus(course.error) ?? 0);
    return (
      <div className="flex flex-col gap-6">
        {back}
        <ErrorState
          title={gone ? t("courses.notYours") : t("errors.loadFailed")}
          description={gone ? t("courses.notYoursHint") : undefined}
          onRetry={gone ? undefined : () => void course.refetch()}
          retryLabel={t("common.retry")}
        />
      </div>
    );
  }

  const data = course.data;
  const lessons = data.modules?.flatMap((module) => module.lessons) ?? [];
  const withVideo = lessons.filter((item) => item.has_video).length;

  return (
    <div className="flex flex-col gap-6">
      {back}

      <PageHeader
        title={data.title}
        subtitle={data.summary}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={data.status === "PUBLISHED" ? "success" : "neutral"}>
              {t(`moderation.${data.status}`, { defaultValue: data.status })}
            </Badge>
            <Badge tone="neutral">
              {t(`courses.level_${data.level}`, { defaultValue: data.level })}
            </Badge>
          </div>
        }
      />

      {/* The figures, alongside the course rather than instead of it. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("employer.students")}
          value={String(analytics.data?.enrolled ?? 0)}
        />
        <StatCard
          label={t("employer.completions")}
          value={String(analytics.data?.completed ?? 0)}
        />
        <StatCard
          label={t("employer.averageScore")}
          value={`${analytics.data?.average_test_score ?? 0}%`}
        />
        {/* What the author is most likely here to check. */}
        <StatCard
          label={t("courses.lessonsWithVideo")}
          value={`${withVideo}/${lessons.length}`}
        />
      </div>

      {analytics.data && analytics.data.enrolled > 0 && (
        <Card>
          <CardHeader title={t("employer.completions")} />
          <ProgressBar
            value={analytics.data.completion_rate}
            showLabel
            tone="brand"
          />
        </Card>
      )}

      {(data.skills?.length ?? 0) > 0 && (
        <Card>
          <CardHeader title={t("courses.skillsYouGain")} />
          <div className="flex flex-wrap gap-1.5">
            {data.skills?.map((skill) => (
              <Badge key={skill.id} tone="brand">
                {skill.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* -------------------------------------------------- the course itself */}
      <div className="flex flex-col gap-4">
        {data.modules?.map((module) => (
          <Card key={module.id}>
            <CardHeader
              title={module.title}
              subtitle={`${module.lessons.length} ${t("courses.lessons").toLowerCase()}`}
            />
            <ul className="flex flex-col gap-2">
              {module.lessons.map((item) => {
                const isOpen = openLesson === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setOpenLesson(isOpen ? null : item.id)}
                      className={
                        isOpen
                          ? "flex w-full items-center gap-3 rounded-xl border border-brand-400 px-3 py-2.5 text-left"
                          : "flex w-full items-center gap-3 rounded-xl border border-ink-200 px-3 py-2.5 text-left hover:border-brand-400"
                      }
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-ink-800">
                        {item.title}
                      </span>
                      {item.has_video ? (
                        <Badge tone="brand">▶ {t("courses.video")}</Badge>
                      ) : (
                        <Badge tone="warning">{t("courses.noVideoYet")}</Badge>
                      )}
                      {item.is_free_preview && (
                        <Badge tone="success">{t("courses.freePreview")}</Badge>
                      )}
                      <span className="shrink-0 text-xs text-ink-400">
                        {item.duration_minutes} {t("common.minutesShort")}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="mt-3 rounded-(--radius-card) border border-ink-200 bg-surface p-4">
                        {lesson.isLoading && <CardSkeleton rows={4} />}
                        {lesson.isError && (
                          <p className="text-sm text-danger">
                            {t("errors.loadFailed")}
                          </p>
                        )}
                        {lesson.data && lesson.data.id === item.id && (
                          <>
                            {lesson.data.video ? (
                              <LessonVideo video={lesson.data.video} />
                            ) : (
                              <p className="mb-3 rounded-(--radius-card) border border-dashed border-ink-300 px-4 py-6 text-center text-sm text-ink-500">
                                {t("courses.noVideoHint")}
                              </p>
                            )}
                            {lesson.data.content ? (
                              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
                                {lesson.data.content}
                              </p>
                            ) : (
                              <p className="text-sm text-ink-500">
                                {t("courses.noLessonText")}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>

      {(data.tests?.length ?? 0) > 0 && (
        <Card>
          <CardHeader title={t("nav.tests")} />
          <ul className="flex flex-col gap-1.5">
            {data.tests?.map((test) => (
              <li
                key={test.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-3 py-2.5"
              >
                <span className="min-w-0 truncate text-sm text-ink-800">
                  {test.title}
                </span>
                <span className="shrink-0 text-xs text-ink-400">
                  {t("tests.passingScore")}: {test.passing_score}%
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
