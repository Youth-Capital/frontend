import { useTranslation } from "react-i18next";

import { Button, Tile } from "@/shared/ui";

/**
 * Nothing written yet.
 *
 * Two different situations wear the same clothes here: no notes at all, and
 * no notes matching the current filter. Telling someone "no notes yet" while
 * they have thirty in another lesson would read as data loss, so the filtered
 * case says what it actually means and offers no button.
 */
export function NotesEmpty({
  onCreate,
  actionLabel,
  filtered = false,
  compact = false,
}: {
  onCreate: () => void;
  /** Defaults to "create your first note"; the notes page sends you to a course. */
  actionLabel?: string;
  filtered?: boolean;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={
        compact
          ? // Inside the notes panel, which is already a surface: a fill here
            // would be a second pane with no gap between them, so the dashed
            // outline carries the empty slot on its own.
            "flex flex-col items-center gap-2 rounded-(--radius-card) border border-dashed border-ink-300 px-4 py-8 text-center"
          : // On the page it is a panel, so it frosts like one — but keeps the
            // dashed edge, which is the part that says "nothing here yet"
            // rather than "something failed to load".
            "glass flex flex-col items-center gap-3 rounded-(--radius-card) border-dashed border-ink-300 px-6 py-14 text-center"
      }
    >
      <Tile hue="peri">
        <NoteIcon size={20} />
      </Tile>
      <h3 className="text-sm font-semibold text-ink-800">
        {filtered ? t("notes.emptyFilteredTitle") : t("notes.emptyTitle")}
      </h3>
      <p className="max-w-xs text-xs leading-relaxed text-ink-500">
        {filtered ? t("notes.emptyFilteredHint") : t("notes.emptyHint")}
      </p>
      {!filtered && (
        <Button size="sm" className="mt-1" onClick={onCreate}>
          {actionLabel ?? t("notes.createFirst")}
        </Button>
      )}
    </div>
  );
}

/** The mark used for notes everywhere in the product: a page with lines. */
export function NoteIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 3h8l4 4v14H6V3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v4h4M9 12h6M9 16h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
