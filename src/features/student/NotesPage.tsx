import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import {
  Button,
  CardSkeleton,
  ErrorState,
  Input,
  Modal,
  Select,
} from "@/shared/ui";
import type { Course, CourseNote } from "@/shared/types/api";

import { ConfirmDeleteNote } from "./notes/ConfirmDeleteNote";
import { NoteCard } from "./notes/NoteCard";
import { NoteForm } from "./notes/NoteForm";
import { NotesEmpty } from "./notes/NotesEmpty";
import { useDeleteNote, useNotes, useSaveNote } from "./notes/useNotes";

/**
 * Everything the student has written, across every course.
 *
 * The course filter is built from a second, unfiltered query rather than from
 * the rows on screen. Deriving the options from the visible list would make
 * them disappear as soon as a search narrowed the results, which is exactly
 * when someone reaches for the filter.
 */
export default function NotesPage() {
  const { t } = useTranslation();
  const describeError = useApiError();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("");
  const [open, setOpen] = useState<CourseNote | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [error, setError] = useState("");

  const notes = useNotes({
    search: search.trim() || undefined,
    course: course || undefined,
  });
  const allNotes = useNotes({});

  const courses = Array.from(
    new Map(
      (allNotes.data ?? []).map((note) => [note.course, note.course_title]),
    ),
  );

  // The lesson dropdown needs the syllabus of whichever course the open note
  // belongs to, which is not known until a note is opened.
  const openCourseId = open?.course ?? null;
  const lessons = useQuery({
    queryKey: ["course", openCourseId],
    queryFn: async () => {
      const { data } = await api.get<Course>(`/learning/courses/${openCourseId}/`);
      return data;
    },
    enabled: Boolean(openCourseId),
  });

  const lessonOptions =
    lessons.data?.modules?.flatMap((module) =>
      module.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title })),
    ) ?? [];

  const save = useSaveNote({
    onSuccess: () => {
      setError("");
      setOpen(null);
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const remove = useDeleteNote({
    onSuccess: () => {
      setPendingDelete(null);
      setOpen(null);
    },
    onError: (caught) => {
      setPendingDelete(null);
      setError(describeError(caught));
    },
  });

  const editing = open ?? undefined;
  const filtering = Boolean(search.trim() || course);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("notes.title")}
        subtitle={t("notes.subtitle")}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            id="notes-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("notes.searchPlaceholder")}
            aria-label={t("notes.searchPlaceholder")}
          />
        </div>
        <div className="sm:w-56">
          <Select
            id="notes-course"
            value={course}
            onChange={(event) => setCourse(event.target.value)}
            aria-label={t("notes.allCourses")}
          >
            <option value="">{t("notes.allCourses")}</option>
            {courses.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {notes.isLoading ? (
        <CardSkeleton rows={5} />
      ) : notes.isError ? (
        <ErrorState
          title={t("errors.loadFailed")}
          onRetry={() => void notes.refetch()}
          retryLabel={t("common.retry")}
        />
      ) : (notes.data?.length ?? 0) === 0 ? (
        <NotesEmpty
          filtered={filtering}
          actionLabel={t("notes.browseCourses")}
          onCreate={() => navigate("/student/courses")}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {notes.data?.map((note) => (
            <NoteCard key={note.id} note={note} showCourse onOpen={() => setOpen(note)} />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => {
          setError("");
          setOpen(null);
        }}
        title={
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{editing?.title || t("notes.untitled")}</span>
            <span className="truncate text-xs font-normal text-ink-500">
              {editing?.course_title}
            </span>
          </span>
        }
      >
        {editing && (
          <>
            <NoteForm
              note={editing}
              courseId={editing.course}
              lessons={lessonOptions}
              lessonsLoading={lessons.isLoading}
              saving={save.isPending}
              error={error}
              onSave={(draft) => save.mutate(draft)}
              onCancel={() => {
                setError("");
                setOpen(null);
              }}
            />
            <div className="mt-4 border-t border-ink-200 pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-danger"
                onClick={() => setPendingDelete(editing.id)}
              >
                {t("notes.deleteAction")}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDeleteNote
        open={Boolean(pendingDelete)}
        deleting={remove.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
      />
    </div>
  );
}
