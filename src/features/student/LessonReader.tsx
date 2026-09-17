import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApiError } from "@/shared/hooks/useApiError";
import { Badge, Button, CardSkeleton } from "@/shared/ui";
import type { Course, Lesson } from "@/shared/types/api";

import { NoteIcon } from "./notes/NotesEmpty";
import { useSaveNote } from "./notes/useNotes";
import { LessonTutor } from "./LessonTutor";

import "@/shared/styles/deep.css";
import { LessonCheck } from "./LessonCheck";
import { LessonMaterials } from "./LessonMaterials";
import { LessonRecap } from "./LessonRecap";
import { LessonVideo } from "./LessonVideo";

/**
 * Reading a lesson: the lesson, and your notes beside it.
 *
 * This replaced a dialog. A dialog is the wrong shape for something people
 * spend forty minutes inside: it covered the course it belonged to, it had to
 * be dismissed to reach the next lesson, and notes had to shove it sideways to
 * share the screen.
 *
 * There is no contents rail. Moving through a course is the arrows and the
 * link back to it — the syllabus already has a page of its own, and repeating
 * it here spent a fifth of the width on something nobody reads twice.
 */
export function LessonReader({
  course,
  lesson,
  loading,
  currentLessonId,
  completedLessons,
  onSelect,
  onExit,
  onComplete,
  completing,
  canComplete,
  completed,
  onOpenNotes,
}: {
  course: Course;
  lesson: Lesson | undefined;
  loading: boolean;
  currentLessonId: string;
  completedLessons: Set<string>;
  onSelect: (lessonId: string) => void;
  onExit: () => void;
  onComplete: () => void;
  completing: boolean;
  canComplete: boolean;
  /** Already finished — the reader should say so, not just go quiet. */
  completed: boolean;
  onOpenNotes: () => void;
}) {
  const { t } = useTranslation();

  const flat = (course.modules ?? []).flatMap((module) => module.lessons);
  const position = flat.findIndex((item) => item.id === currentLessonId);
  const previous = position > 0 ? flat[position - 1] : undefined;
  const next = position >= 0 ? flat[position + 1] : undefined;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <article className="min-w-0">
        <button
          type="button"
          onClick={onExit}
          className="mb-3 text-sm text-brand-600 hover:text-brand-700"
        >
          ← {course.title}
        </button>

        {loading || !lesson ? (
          <CardSkeleton rows={8} />
        ) : (
          <>
            {/*
              The lesson names itself before it plays anything.

              The video used to come first, and on a wide screen its 16:9 box
              is most of the viewport — so a learner landed on a page that said
              nothing about which lesson they were on until they scrolled. On
              its own page that is worse than it was inline, because the page
              *is* the lesson.
            */}
            <header className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                {position >= 0 &&
                  t("courses.lessonOf", { current: position + 1, total: flat.length })}
              </p>
              <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                <h1 className="font-display text-2xl font-semibold leading-tight text-ink-900">
                  {lesson.title}
                </h1>

                <div className="flex shrink-0 items-center gap-1.5">
                  {completedLessons.has(currentLessonId) && (
                    <Badge tone="success">{t("courses.lessonDone")}</Badge>
                  )}
                  <Arrow
                    label={t("courses.previousLesson")}
                    disabled={!previous}
                    onClick={() => previous && onSelect(previous.id)}
                  />
                  <Arrow
                    forward
                    label={t("courses.nextLesson")}
                    disabled={!next}
                    onClick={() => next && onSelect(next.id)}
                  />
                </div>
              </div>
            </header>

            {/* Only when there is media. Without it the block is a coloured
                rectangle pretending something is there. */}
            {lesson.video && <LessonVideo video={lesson.video} />}

            <div className="glass-raised rounded-(--radius-card) p-5">
              <h2 className="text-sm font-semibold text-ink-800">
                {t("courses.lessonContent")}
              </h2>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                {lesson.content}
              </div>

              {/* What comes with the lesson, and the way back into it: both
                  belong under the lesson, not on a separate screen. */}
              <LessonMaterials materials={lesson.materials ?? []} />
              <LessonRecap
                lessonId={lesson.id}
                available={lesson.has_recap_source}
              />

              {/* The questions sit between the lesson and the button that
                  closes it: "did this land?" is the last thing to ask before
                  calling a lesson finished. */}
              <LessonCheck
                lessonId={lesson.id}
                available={lesson.has_recap_source}
              />
            </div>

            {/* Finishing a lesson is a real event, so the reader marks it.
                Without this branch a completed lesson simply lost its button
                and said nothing — the learner had to go back to the list to
                find out whether it had counted. */}
            {canComplete ? (
              <div className="mt-4 flex justify-end">
                <Button onClick={onComplete} loading={completing}>
                  {t("courses.markComplete")}
                </Button>
              </div>
            ) : completed ? (
              <div className="mt-4 flex items-center justify-end gap-2 text-sm text-success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t("courses.lessonDone")}
              </div>
            ) : null}
          </>
        )}
      </article>

      <div className="lg:sticky lg:top-20">
        <LessonNotes
          courseId={course.id}
          lessonId={currentLessonId}
          onOpenAll={onOpenNotes}
        />

        {/* Under the notes, because writing something down and asking
            about something are the same pause in the same lesson. */}
        <LessonTutor lessonId={currentLessonId} />
      </div>
    </div>
  );
}

/** One step through the course. Disabled at either end rather than hidden,
 *  so the pair does not jump around as you move between lessons. */
function Arrow({
  label,
  forward = false,
  disabled,
  onClick,
}: {
  label: string;
  forward?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-300 text-ink-600 transition-colors hover:border-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:border-ink-200 disabled:text-ink-300"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d={forward ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/**
 * Notes for this lesson, without leaving it.
 *
 * The drawer is still there for reading and organising everything; this is the
 * other half — writing a line the moment it occurs to you. Anything typed here
 * is filed against the lesson on screen, which is what people mean when they
 * say "note this down" while studying.
 */
function LessonNotes({
  courseId,
  lessonId,
  onOpenAll,
}: {
  courseId: string;
  lessonId: string;
  onOpenAll: () => void;
}) {
  const { t } = useTranslation();
  const describeError = useApiError();

  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // A note belongs to the lesson it was written in, so switching lessons must
  // not carry a half-written one across.
  useEffect(() => {
    setText("");
    setSaved(false);
    setError("");
  }, [lessonId]);

  const save = useSaveNote({
    onSuccess: () => {
      setText("");
      setSaved(true);
      setError("");
    },
    onError: (caught) => setError(describeError(caught)),
  });

  return (
    <section
      className="rounded-(--radius-card) border p-4"
      style={{
        background: "color-mix(in oklab, var(--color-accent) 10%, var(--color-surface))",
        borderColor: "color-mix(in oklab, var(--color-accent) 30%, var(--color-surface))",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
          <NoteIcon size={14} />
          {t("courses.lessonNotes")}
        </h2>
        <button
          type="button"
          onClick={onOpenAll}
          className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
        >
          {t("common.all")}
        </button>
      </div>

      <textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setSaved(false);
        }}
        rows={5}
        placeholder={t("notes.contentPlaceholder")}
        aria-label={t("courses.lessonNotes")}
        className="mt-3 w-full rounded-(--radius-control) border border-ink-300 bg-surface/82 backdrop-blur-sm px-3 py-2 text-xs text-ink-800 placeholder:text-ink-400 focus:border-brand-500 focus:bg-surface"
      />

      {error && (
        <p role="alert" className="mt-2 text-[11px] text-danger">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-2 text-[11px] text-success">{t("courses.noteSaved")}</p>
      )}

      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          loading={save.isPending}
          disabled={!text.trim()}
          onClick={() =>
            save.mutate({
              course: courseId,
              lesson: lessonId,
              title: "",
              content: text.trim(),
            })
          }
        >
          {t("notes.save")}
        </Button>
      </div>
    </section>
  );
}
