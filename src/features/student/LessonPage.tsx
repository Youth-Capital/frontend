import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { api, httpStatus } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { CardSkeleton, ErrorState } from "@/shared/ui";
import type { Course, Enrollment, Lesson, Paginated } from "@/shared/types/api";

import { LessonReader } from "./LessonReader";
import { NotesPanel } from "./notes/NotesPanel";

/**
 * One lesson, at its own address.
 *
 * It used to be a state flag on the course page, which meant a lesson had no
 * URL: it could not be linked to, the back button left the course instead of
 * the lesson, and a reload dropped the reader back to the contents. A lesson
 * is where a learner actually spends their time, so it gets a page.
 *
 * Moving between lessons navigates rather than swapping state, so the history
 * records the path through the course — back really does mean the previous
 * lesson.
 */
export default function LessonPage() {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    lessonId: string;
  }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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

  const lesson = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data } = await api.get<Lesson>(`/learning/lessons/${lessonId}/`);
      return data;
    },
    enabled: Boolean(lessonId),
  });

  const enrollment = enrollments.data?.find((item) => item.course === courseId);
  const completedLessons = new Set(
    (enrollment?.lesson_progress ?? [])
      .filter((progress) => progress.status === "COMPLETED")
      .map((progress) => progress.lesson),
  );

  const complete = useMutation({
    mutationFn: async () => {
      await api.post(`/learning/lessons/${lessonId}/complete/`, {
        seconds_spent: 60,
      });
    },
    onSuccess: () => {
      // A finished lesson can finish the course, which moves skills, knowledge,
      // capital and matches — so invalidate broadly rather than surgically.
      void queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["my-skills"] });
      void queryClient.invalidateQueries({ queryKey: ["knowledge"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const shell = notesOpen
    ? "flex flex-col gap-6 transition-[padding] sm:pr-88"
    : "flex flex-col gap-6 transition-[padding]";

  if (course.isLoading) return <CardSkeleton rows={8} />;

  if (course.isError || !course.data) {
    return (
      <ErrorState
        title={t("errors.loadFailed")}
        onRetry={() => void course.refetch()}
        retryLabel={t("common.retry")}
      />
    );
  }

  // A locked lesson answers 403 rather than arriving empty, and the page has
  // to say which of the two happened — "enrol to open this" is not the same
  // sentence as "something went wrong".
  const locked = [403, 404].includes(httpStatus(lesson.error) ?? 0);
  if (lesson.isError && locked) {
    return (
      <div className={shell}>
        <ErrorState
          title={t("errors.not_enrolled")}
          description={t("courses.lockedHint")}
          retryLabel={t("common.retry")}
        />
      </div>
    );
  }

  const data = course.data;
  const lessonOptions =
    data.modules?.flatMap((module) =>
      module.lessons.map((item) => ({ id: item.id, title: item.title })),
    ) ?? [];

  const goToLesson = (id: string) =>
    navigate(`/student/courses/${courseId}/lessons/${id}`);

  return (
    <div className={shell}>
      {error && <p className="text-sm text-danger">{error}</p>}

      <LessonReader
        course={data}
        lesson={lesson.data}
        loading={lesson.isLoading}
        currentLessonId={lessonId!}
        completedLessons={completedLessons}
        onSelect={goToLesson}
        onExit={() => navigate(`/student/courses/${courseId}`)}
        onComplete={() => complete.mutate()}
        completing={complete.isPending}
        canComplete={
          Boolean(enrollment) && !completedLessons.has(lessonId!)
        }
        completed={completedLessons.has(lessonId!)}
        onOpenNotes={() => setNotesOpen(true)}
      />

      <NotesPanel
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        courseId={data.id}
        courseTitle={data.title}
        lessons={lessonOptions}
        currentLessonId={lessonId!}
      />
    </div>
  );
}
