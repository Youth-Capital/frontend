import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import EmployerCourseDetailPage from "@/features/employer/CourseDetailPage";
import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatDate } from "@/shared/lib/format";
import { Badge, Button, Card, CardHeader, Modal, Textarea } from "@/shared/ui";
import type { Course } from "@/shared/types/api";

/**
 * One course, as the admin sees it: the same page the owning company gets,
 * with who sent it and the moderation decision on top.
 */
export default function AdminCourseDetailPage() {
  return (
    <EmployerCourseDetailPage
      backTo="/admin/courses"
      renderTop={(course) => <OriginPanel course={course} />}
    />
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink-800">{children}</dd>
    </div>
  );
}

function OriginPanel({ course }: { course: Course }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const moderate = useMutation({
    mutationFn: async ({ approve, comment }: { approve: boolean; comment?: string }) => {
      await api.post(`/learning/courses/${course.id}/moderate/`, {
        approve,
        note: comment ?? "",
      });
    },
    onSuccess: () => {
      setRejecting(false);
      setNote("");
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["employer-course", course.id] });
      void queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      void queryClient.invalidateQueries({ queryKey: ["moderation"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const origin = course.origin;
  const company = origin?.company;
  const author = origin?.author;
  const partner = origin?.partner;

  return (
    <>
      <Card>
        <CardHeader title={t("admin.origin")} />
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("admin.company")}>
            {company ? (
              <>
                <span className="font-medium">{company.name}</span>
                {company.legal_name !== company.name && (
                  <span className="block text-xs text-ink-500">{company.legal_name}</span>
                )}
                <span className="mt-1 flex flex-wrap gap-1">
                  <Badge tone={company.verification_status === "VERIFIED" ? "success" : "warning"}>
                    {t(`admin.companyStatus.${company.verification_status}`, {
                      defaultValue: company.verification_status,
                    })}
                  </Badge>
                </span>
              </>
            ) : partner ? (
              <>
                <span className="font-medium">{partner.name}</span>{" "}
                <span className="text-xs text-ink-500">({t("admin.partner")})</span>
                {partner.contact_email && (
                  <span className="block text-xs text-ink-500">{partner.contact_email}</span>
                )}
              </>
            ) : (
              t("admin.platformCourse")
            )}
          </Field>

          {company && (
            <Field label={t("admin.taxId")}>
              {company.tax_id || "вЂ”"}
              {company.industry && (
                <span className="block text-xs text-ink-500">{company.industry}</span>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block text-xs text-brand-700 hover:underline"
                >
                  {company.website}
                </a>
              )}
            </Field>
          )}

          <Field label={t("admin.author")}>
            {author ? (
              <>
                <span className="font-medium">{author.name}</span>
                <span className="block text-xs text-ink-500">{author.email}</span>
                {author.phone && (
                  <span className="block text-xs text-ink-500">{author.phone}</span>
                )}
                <span className="block text-xs text-ink-400">{t(`role.${author.role}`)}</span>
              </>
            ) : (
              "вЂ”"
            )}
          </Field>

          {course.external_url && (
            <Field label={t("admin.externalUrl")}>
              <a
                href={course.external_url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-brand-700 hover:underline"
              >
                {course.external_url}
              </a>
            </Field>
          )}

          <Field label={t("admin.createdAt")}>
            {formatDate(course.created_at, i18n.resolvedLanguage)}
          </Field>

          {course.published_at && (
            <Field label={t("moderation.PUBLISHED")}>
              {formatDate(course.published_at, i18n.resolvedLanguage)}
            </Field>
          )}

          {origin?.moderated_by && (
            <Field label={t("admin.moderatedBy")}>{origin.moderated_by.name}</Field>
          )}
        </dl>

        {course.moderation_note && (
          <p className="mt-4 rounded-xl bg-ink-100 px-3 py-2 text-sm text-ink-700">
            <span className="font-medium">{t("admin.rejectReason")}:</span>{" "}
            {course.moderation_note}
          </p>
        )}

        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        {course.status === "PENDING_REVIEW" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="success"
              size="sm"
              loading={moderate.isPending && !rejecting}
              onClick={() => moderate.mutate({ approve: true })}
            >
              {t("admin.approve")}
            </Button>
            <Button variant="danger" size="sm" onClick={() => setRejecting(true)}>
              {t("admin.reject")}
            </Button>
          </div>
        )}
      </Card>

      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title={t("admin.rejectReason")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              loading={moderate.isPending}
              onClick={() => moderate.mutate({ approve: false, comment: note })}
            >
              {t("admin.reject")}
            </Button>
          </>
        }
      >
        <Textarea
          id="course-reject-note"
          label={t("admin.rejectReason")}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Modal>
    </>
  );
}
