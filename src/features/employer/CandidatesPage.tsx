import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, httpStatus } from "@/shared/api/client";
import { matchTone } from "@/shared/lib/format";
import {
  DataList,
  DataRow,
  RowMain,
  RowMenu,
  RowMeter,
  RowValue,
} from "@/shared/ui/DataList";
import {
  Badge,
  CardSkeleton,
  EmptyState,
  ErrorState,
  Select,
} from "@/shared/ui";
import type { Candidate, Vacancy } from "@/shared/types/api";

export default function CandidatesPage() {
  const { vacancyId } = useParams<{ vacancyId: string }>();
  const { t } = useTranslation();
  const [minScore, setMinScore] = useState("0");
  const navigate = useNavigate();

  const vacancy = useQuery({
    queryKey: ["vacancy", vacancyId],
    queryFn: async () => {
      const { data } = await api.get<Vacancy>(`/jobs/vacancies/${vacancyId}/`);
      return data;
    },
    enabled: Boolean(vacancyId),
  });

  const candidates = useQuery({
    queryKey: ["candidates", vacancyId, minScore],
    queryFn: async () => {
      const { data } = await api.get<{ count: number; results: Candidate[] }>(
        `/jobs/vacancies/${vacancyId}/candidates/?min_score=${minScore}&limit=100`,
      );
      return data.results;
    },
    enabled: Boolean(vacancyId),
  });

  /*
   * A refused request is not an empty list.
   *
   * This page used to render both the same way: `candidates.data?.length ?? 0`
   * is 0 whether the query returned nothing or never returned at all, so a 403
   * — "this vacancy belongs to another company" — appeared as a calm "0
   * candidates / none". The vacancy title still loaded, because reading a
   * published vacancy is allowed to anyone while its candidate list is not,
   * which made the lie completely convincing.
   *
   * The status decides the sentence, and only a genuine failure offers a retry
   * — repeating a refusal is not a recovery. The wording is translated rather
   * than relayed: the backend's own message is written in English for the log,
   * and printing it put an English line under a Russian heading.
   */
  const status = candidates.isError ? httpStatus(candidates.error) : undefined;
  const canRetry = status !== 403 && status !== 404 && status !== 402;
  const error =
    status === 403
      ? {
          title: t("employer.candidatesNotYours"),
          description: t("employer.candidatesNotYoursHint"),
        }
      : status === 404
        ? {
            title: t("employer.vacancyNotFound"),
            description: t("employer.vacancyNotFoundHint"),
          }
        : status === 402
          ? {
              title: t("employer.candidatesNeedPlan"),
              description: t("billing.upgradeToUnlock"),
            }
          : { title: t("errors.loadFailed"), description: undefined };

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/employer/vacancies"
        className="text-sm text-brand-600 hover:text-brand-700"
      >
        ← {t("common.back")}
      </Link>

      <PageHeader
        title={t("employer.candidates")}
        subtitle={vacancy.data?.title}
      />

      {candidates.isError ? (
        <ErrorState
          title={error.title}
          description={error.description}
          onRetry={canRetry ? () => void candidates.refetch() : undefined}
          retryLabel={t("common.retry")}
        />
      ) : (
        <>
          {/* Privacy is a feature here, and the UI says so out loud (TZ §12). */}
          <div className="rounded-(--radius-card) border border-info-soft bg-info-soft/40 p-3 text-sm text-ink-700">
            {t("employer.candidateSearchHint")}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <Select
                id="min-score"
                label={t("jobs.minMatch")}
                value={minScore}
                onChange={(event) => setMinScore(event.target.value)}
              >
                <option value="0">{t("common.all")}</option>
                <option value="40">40%+</option>
                <option value="60">60%+</option>
                <option value="80">80%+</option>
              </Select>
            </div>
            {/*
              Its own counted key rather than the page title lowercased: the
              borrowed heading gave "0 кандидаты", which is not a form the
              language has.
            */}
            <p className="pb-2 text-sm text-ink-500">
              {t("employer.candidateCount", {
                count: candidates.data?.length ?? 0,
              })}
            </p>
          </div>

          {candidates.isLoading && <CardSkeleton rows={6} />}
          {!candidates.isLoading && (candidates.data?.length ?? 0) === 0 && (
            <EmptyState
              title={t("employer.noCandidates")}
              description={t("employer.noCandidatesHint")}
            />
          )}
        </>
      )}

      {(candidates.data?.length ?? 0) > 0 && (
        <DataList>
          {candidates.data?.map((candidate) => {
            const matched = candidate.skills.filter((skill) => skill.met);

            return (
              <DataRow
                key={candidate.user_id}
                /*
                 * The row opens the candidate rather than unfolding beneath
                 * itself. Expanding in place was fine for "why this score",
                 * but deciding about a person needs their skills, their
                 * evidence and their record — more than belongs inside a list
                 * row, and something worth having a URL of its own.
                 */
                onClick={() =>
                  navigate(
                    `/employer/vacancies/${vacancyId}/candidates/${candidate.user_id}`,
                  )
                }
              >
                <RowMain
                  title={
                    candidate.identified
                      ? candidate.name
                      : t("employer.anonymousCandidate")
                  }
                  subtitle={[
                    candidate.youth_id,
                    `${t("jobs.youHaveCandidate")}: ${matched.length}/${candidate.skills.length}`,
                    candidate.missing_skills.length > 0
                      ? `${t("jobs.youMissCandidate")}: ${candidate.missing_skills
                          .slice(0, 2)
                          .map((skill) => skill.skill)
                          .join(", ")}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  badges={
                    <>
                      {candidate.has_applied && (
                        <Badge tone="brand">{t("jobs.applied")}</Badge>
                      )}
                      {!candidate.identified && <Badge tone="neutral">🔒</Badge>}
                    </>
                  }
                />

                <RowMeter
                  value={candidate.match.overall}
                  tone={matchTone(candidate.match.overall)}
                />

                <RowValue
                  value={`${candidate.match.overall}%`}
                  hint={t("match.overall")}
                  tone={matchTone(candidate.match.overall)}
                />

                <RowMenu
                  label={t("employer.openCandidate")}
                  actions={[
                    {
                      label: t("employer.openCandidate"),
                      onSelect: () =>
                        navigate(
                          `/employer/vacancies/${vacancyId}/candidates/${candidate.user_id}`,
                        ),
                    },
                  ]}
                />
              </DataRow>
            );
          })}
        </DataList>
      )}
    </div>
  );
}
