import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import {
  Badge,
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

  return (
    <Link to={`/student/courses/${course.id}`} className="block">
      <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <Badge tone="neutral">{t(`courses.level_${course.level}`)}</Badge>
          {course.is_certified && <Badge tone="brand">★</Badge>}
        </div>

        <h3 className="mt-3 font-semibold leading-snug text-ink-900">
          {course.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-ink-500">{course.summary}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {course.skills.slice(0, 3).map((skill) => (
            <Badge key={skill.id} tone="brand">
              {skill.name}
            </Badge>
          ))}
          {course.skills.length > 3 && (
            <Badge tone="neutral">+{course.skills.length - 3}</Badge>
          )}
        </div>

        <div className="mt-auto pt-4">
          {currentProgress !== undefined && currentStatus !== undefined ? (
            <>
              <ProgressBar
                value={currentProgress}
                showLabel
                size="sm"
                tone={currentStatus === "COMPLETED" ? "success" : "brand"}
              />
              <p className="mt-1.5 text-xs text-ink-500">
                {currentStatus === "COMPLETED"
                  ? t("courses.completed")
                  : t("courses.inProgress")}
              </p>
            </>
          ) : (
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span>{course.provider_name}</span>
              <span>{t("common.minutes", { count: course.duration_minutes })}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
