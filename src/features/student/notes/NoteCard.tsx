import { useTranslation } from "react-i18next";

import { formatRelative } from "@/shared/lib/format";
import type { CourseNote } from "@/shared/types/api";

/**
 * One note in a list.
 *
 * Shows enough to recognise a note without opening it: what it is called, how
 * it starts, and where it was taken. The lesson line is the part people scan
 * for, so it stays even when the lesson itself is gone — a note filed against
 * a syllabus that has since changed reads as belonging to the course.
 */
export function NoteCard({
  note,
  onOpen,
  showCourse = false,
}: {
  note: CourseNote;
  onOpen: () => void;
  showCourse?: boolean;
}) {
  const { t, i18n } = useTranslation();

  // "0 seconds ago" is what a strict distance gives you right after saving,
  // which reads as a bug rather than as a timestamp.
  const seconds = (Date.now() - new Date(note.updated_at).getTime()) / 1000;
  const updated =
    seconds < 60
      ? t("notes.justNow")
      : t("notes.updatedAgo", {
          when: formatRelative(note.updated_at, i18n.resolvedLanguage),
        });

  const place = [
    showCourse ? note.course_title : null,
    note.lesson_title ?? t("notes.wholeCourse"),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-1.5 rounded-(--radius-card) border border-ink-200 bg-surface p-3.5 text-left transition-colors hover:border-brand-400"
    >
      <p className="truncate text-sm font-semibold text-ink-900">
        {note.title || t("notes.untitled")}
      </p>
      <p className="line-clamp-2 text-xs leading-relaxed text-ink-600">
        {note.content}
      </p>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pt-0.5 text-[11px] text-ink-500">
        <BookIcon />
        <span className="min-w-0 truncate">{place}</span>
        <span aria-hidden className="text-ink-300">
          ·
        </span>
        <span>{updated}</span>
      </p>
    </button>
  );
}

function BookIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-ink-400"
    >
      <path
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5v-14ZM4 19.5A1.5 1.5 0 0 1 5.5 18H19v2H5.5A1.5 1.5 0 0 1 4 19.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
