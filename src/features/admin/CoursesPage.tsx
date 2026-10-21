import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { formatDate } from "@/shared/lib/format";
import { PageHeader } from "@/shared/ui/PageHeader";
import {
  Badge,
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Table,
  Td,
  Th,
} from "@/shared/ui";
import type { Course, ModerationStatus, Paginated } from "@/shared/types/api";

const STATUSES: ModerationStatus[] = [
  "PENDING_REVIEW",
  "PUBLISHED",
  "DRAFT",
  "REJECTED",
  "ARCHIVED",
];

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  PUBLISHED: "success",
  PENDING_REVIEW: "warning",
  REJECTED: "danger",
};

/**
 * Every course on the platform, whoever sent it.
 *
 * The moderation queue only shows what is waiting; this is the whole shelf —
 * drafts, published, rejected — with the company and the person behind each
 * row, so a moderator can answer "who put this here?" without opening Django.
 */
export default function AdminCoursesPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const courses = useQuery({
    queryKey: ["admin-courses", search, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page_size: "100",
        ordering: "-created_at",
      });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const { data } = await api.get<Paginated<Course>>(
        `/learning/courses/?${params.toString()}`,
      );
      return data;
    },
  });

  const rows = courses.data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.allCourses")}
        subtitle={t("admin.allCoursesHint")}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Input
            id="course-search"
            aria-label={t("common.search")}
            placeholder={t("admin.courseSearch")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          id="course-status"
          aria-label={t("admin.status")}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">{t("common.all")}</option>
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              {t(`moderation.${option}`)}
            </option>
          ))}
        </Select>
      </div>

      {courses.isLoading && <CardSkeleton rows={6} />}
      {courses.isError && (
        <ErrorState
          title={t("errors.loadFailed")}
          onRetry={() => void courses.refetch()}
          retryLabel={t("common.retry")}
        />
      )}
      {courses.isSuccess && rows.length === 0 && (
        <EmptyState title={t("common.none")} />
      )}

      {rows.length > 0 && (
        <Card padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>{t("admin.course")}</Th>
                <Th>{t("admin.company")}</Th>
                <Th>{t("admin.author")}</Th>
                <Th>{t("admin.status")}</Th>
                <Th align="right">{t("admin.createdAt")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((course) => {
                const origin = course.origin;
                return (
                  <tr key={course.id}>
                    <Td>
                      <Link
                        to={`/admin/courses/${course.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {course.title}
                      </Link>
                      <p className="text-xs text-ink-500">
                        {t(`courses.level_${course.level}`, {
                          defaultValue: course.level,
                        })}{" "}
                        · {course.language.toUpperCase()} ·{" "}
                        {t("employer.students")}: {course.enrollment_count}
                      </p>
                    </Td>
                    <Td>
                      {origin?.company ? (
                        <>
                          <p className="text-ink-800">{origin.company.name}</p>
                          {origin.company.tax_id && (
                            <p className="text-xs text-ink-500">
                              {t("admin.taxId")}: {origin.company.tax_id}
                            </p>
                          )}
                        </>
                      ) : origin?.partner ? (
                        <p className="text-ink-800">
                          {origin.partner.name}{" "}
                          <span className="text-xs text-ink-500">
                            ({t("admin.partner")})
                          </span>
                        </p>
                      ) : (
                        <p className="text-ink-500">{t("admin.platformCourse")}</p>
                      )}
                    </Td>
                    <Td>
                      {origin?.author ? (
                        <>
                          <p className="text-ink-800">{origin.author.name}</p>
                          <p className="text-xs text-ink-500">{origin.author.email}</p>
                        </>
                      ) : (
                        <p className="text-ink-500">—</p>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[course.status] ?? "neutral"}>
                        {t(`moderation.${course.status}`, {
                          defaultValue: course.status,
                        })}
                      </Badge>
                    </Td>
                    <Td align="right">
                      <span className="text-xs tabular-nums text-ink-500">
                        {formatDate(course.created_at, i18n.resolvedLanguage)}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {courses.data && courses.data.count > rows.length && (
        <p className="text-sm text-ink-500">
          {t("admin.showingOf", { shown: rows.length, total: courses.data.count })}
        </p>
      )}
    </div>
  );
}
