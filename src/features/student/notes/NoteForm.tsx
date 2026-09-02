import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button, Input, Select, Textarea } from "@/shared/ui";

import type { NoteDraft } from "./useNotes";

export interface LessonOption {
  id: string;
  title: string;
}

/**
 * Writing or editing one note.
 *
 * The same form in the course panel and on the notes page — the fields are
 * the same, so the component is too. Only the lesson list differs: inside a
 * course it is already loaded, on the page it arrives after the note is
 * opened, which is why `lessonsLoading` exists.
 */
export function NoteForm({
  note,
  courseId,
  lessons,
  lessonsLoading = false,
  defaultLessonId = null,
  saving,
  error,
  onSave,
  onCancel,
}: {
  note?: { id: string; lesson: string | null; title: string; content: string };
  courseId: string;
  lessons: LessonOption[];
  lessonsLoading?: boolean;
  defaultLessonId?: string | null;
  saving: boolean;
  error?: string;
  onSave: (draft: NoteDraft) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [lesson, setLesson] = useState(note?.lesson ?? defaultLessonId ?? "");

  // Opening a different note reuses this component, so the fields have to
  // follow it rather than keep the previous note's text.
  useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setLesson(note?.lesson ?? defaultLessonId ?? "");
  }, [note?.id, note?.title, note?.content, note?.lesson, defaultLessonId]);

  const empty = !content.trim();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (empty) return;
        onSave({
          id: note?.id,
          course: courseId,
          lesson: lesson || null,
          title: title.trim(),
          content: content.trim(),
        });
      }}
    >
      <Input
        id="note-title"
        value={title}
        maxLength={160}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t("notes.titlePlaceholder")}
        aria-label={t("notes.titleLabel")}
      />

      <Textarea
        id="note-content"
        value={content}
        rows={8}
        onChange={(event) => setContent(event.target.value)}
        placeholder={t("notes.contentPlaceholder")}
        aria-label={t("notes.contentLabel")}
        className="min-h-40"
      />

      <Select
        id="note-lesson"
        label={t("notes.lessonLabel")}
        value={lesson}
        disabled={lessonsLoading}
        onChange={(event) => setLesson(event.target.value)}
      >
        <option value="">{t("notes.wholeCourse")}</option>
        {lessons.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </Select>

      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" size="sm" loading={saving} disabled={empty}>
          {note ? t("notes.saveChanges") : t("notes.save")}
        </Button>
      </div>
    </form>
  );
}
