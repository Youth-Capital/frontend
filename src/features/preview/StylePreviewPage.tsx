import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { Badge, Card, CardSkeleton, ErrorState, Tabs } from "@/shared/ui";
import type { Course, Paginated } from "@/shared/types/api";

import "./glass.css";

/**
 * A frosted treatment of the course grid, shown next to the one we ship.
 *
 * Not a redesign — proposals on real data. Nothing here renders invented
 * content: real titles are longer than made-up ones and real summaries wrap,
 * which is exactly where a card either holds or falls apart.
 *
 * "Today" and "Frosted" put the same six courses side by side, so that
 * comparison is about the treatment alone. "Atlas" shows the dashboard
 * instead — its idea is the journey band, which has nowhere to live on a
 * course grid. The page says so, rather than pretending all three are the
 * same comparison.
 *
 * Reachable by URL only. Nothing links here, and the decision to adopt any of
 * it is not this page's to make.
 */

type Look = "current" | "glass";

/** Fill only, per card. Warm violet through amber — our family, no blues. */
const TINTS = ["#6C4AB6", "#9B7BD8", "#B45B9E", "#D26A72", "#FFB86B", "#E2A24A"];

export default function StylePreviewPage() {
  const { t } = useTranslation();
  const [look, setLook] = useState<Look>("glass");

  const courses = useQuery({
    queryKey: ["courses", "style-preview"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Course>>(
        "/learning/courses/?page_size=6",
      );
      return data.results;
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">
            {t("stylePreview.title")}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink-500">
            {t("stylePreview.subtitle")}
          </p>
        </div>
        <Tabs<Look>
          active={look}
          onChange={setLook}
          tabs={[
            { key: "current", label: t("stylePreview.current") },
            { key: "glass", label: t("stylePreview.glass") },
          ]}
        />
      </div>

      {courses.isLoading ? (
        <CardSkeleton rows={6} />
      ) : courses.isError ? (
        <ErrorState
          title={t("errors.loadFailed")}
          onRetry={() => void courses.refetch()}
          retryLabel={t("common.retry")}
        />
      ) : look === "glass" ? (
        <GlassStage courses={courses.data ?? []} />
      ) : (
        <PlainGrid courses={courses.data ?? []} />
      )}

      <p className="text-xs leading-relaxed text-ink-500">
        {t("stylePreview.note")}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- the proposal */

function GlassStage({ courses }: { courses: Course[] }) {
  const { t } = useTranslation();
  const stage = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);

  // The highlight is written straight to CSS variables rather than to React
  // state: this fires on every mouse move, and re-rendering six blurred cards
  // that often is how a page like this starts to feel heavy.
  const track = (event: React.MouseEvent<HTMLDivElement>) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    stage.current?.style.setProperty(
      "--mx",
      `${((event.clientX - box.left) / box.width) * 100}%`,
    );
    stage.current?.style.setProperty(
      "--my",
      `${((event.clientY - box.top) / box.height) * 100}%`,
    );
  };

  return (
    <div
      ref={stage}
      className="glass-stage -mx-4 p-4 sm:-mx-6 sm:p-8 lg:-mx-8"
      data-lit={lit}
      onMouseMove={track}
      onMouseEnter={() => setLit(true)}
      onMouseLeave={() => setLit(false)}
    >
      <div className="glass-panel flex flex-col gap-5 rounded-3xl p-4 shadow-2xl sm:p-6">
        <div className="glass-bar flex flex-wrap items-center gap-1 rounded-full p-1.5">
          <span className="rounded-full bg-ink-900 px-3.5 py-1.5 text-xs font-medium text-ink-50">
            {t("courses.title")}
          </span>
          {["courses.level_BEGINNER", "courses.level_INTERMEDIATE", "courses.level_ADVANCED"].map(
            (key) => (
              <span
                key={key}
                className="rounded-full px-3.5 py-1.5 text-xs text-ink-700 transition-colors hover:bg-surface/60"
              >
                {t(key)}
              </span>
            ),
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course, index) => (
            <GlassCard
              key={course.id}
              course={course}
              tint={TINTS[index % TINTS.length]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GlassCard({ course, tint }: { course: Course; tint: string }) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(false);

  return (
    <article
      className="glass-card relative flex flex-col gap-3 rounded-2xl p-4"
      style={{ "--tint": tint } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2">
          <span className="glass-tile flex h-11 w-11 items-center justify-center rounded-xl">
            <LevelGlyph level={course.level} />
          </span>
          <span className="glass-chip flex h-11 w-11 flex-col items-center justify-center rounded-xl leading-none">
            <span className="text-sm font-semibold tabular-nums text-ink-800">
              {course.skills.length}
            </span>
            <span className="mt-0.5 text-[9px] uppercase tracking-wide text-ink-500">
              {t("stylePreview.skillsShort")}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSaved((current) => !current)}
          aria-pressed={saved}
          aria-label={t("stylePreview.save")}
          className="rounded-full p-1 text-ink-400 transition-colors hover:text-ink-700"
        >
          <BookmarkGlyph filled={saved} />
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-ink-900">
          {course.title}
        </h3>
        <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-600">
          {course.summary || course.description}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="truncate text-[11px] text-ink-600">
          {course.provider_name}
        </span>
        <span className="shrink-0 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-medium tabular-nums text-ink-50">
          {course.duration_minutes} {t("stylePreview.minutes")}
        </span>
      </div>
    </article>
  );
}

/* --------------------------------------------------------- what we ship now */

function PlainGrid({ courses }: { courses: Course[] }) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <Card key={course.id}>
          <div className="flex items-start justify-between gap-2">
            <Badge tone="neutral">{t(`courses.level_${course.level}`)}</Badge>
            <span className="text-xs tabular-nums text-ink-400">
              {course.duration_minutes} {t("stylePreview.minutes")}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold leading-snug text-ink-900">
            {course.title}
          </h3>
          <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-ink-600">
            {course.summary || course.description}
          </p>
          <p className="mt-3 truncate text-[11px] text-ink-500">
            {course.provider_name}
          </p>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ glyphs */

function LevelGlyph({ level }: { level: Course["level"] }) {
  // Three bars, filled to the level — the same information the badge carries
  // in the current design, in the space a chip gives you.
  const filled = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 }[level] ?? 1;
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden>
      {[0, 1, 2].map((bar) => (
        <rect
          key={bar}
          x={2 + bar * 5}
          y={12 - (bar + 1) * 3}
          width="3"
          height={(bar + 1) * 3}
          rx="1"
          fill="currentColor"
          opacity={bar < filled ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}

function BookmarkGlyph({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4h10v16l-5-4-5 4V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}
