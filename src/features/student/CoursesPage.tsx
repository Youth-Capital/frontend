import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import {
  Card,
  CardSkeleton,
  EmptyState,
  Input,
  ProgressBar,
  Select,
  Tabs,
} from "@/shared/ui";
import type { Course, Enrollment, Paginated } from "@/shared/types/api";

type Tab = "catalog" | "mine";

export default function CoursesPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("catalog");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");

  const courses = useQuery({
    queryKey: ["courses", search, level],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "50" });
      if (search) params.set("search", search);
      if (level) params.set("level", level);
      const { data } = await api.get<Paginated<Course>>(
        `/learning/courses/?${params.toString()}`,
      );
      return data.results;
    },
    enabled: tab === "catalog",
  });

  const enrollments = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Enrollment>>(
        "/learning/my/enrollments/?page_size=50",
      );
      return data.results;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("courses.title")}
        subtitle={t("courses.subtitle")}
      />

      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "catalog", label: t("courses.catalog") },
          {
            key: "mine",
            label: t("courses.myCourses"),
            count: enrollments.data?.length ?? 0,
          },
        ]}
      />

      {tab === "catalog" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Input
                id="course-search"
                placeholder={t("common.search")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select
              id="course-level"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option value="">{t("common.all")}</option>
              <option value="BEGINNER">{t("courses.level_BEGINNER")}</option>
              <option value="INTERMEDIATE">{t("courses.level_INTERMEDIATE")}</option>
              <option value="ADVANCED">{t("courses.level_ADVANCED")}</option>
            </Select>
          </div>

          {courses.isLoading && <CardSkeleton rows={4} />}
          {!courses.isLoading && (courses.data?.length ?? 0) === 0 && (
            <EmptyState title={t("courses.empty")} />
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.data?.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </>
      )}

      {tab === "mine" && (
        <>
          {enrollments.isLoading && <CardSkeleton rows={4} />}
          {!enrollments.isLoading && (enrollments.data?.length ?? 0) === 0 && (
            <EmptyState title={t("courses.myEmpty")} />
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {enrollments.data?.map((enrollment) => (
              <CourseCard
                key={enrollment.id}
                course={enrollment.course_detail}
                progress={enrollment.progress}
                status={enrollment.status}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CourseCard({
  course,
  progress,
  status,
}: {
  course: Course;
  progress?: number;
  status?: string;
}) {
  const { t } = useTranslation();
  const currentProgress = progress ?? course.my_enrollment?.progress;
  const currentStatus = status ?? course.my_enrollment?.status;

  const external = Boolean(course.external_url);

  return (
    <CourseLink course={course}>
      {/*
        The card carried six chips: a level, a certificate star, three skills
        and an overflow count — plus the words "opens on Coursera" repeated
        under every one of them. Nine cards made a paint chart of twenty-seven
        pills saying things that are the same on most of them.

        What is left is what differs between two cards: the title, what it is
        about, which skills it teaches, and the one figure worth comparing.
        Everything else is one quiet line. The arrow is the only mark, and it
        says the one thing the learner cannot otherwise know before clicking —
        that this link leaves the platform.
      */}
      <Card className="glass-lift flex h-full flex-col">
        <h3 className="leading-snug font-semibold text-ink-900">
          {course.title}
          {external && (
            <span aria-hidden className="ml-1.5 text-ink-500">
              ↗
            </span>
          )}
          {course.is_certified && (
            <>
              <span aria-hidden className="ml-1.5 text-accent-solid">
                ★
              </span>
              <span className="sr-only">{t("courses.certificate")}</span>
            </>
          )}
        </h3>

        <p className="mt-1.5 line-clamp-2 text-sm text-ink-500">
          {course.summary}
        </p>

        {course.skills.length > 0 && (
          <p className="mt-2 truncate text-xs text-ink-500">
            {course.skills.map((skill) => skill.name).join(" · ")}
          </p>
        )}

        <div className="mt-auto pt-4">
          {currentProgress !== undefined && currentStatus !== undefined && (
            <div className="mb-2">
              <ProgressBar
                value={currentProgress}
                showLabel
                size="sm"
                tone={currentStatus === "COMPLETED" ? "success" : "brand"}
              />
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 text-xs text-ink-500">
            <span className="truncate">
              {[t(`courses.level_${course.level}`), course.provider_name]
                .filter(Boolean)
                .join(" · ")}
            </span>
            {course.duration_minutes > 0 && (
              <span className="shrink-0 tabular-nums">
                {t("common.minutes", { count: course.duration_minutes })}
              </span>
            )}
          </div>
        </div>
      </Card>
    </CourseLink>
  );
}

/**
 * A course taken on the partner's site opens there, in a new tab, so the
 * platform is still where the learner left it when they come back. Every
 * other course opens its page here.
 */
function CourseLink({ course, children }: { course: Course; children: ReactNode }) {
  const { t } = useTranslation();
  if (course.external_url) {
    return (
      <a
        href={course.external_url}
        target="_blank"
        rel="noreferrer noopener"
        className="block"
        aria-label={`${course.title} — ${t("courses.opensOn", { name: course.external_platform || course.provider_name })}`}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={`/student/courses/${course.id}`} className="block">
      {children}
    </Link>
  );
}
