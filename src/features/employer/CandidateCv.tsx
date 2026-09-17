import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Button, Card, CardHeader } from "@/shared/ui";
import { CvRatingPanel } from "@/shared/ui/CvRating";
import type { CandidateDetail } from "@/shared/types/api";

/**
 * The candidate's résumé, and what the platform rates it at.
 *
 * The rating comes first and the document second, deliberately. An employer
 * reading forty candidates needs the comparable number before the prose; the
 * prose is for the four they shortlist. The breakdown ships without the tips —
 * "add a summary" is advice for the author, not for the reader.
 *
 * The document collapses by default for the same reason: a full CV inside a
 * page that already carries skills, evidence, tests and experience buries the
 * decision under scrolling.
 */
export function CandidateCv({ cv }: { cv: NonNullable<CandidateDetail["cv"]> }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const doc = cv.document;

  return (
    <Card>
      <CardHeader
        title={t("cvRating.candidateTitle")}
        action={
          <Button variant="secondary" size="sm" onClick={() => setOpen((value) => !value)}>
            {open ? t("cvRating.hideDocument") : t("cvRating.showDocument")}
          </Button>
        }
      />

      <CvRatingPanel
        rating={{
          overall: cv.rating.overall,
          band: cv.rating.band,
          components: cv.rating.components,
        }}
        showTips={false}
      />

      {open && (
        <div className="mt-5 border-t border-ink-200 pt-5">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-ink-900">
              {doc.personal.full_name || t("employer.anonymousCandidate")}
            </h3>
            {doc.personal.headline && (
              <p className="text-sm text-ink-600">{doc.personal.headline}</p>
            )}
            <p className="mt-1 text-xs text-ink-500">
              {[doc.personal.city, doc.personal.region, doc.contacts?.email]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          {doc.summary && (
            <CvSection title={t("cv.section.summary")}>
              <p className="text-sm text-ink-700">{doc.summary}</p>
            </CvSection>
          )}

          {(doc.skills?.length ?? 0) > 0 && (
            <CvSection title={t("cv.section.skills")}>
              <div className="flex flex-wrap gap-1.5">
                {doc.skills?.map((skill) => (
                  <Badge
                    key={skill.name}
                    tone={skill.verified ? "success" : "neutral"}
                  >
                    {skill.name} {skill.proficiency}
                    {skill.verified && " ✓"}
                  </Badge>
                ))}
              </div>
            </CvSection>
          )}

          {(doc.experience?.length ?? 0) > 0 && (
            <CvSection title={t("cv.section.experience")}>
              <ul className="flex flex-col gap-3">
                {doc.experience?.map((item, index) => (
                  <li key={index}>
                    <p className="text-sm font-medium text-ink-800">{item.title}</p>
                    <p className="text-xs text-ink-500">
                      {[
                        item.organization ||
                          (doc.meta.identified === false
                            ? t("employer.hiddenUntilApply")
                            : null),
                        t("experience.duration", { count: item.duration_months }),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {item.skills.length > 0 && (
                      <p className="mt-1 text-xs text-ink-400">
                        {item.skills.join(", ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </CvSection>
          )}

          {(doc.education?.length ?? 0) > 0 && (
            <CvSection title={t("cv.section.education")}>
              <ul className="flex flex-col gap-1.5">
                {doc.education?.map((item, index) => (
                  <li key={index} className="text-sm text-ink-700">
                    {item.degree || item.field_of_study}
                    {item.institution && (
                      <span className="text-ink-400"> · {item.institution}</span>
                    )}
                  </li>
                ))}
              </ul>
            </CvSection>
          )}

          {(doc.projects?.length ?? 0) > 0 && (
            <CvSection title={t("cv.section.projects")}>
              <ul className="flex flex-col gap-2">
                {doc.projects?.map((project, index) => (
                  <li key={index}>
                    <p className="text-sm font-medium text-ink-800">{project.title}</p>
                    {project.description && (
                      <p className="text-xs text-ink-500">{project.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </CvSection>
          )}

          {(doc.courses?.length ?? 0) > 0 && (
            <CvSection title={t("cv.section.courses")}>
              <ul className="flex flex-col gap-1.5">
                {doc.courses?.map((course, index) => (
                  <li key={index} className="text-sm text-ink-700">
                    {course.title}
                    <span className="text-ink-400"> · {course.provider}</span>
                  </li>
                ))}
              </ul>
            </CvSection>
          )}
        </div>
      )}
    </Card>
  );
}

function CvSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 first:mt-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
        {title}
      </p>
      {children}
    </section>
  );
}
