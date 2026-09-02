import { useTranslation } from "react-i18next";

import { Badge } from "@/shared/ui";
import type { CourseMaterial } from "@/shared/types/api";

/**
 * What comes with the lesson: files to download, links to follow, books to find.
 *
 * A book is not offered as a download, because the platform does not have it —
 * it is a pointer at something the learner has to go and get, and a download
 * button beside it would be a promise nobody can keep.
 */
export function LessonMaterials({ materials }: { materials: CourseMaterial[] }) {
  const { t } = useTranslation();

  if (!materials || materials.length === 0) return null;

  return (
    <div className="mt-4 rounded-(--radius-card) border border-ink-200 bg-surface p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
        {t("courses.materials")}
      </p>
      <ul className="flex flex-col divide-y divide-ink-200">
        {materials.map((item) => {
          const href = item.kind === "FILE" ? item.file_url : item.url;
          return (
            <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item.kind === "FILE" ? "brand" : "neutral"}>
                  {t(`courses.material_${item.kind}`)}
                </Badge>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="min-w-0 truncate text-sm font-medium text-brand-600 hover:text-brand-700"
                    {...(item.kind === "FILE" ? { download: "" } : {})}
                  >
                    {item.title}
                  </a>
                ) : (
                  <span className="min-w-0 truncate text-sm text-ink-800">
                    {item.title}
                  </span>
                )}
                {item.file_size != null && (
                  <span className="text-xs tabular-nums text-ink-400">
                    {Math.max(1, Math.round(item.file_size / 1024))} KB
                  </span>
                )}
              </div>
              {item.description && (
                <p className="mt-0.5 text-xs text-ink-500">{item.description}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
