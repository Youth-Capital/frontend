import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

import { LessonVideo } from "./LessonVideo";
import { Tile, type TileHue } from "@/shared/ui";
import type { CourseMaterial, MaterialKind } from "@/shared/types/api";

/**
 * What comes with the lesson.
 *
 * Two of the five kinds are shown rather than linked, and that is the point of
 * having them as separate kinds at all. A video plays here, so taking the
 * lesson does not mean leaving for YouTube — where the next thing on screen is
 * somebody else's video. An image is displayed, because a diagram you have to
 * download to look at is a diagram most people will not look at.
 *
 * The other three stay links, honestly labelled. A book is not offered as a
 * download: the platform does not have it, and a download button beside it
 * would be a promise nobody can keep.
 */

const KIND_HUE: Record<MaterialKind, TileHue> = {
  VIDEO: "pink",
  IMAGE: "sky",
  FILE: "peri",
  LINK: "blue",
  BOOK: "mauve",
};

const KIND_ICON: Record<MaterialKind, ReactNode> = {
  VIDEO: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
    </svg>
  ),
  IMAGE: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
      <path d="M4 17l4.5-4.5 3.5 3.5 3-3L20 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  FILE: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4zM14 3v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  LINK: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.1 0l2.9-2.9a5 5 0 0 0-7.1-7.1L11.5 4.5M14 11a5 5 0 0 0-7.1 0L4 13.9a5 5 0 0 0 7.1 7.1l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  BOOK: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19V6a2 2 0 0 1 2-2h12v15M6 19h12M6 19a2 2 0 0 0 2 2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export function LessonMaterials({ materials }: { materials: CourseMaterial[] }) {
  const { t } = useTranslation();

  if (!materials || materials.length === 0) return null;

  /*
   * Shown things first, then the list of links.
   *
   * A video sandwiched between two link rows reads as a row that happens to
   * be tall. Grouping them puts the things you look at together and the
   * things you click together, which is the actual difference between them.
   */
  const shown = materials.filter(
    (item) =>
      (item.kind === "VIDEO" && item.video) ||
      (item.kind === "IMAGE" && item.file_url),
  );
  const listed = materials.filter((item) => !shown.includes(item));

  return (
    <div className="card mt-4 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
        {t("courses.materials")}
      </p>

      {shown.length > 0 && (
        <div className="mb-4 flex flex-col gap-4">
          {shown.map((item) => (
            <figure key={item.id} className="m-0">
              {item.kind === "VIDEO" && item.video ? (
                <LessonVideo video={item.video} />
              ) : (
                <img
                  src={item.file_url ?? ""}
                  /* The author's title is the caption they wrote for this
                     picture, which makes it the best alt text available
                     without asking them for the same thing twice. */
                  alt={item.title}
                  loading="lazy"
                  className="w-full rounded-(--radius-control) object-contain"
                />
              )}
              <figcaption className="mt-1.5 text-sm text-ink-700">
                {item.title}
                {item.description && (
                  <span className="block text-xs text-ink-500">
                    {item.description}
                  </span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {listed.length > 0 && (
        <ul className="flex flex-col gap-2">
          {listed.map((item) => {
            const href = item.file_url ?? item.url;
            return (
              <li key={item.id} className="flex items-start gap-2.5">
                <Tile hue={KIND_HUE[item.kind]} size="sm">
                  {KIND_ICON[item.kind]}
                </Tile>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="min-w-0 truncate text-sm font-medium text-brand-700 hover:underline"
                        /* Offered as a download when we actually hold the
                           bytes — which now includes an uploaded book. A book
                           given only as a link is still somewhere to go, not
                           something to take, and gets no download attribute. */
                        {...(item.file_url ? { download: "" } : {})}
                      >
                        {item.title}
                      </a>
                    ) : (
                      <span className="min-w-0 truncate text-sm text-ink-800">
                        {item.title}
                      </span>
                    )}
                    <span className="text-xs text-ink-500">
                      {t(`courses.material_${item.kind}`)}
                    </span>
                    {item.file_size != null && (
                      <span className="text-xs tabular-nums text-ink-400">
                        {Math.max(1, Math.round(item.file_size / 1024))} KB
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-ink-500">{item.description}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
