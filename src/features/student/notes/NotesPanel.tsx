import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useApiError } from "@/shared/hooks/useApiError";
import { Button, CardSkeleton, ErrorState } from "@/shared/ui";
import type { CourseNote } from "@/shared/types/api";

import { ConfirmDeleteNote } from "./ConfirmDeleteNote";
import { NoteCard } from "./NoteCard";
import { NoteForm, type LessonOption } from "./NoteForm";
import { NotesEmpty, NoteIcon } from "./NotesEmpty";
import { useDeleteNote, useNotes, useSaveNote } from "./useNotes";

/**
 * Notes alongside the lesson, not instead of it.
 *
 * On a wide screen this is a column pinned to the right edge; the course page
 * makes room for it rather than letting it cover anything, because a note is
 * usually written *about* something on screen. On a phone there is no room to
 * put two things side by side, so it becomes a sheet over the page.
 */

type Mode = { kind: "list" } | { kind: "new" } | { kind: "edit"; note: CourseNote };

export function NotesPanel({
  open,
  onClose,
  courseId,
  courseTitle,
  lessons,
  currentLessonId,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  lessons: LessonOption[];
  currentLessonId: string | null;
}) {
  const { t } = useTranslation();
  const describeError = useApiError();

  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // "Current lesson" is a moving target — following it as the student moves
  // through the course is the whole point of the option.
  const lessonFilter = filter === "current" ? (currentLessonId ?? undefined) : filter || undefined;

  const notes = useNotes({ course: courseId, lesson: lessonFilter }, open);

  const save = useSaveNote({
    onSuccess: () => {
      setError("");
      setMode({ kind: "list" });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const remove = useDeleteNote({
    onSuccess: () => {
      setPendingDelete(null);
      setMode({ kind: "list" });
    },
    onError: (caught) => {
      setPendingDelete(null);
      setError(describeError(caught));
    },
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Escape closes the panel, but not while a confirmation is waiting for
      // an answer — that dialog owns the key until it is dismissed.
      if (event.key === "Escape" && !pendingDelete) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, pendingDelete]);

  if (!open) return null;

  const editing = mode.kind === "edit" ? mode.note : undefined;

  return (
    <>
      {/* Phone only: the sheet covers the page, so it needs a way back. */}
      <div
        className="fixed inset-0 z-55 bg-ink-900/40 sm:hidden"
        onClick={onClose}
        aria-hidden
      />

      {/*
        `glass-raised` rather than the panel alpha, and the phone sheet is why.
        On a phone this floats over the scrim above, so what the glass frosts is
        the aurora *through* a 40% ink wash: at the panel's 68% that composite
        measures #D8D5E4, where ink-500 drops to 3.82:1 and a brand-700 link to
        4.34:1 — both below the weights they were solved for. At the raised 88%
        the same ground comes back to #F1EFF5 and 4.83 / 5.48:1. On the desktop
        rail it is also the right tier for a different reason: the page scrolls
        underneath this, and only the harder blur stops the text moving through.
      */}
      <aside
        aria-label={t("notes.panelTitle")}
        className="glass-raised fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top))] z-60 flex flex-col rounded-t-(--radius-card) pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:right-0 sm:top-14 sm:w-88 sm:rounded-none sm:border-y-0 sm:border-r-0 sm:pb-0"
      >
        <header className="flex items-start gap-3 border-b border-ink-200 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-ink-900">
              {t("notes.panelTitle")}
            </h2>
            <p className="mt-0.5 truncate text-xs text-ink-500">{courseTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
            aria-label={t("common.close")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {mode.kind === "list" ? (
          <>
            <div className="flex items-center gap-2 border-b border-ink-200 px-4 py-2.5">
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                aria-label={t("notes.filterLabel")}
                className="min-w-0 flex-1 rounded-(--radius-control) border border-ink-300 bg-surface/82 backdrop-blur-sm px-2.5 py-1.5 text-xs text-ink-700 focus:bg-surface"
              >
                <option value="">{t("notes.allNotes")}</option>
                {currentLessonId && (
                  <option value="current">{t("notes.currentLesson")}</option>
                )}
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={() => setMode({ kind: "new" })}>
                {t("notes.new")}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {error && (
                <p
                  role="alert"
                  className="mb-3 rounded-(--radius-control) bg-danger-soft px-3 py-2 text-xs text-danger"
                >
                  {error}
                </p>
              )}

              {notes.isLoading ? (
                <CardSkeleton rows={3} />
              ) : notes.isError ? (
                <ErrorState
                  title={t("errors.loadFailed")}
                  onRetry={() => void notes.refetch()}
                  retryLabel={t("common.retry")}
                />
              ) : (notes.data?.length ?? 0) === 0 ? (
                <NotesEmpty
                  compact
                  filtered={Boolean(lessonFilter)}
                  onCreate={() => setMode({ kind: "new" })}
                />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {notes.data?.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onOpen={() => setMode({ kind: "edit", note })}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-3.5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
                <NoteIcon size={14} />
                {editing ? t("notes.editHeading") : t("notes.newHeading")}
              </p>
              {editing && (
                <button
                  type="button"
                  onClick={() => setPendingDelete(editing.id)}
                  className="text-xs font-medium text-danger hover:underline"
                >
                  {t("common.delete")}
                </button>
              )}
            </div>

            <NoteForm
              note={editing}
              courseId={courseId}
              lessons={lessons}
              defaultLessonId={currentLessonId}
              saving={save.isPending}
              error={error}
              onSave={(draft) => save.mutate(draft)}
              onCancel={() => {
                setError("");
                setMode({ kind: "list" });
              }}
            />
          </div>
        )}
      </aside>

      <ConfirmDeleteNote
        open={Boolean(pendingDelete)}
        deleting={remove.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
      />
    </>
  );
}
