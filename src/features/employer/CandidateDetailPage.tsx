import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { api, httpStatus } from "@/shared/api/client";
import { CapabilityPanel } from "@/shared/ui/CapabilityPanel";
import { CandidateCv } from "./CandidateCv";
import { InviteToInterview } from "./InviteToInterview";
import { MatchExplanation } from "@/features/student/MatchExplanation";
import { matchTone } from "@/shared/lib/format";
import { PageHeader } from "@/shared/ui/PageHeader";
import {
  Badge,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  ErrorState,
  ProgressBar,
} from "@/shared/ui";
import type { CandidateDetail } from "@/shared/types/api";

/**
 * One candidate, in full.
 *
 * The list answers "who is worth looking at"; this page answers "should we
 * talk to this person", which is a different question and needs the evidence
 * rather than the summary. So the ordering is: the score and why it is what it
 * is, then this vacancy's own requirements met and unmet, then the person —
 * what they wrote, what they hold, what proves it.
 *
 * Every skill carries its trail. An employer reading "JavaScript 66" will ask
 * "says who?", and the platform's whole claim is that it can answer: a test
 * scored 76 and counts for 0.9, an internship scored 53 and counts for 0.7.
 * Hiding that would leave a number as unfounded as the CV it replaces.
 *
 * An anonymous candidate is not a broken one. The API withholds the name, the
 * photo, the free text, the university and the organisations, and this page
 * renders what remains without apology — capability is exactly what talent
 * search is allowed to show.
 */
export default function CandidateDetailPage() {
  const { vacancyId, userId } = useParams<{
    vacancyId: string;
    userId: string;
  }>();
  const { t } = useTranslation();

  const candidate = useQuery({
    queryKey: ["candidate", vacancyId, userId],
    queryFn: async () => {
      const { data } = await api.get<CandidateDetail>(
        `/jobs/vacancies/${vacancyId}/candidates/${userId}/`,
      );
      return data;
    },
    enabled: Boolean(vacancyId && userId),
  });

  const backLink = (
    <Link
      to={`/employer/vacancies/${vacancyId}/candidates`}
      className="text-sm text-brand-600 hover:text-brand-700"
    >
      ← {t("employer.backToCandidates")}
    </Link>
  );

  if (candidate.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <CardSkeleton rows={8} />
      </div>
    );
  }

  if (candidate.isError || !candidate.data) {
    const status = httpStatus(candidate.error);
    const gone = status === 403 || status === 404;
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <ErrorState
          title={
            gone
              ? t("employer.candidateNotAvailable")
              : t("errors.loadFailed")
          }
          description={gone ? t("employer.candidateNotAvailableHint") : undefined}
          onRetry={gone ? undefined : () => void candidate.refetch()}
          retryLabel={t("common.retry")}
        />
      </div>
    );
  }

  const person = candidate.data;
  const displayName = person.identified
    ? person.name
    : t("employer.anonymousCandidate");

  const subtitle = [
    person.youth_id,
    person.target_profession,
    person.region,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <PageHeader
        title={displayName}
        subtitle={subtitle}
        action={
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {person.has_applied ? (
                <Badge tone="brand">{t("jobs.applied")}</Badge>
              ) : (
                <Badge tone="neutral">{t("employer.foundBySearch")}</Badge>
              )}
              {person.open_to_work && (
                <Badge tone="success">{t("employer.openToWork")}</Badge>
              )}
              {!person.identified && (
                <Badge tone="neutral">🔒 {t("employer.hiddenIdentity")}</Badge>
              )}
            </div>

            <InviteToInterview
              vacancyId={vacancyId!}
              userId={person.user_id}
              alreadyApplied={person.has_applied}
              pendingInvite={person.invite?.status === "PENDING"}
            />
          </div>
        }
      />

      {person.invite?.status === "DECLINED" && (
        <div className="rounded-(--radius-card) border border-warning-soft bg-warning-soft/40 p-3 text-sm text-ink-700">
          {t("employer.inviteDeclined")}
          {person.invite.response_note && (
            <span className="text-ink-600"> — «{person.invite.response_note}»</span>
          )}
        </div>
      )}

      {/* -------------------------------------------------- the score */}
      <Card>
        <CardHeader
          title={t("match.overall")}
          action={
            <span
              className={`text-3xl font-bold tabular-nums ${
                matchTone(person.match.overall) === "success"
                  ? "text-success"
                  : matchTone(person.match.overall) === "warning"
                    ? "text-warning"
                    : "text-danger"
              }`}
            >
              {person.match.overall}%
            </span>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["coverage", person.match.coverage],
              ["knowledge", person.match.knowledge],
              ["verification", person.match.verification],
              ["experience", person.match.experience],
              ["education", person.match.education],
              ["location", person.match.location],
            ] as const
          ).map(([key, value]) => (
            <ProgressBar
              key={key}
              label={t(`match.${key}`)}
              value={value}
              showLabel
              size="sm"
              tone={matchTone(value)}
            />
          ))}
        </div>

        {person.explanation?.length > 0 && (
          <div className="mt-5">
            <SectionLabel>{t("employer.whyCandidate")}</SectionLabel>
            <MatchExplanation reasons={person.explanation} />
          </div>
        )}
      </Card>

      {/* ------------------------------------ this vacancy's requirements */}
      <Card>
        <CardHeader
          title={t("employer.againstThisVacancy")}
          subtitle={t("employer.againstThisVacancyHint")}
        />
        <div className="flex flex-col gap-4">
          <div>
            <SectionLabel>{t("jobs.youHaveCandidate")}</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {person.required_skills.filter((s) => s.met).length === 0 && (
                <p className="text-sm text-ink-500">{t("common.none")}</p>
              )}
              {person.required_skills
                .filter((skill) => skill.met)
                .map((skill) => (
                  <Badge
                    key={skill.skill_id}
                    tone={skill.verified ? "success" : "neutral"}
                  >
                    {skill.skill} {skill.current_level}
                    {skill.verified && " ✓"}
                  </Badge>
                ))}
            </div>
          </div>

          {person.missing_skills.length > 0 && (
            <div>
              <SectionLabel>{t("jobs.youMissCandidate")}</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {person.missing_skills.map((skill) => (
                  <Badge key={skill.skill_id} tone="danger">
                    {skill.skill} {skill.required_level}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ------------------------------------------------- about the person */}
      <Card>
        <CardHeader title={t("employer.aboutCandidate")} />
        {person.identified && person.bio ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
            {person.bio}
          </p>
        ) : (
          <p className="text-sm text-ink-500">
            {person.identified
              ? t("employer.noBio")
              : t("employer.bioHiddenUntilContact")}
          </p>
        )}

        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Fact
            label={t("employer.factEducation")}
            value={
              person.education_status
                ? t(`education.${person.education_status}`, {
                    defaultValue: person.education_status,
                  })
                : null
            }
          />
          <Fact
            label={t("employer.factInstitution")}
            value={person.identified ? person.institution : null}
            hidden={!person.identified}
            hiddenLabel={t("employer.hiddenUntilContact")}
          />
          <Fact
            label={t("employer.factLocation")}
            value={person.city || person.region}
          />
          <Fact
            label={t("employer.factLanguages")}
            value={person.languages?.join(", ")}
          />
        </dl>
      </Card>

      {/* ------------------------------------------------------- the skills */}
      <Card>
        <CardHeader
          title={t("employer.allSkills")}
          subtitle={t("employer.allSkillsHint")}
        />
        {person.skills.length === 0 ? (
          <EmptyState title={t("employer.noSkills")} />
        ) : (
          <ul className="flex flex-col divide-y divide-ink-200">
            {person.skills.map((skill) => (
              <li key={skill.skill_id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink-900">
                      {skill.skill}
                    </span>
                    <Badge tone={skill.verified ? "success" : "neutral"}>
                      {skill.verified
                        ? t("skills.verified")
                        : t("skills.declared")}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-ink-800">
                    {skill.proficiency}
                  </span>
                </div>

                <div className="mt-2">
                  <ProgressBar
                    value={skill.proficiency}
                    size="sm"
                    tone={matchTone(skill.proficiency)}
                  />
                </div>

                {/* The trail: what the number rests on. */}
                {skill.evidence.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {skill.evidence.map((item, index) => (
                      <li
                        key={`${skill.skill_id}-${index}`}
                        className="flex flex-wrap items-baseline gap-x-2 text-xs text-ink-500"
                      >
                        <span className="text-ink-700">
                          {t(`skills.source.${item.source}`, {
                            defaultValue: item.source,
                          })}
                        </span>
                        <span className="tabular-nums">{item.score}</span>
                        <span>
                          {t("employer.evidenceWeight", {
                            weight: item.weight.toFixed(2),
                          })}
                        </span>
                        <span className="tabular-nums">
                          {new Date(item.issued_at).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* -------------------------------------------------------- the tests */}
      <Card>
        <CardHeader
          title={t("employer.passedTests")}
          subtitle={t("employer.passedTestsHint")}
        />
        {person.tests.length === 0 ? (
          <p className="text-sm text-ink-500">{t("employer.noTests")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink-200">
            {person.tests.map((test) => (
              <li
                key={test.test_id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 truncate text-sm text-ink-800">
                  {test.title}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-success">
                  {test.percentage}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ----------------------------------------------------- the experience */}
      <Card>
        <CardHeader title={t("employer.candidateExperience")} />
        {person.experience_entries.length === 0 ? (
          <p className="text-sm text-ink-500">{t("employer.noExperience")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink-200">
            {person.experience_entries.map((entry, index) => (
              <li key={index} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-ink-900">
                    {entry.title}
                  </span>
                  <Badge tone="neutral">
                    {t(`experience.type_${entry.type}`, {
                      defaultValue: entry.type,
                    })}
                  </Badge>
                  {entry.verified && (
                    <Badge tone="success">{t("skills.verified")}</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-500">
                  {[
                    entry.organization ??
                      (person.identified ? null : t("employer.hiddenUntilContact")),
                    t("common.months", { count: entry.duration_months }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* What the tests measured, split into what they can do and how they
          work — and marked where the second half is self-reported. */}
      <CapabilityPanel userId={person.user_id} />

      {person.cv && <CandidateCv cv={person.cv} />}

      {person.certificates.length > 0 && (
        <Card>
          <CardHeader title={t("employer.certificates")} />
          <ul className="flex flex-col divide-y divide-ink-200">
            {person.certificates.map((certificate, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 truncate text-sm text-ink-800">
                  {certificate.course}
                </span>
                {certificate.serial && (
                  <span className="shrink-0 text-xs tabular-nums text-ink-500">
                    {certificate.serial}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
      {children}
    </p>
  );
}

/**
 * One labelled fact.
 *
 * A withheld field says so rather than going blank: "hidden until they apply"
 * is information, an empty line is a bug the reader has to guess about.
 */
function Fact({
  label,
  value,
  hidden = false,
  hiddenLabel,
}: {
  label: string;
  value?: string | null;
  hidden?: boolean;
  hiddenLabel?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-ink-800">
        {hidden ? (
          <span className="text-ink-500">🔒 {hiddenLabel}</span>
        ) : (
          value || <span className="text-ink-500">{t("common.notSpecified")}</span>
        )}
      </dd>
    </div>
  );
}
