import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api, toApiError } from "@/shared/api/client";
import { LessonVideo } from "@/features/student/LessonVideo";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  Input,
  Textarea,
} from "@/shared/ui";
import type { CourseModule, Lesson, Paginated } from "@/shared/types/api";

/**
 * The contents of a course: sections, and the lessons inside them.
 *
 * A lesson opens into its own editor rather than a row of inputs, because a
 * lesson is a video link, a body and a transcript — three things of very
 * different sizes. The video is previewed straight away: a YouTube link that
 * turns out to be wrong is a thing to find out now, not from a learner.
 *
 * The transcript field is the honest half of the recap feature. The platform
 * cannot hear the video, so a revision recap can only be built from text
 * somebody supplied — and YouTube hands the author one.
 */
export function LessonEditor({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [newModule, setNewModule] = useState("");
  const [openLesson, setOpenLesson] = useState<string | null>(null);

  const modules = useQuery({
    queryKey: ["course-modules", courseId],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CourseModule>>(
        `/learning/modules/?course=${courseId}&page_size=100`,
      );
      return data.results;
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["course-modules", courseId] });
    void queryClient.invalidateQueries({ queryKey: ["employer-course"] });
  };

  const addModule = useMutation({
    mutationFn: async () => {
      await api.post("/learning/modules/", {
        course: courseId,
        title: newModule,
        order: modules.data?.length ?? 0,
      });
    },
    onSuccess: () => {
      setNewModule("");
      refresh();
    },
  });

  const removeModule = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/learning/modules/${id}/`);
    },
    onSuccess: refresh,
  });

  const addLesson = useMutation({
    mutationFn: async (module: CourseModule) => {
      const { data } = await api.post<Lesson>("/learning/lessons/", {
        module: module.id,
        title: t("courses.newLesson"),
        order: module.lessons.length,
      });
      return data;
    },
    onSuccess: (data) => {
      refresh();
      setOpenLesson(data.id);
    },
  });

  return (
    <Card>
      <CardHeader
        title={t("courses.contents")}
        subtitle={t("courses.contentsHint")}
      />

      {modules.isLoading && <CardSkeleton rows={4} />}

      <div className="flex flex-col gap-4">
        {modules.data?.map((module) => (
          <div
            key={module.id}
            className="rounded-(--radius-card) border border-ink-200 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-ink-900">{module.title}</h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => addLesson.mutate(module)}
                >
                  + {t("courses.lesson")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeModule.mutate(module.id)}
                >
                  {t("common.delete")}
                </Button>
              </div>
            </div>

            <ul className="mt-3 flex flex-col gap-2">
              {module.lessons.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenLesson(openLesson === item.id ? null : item.id)
                    }
                    className={
                      openLesson === item.id
                        ? "flex w-full items-center gap-3 rounded-xl border border-brand-400 px-3 py-2.5 text-left"
                        : "flex w-full items-center gap-3 rounded-xl border border-ink-200 px-3 py-2.5 text-left hover:border-brand-400"
                    }
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-800">
                      {item.title}
                    </span>
                    {item.has_video ? (
                      <Badge tone="brand">▶</Badge>
                    ) : (
                      <Badge tone="warning">{t("courses.noVideoYet")}</Badge>
                    )}
                  </button>

                  {openLesson === item.id && (
                    <OneLesson
                      lessonId={item.id}
                      onSaved={refresh}
                      onDeleted={() => {
                        setOpenLesson(null);
                        refresh();
                      }}
                    />
                  )}
                </li>
              ))}
              {module.lessons.length === 0 && (
                <li className="text-sm text-ink-500">{t("courses.noLessonsYet")}</li>
              )}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-52 flex-1">
          <Input
            id="new-module"
            label={t("courses.newModule")}
            value={newModule}
            onChange={(event) => setNewModule(event.target.value)}
          />
        </div>
        <Button
          onClick={() => addModule.mutate()}
          disabled={!newModule.trim() || addModule.isPending}
        >
          {t("common.add")}
        </Button>
      </div>
    </Card>
  );
}

/** One lesson, opened for editing. */
function OneLesson({
  lessonId,
  onSaved,
  onDeleted,
}: {
  lessonId: string;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState("");

  const lesson = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data } = await api.get<Lesson>(`/learning/lessons/${lessonId}/`);
      return data;
    },
  });

  const [form, setForm] = useState<null | {
    title: string;
    video_url: string;
    content: string;
    transcript: string;
    duration_minutes: number;
    is_free_preview: boolean;
  }>(null);

  if (lesson.data && form === null) {
    setForm({
      title: lesson.data.title,
      video_url: lesson.data.video_url ?? "",
      content: lesson.data.content ?? "",
      transcript: lesson.data.transcript ?? "",
      duration_minutes: lesson.data.duration_minutes,
      is_free_preview: lesson.data.is_free_preview,
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      await api.patch(`/learning/lessons/${lessonId}/`, form);
    },
    onSuccess: () => {
      setError("");
      onSaved();
    },
    onError: (err) =>
      setError(
        t(`errors.${toApiError(err).code}`, { defaultValue: t("errors.generic") }),
      ),
  });

  const remove = useMutation({
    mutationFn: async () => {
      await api.delete(`/learning/lessons/${lessonId}/`);
    },
    onSuccess: onDeleted,
  });

  if (lesson.isLoading || !form) {
    return <CardSkeleton rows={3} />;
  }

  return (
    <div className="mt-3 flex flex-col gap-4 rounded-(--radius-card) border border-ink-200 bg-surface p-4">
      <Input
        id={`lesson-title-${lessonId}`}
        label={t("courses.lessonTitle")}
        value={form.title}
        onChange={(event) => setForm({ ...form, title: event.target.value })}
      />

      <Input
        id={`lesson-video-${lessonId}`}
        label={t("courses.videoLink")}
        hint={t("courses.videoLinkHint")}
        value={form.video_url}
        onChange={(event) => setForm({ ...form, video_url: event.target.value })}
      />

      {/* Shown from the saved value: a preview of a link that has not been
          saved would be a preview of something no learner can see yet. */}
      {lesson.data?.video && <LessonVideo video={lesson.data.video} />}

      <Textarea
        id={`lesson-content-${lessonId}`}
        label={t("courses.lessonText")}
        rows={5}
        value={form.content}
        onChange={(event) => setForm({ ...form, content: event.target.value })}
      />

      <Textarea
        id={`lesson-transcript-${lessonId}`}
        label={t("courses.transcript")}
        hint={t("courses.transcriptHint")}
        rows={4}
        value={form.transcript}
        onChange={(event) => setForm({ ...form, transcript: event.target.value })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id={`lesson-duration-${lessonId}`}
          type="number"
          min={0}
          label={t("courses.duration")}
          value={form.duration_minutes}
          onChange={(event) =>
            setForm({ ...form, duration_minutes: Number(event.target.value) })
          }
        />
        <label className="flex items-end gap-2 pb-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={form.is_free_preview}
            onChange={(event) =>
              setForm({ ...form, is_free_preview: event.target.checked })
            }
          />
          {t("courses.freePreview")}
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => remove.mutate()}>
          {t("common.delete")}
        </Button>
        <Button onClick={() => save.mutate()} loading={save.isPending}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
