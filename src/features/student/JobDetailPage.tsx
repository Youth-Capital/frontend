import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatDate, formatSalary, matchTone } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  ErrorState,
  Modal,
  ProgressBar,
  Textarea,
} from "@/shared/ui";
import type { CVDocument, MatchResult, Paginated, Vacancy } from "@/shared/types/api";

import { MatchExplanation } from "./MatchExplanation";

export default function JobDetailPage() {
  const { vacancyId } = useParams<{ vacancyId: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [cvId, setCvId] = useState("");
  const [error, setError] = useState("");

  const vacancy = useQuery({
    queryKey: ["vacancy", vacancyId],
    queryFn: async () => {
      const { data } = await api.get<Vacancy>(`/jobs/vacancies/${vacancyId}/`);
      return data;
    },
    enabled: Boolean(vacancyId),
  });

  const match = useQuery({
    queryKey: ["match", vacancyId],
    queryFn: async () => {
      const { data } = await api.get<MatchResult | null>(
        `/matching/vacancy/${vacancyId}/`,
      );
      return data;
    },
    enabled: Boolean(vacancyId),
  });

  const cvs = useQuery({
    queryKey: ["cvs"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CVDocument>>("/cv/documents/");
      return data.results;
    },
  });

  const apply = useMutation({
    mutationFn: async () => {
      await api.post("/jobs/applications/", {
        vacancy: vacancyId,
        cv: cvId || null,
        cover_letter: coverLetter,
      });
    },
    onSuccess: () => {
      setApplyOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["vacancy", vacancyId] });
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      navigate("/student/applications");
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const toggleSave = useMutation({
    mutationFn: async () => {
      await api.post("/jobs/saved/", { vacancy: vacancyId });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vacancy", vacancyId] });
      void queryClient.invalidateQueries({ queryKey: ["saved-vacancies"] });
    },
  });

  if (vacancy.isLoading) return <CardSkeleton rows={8} />;
  if (vacancy.isError || !vacancy.data) {
    return (
      <ErrorState title={t("errors.loadFailed")} onRetry={() => void vacancy.refetch()} />
    );
  }

  const data = vacancy.data;
  const applied = Boolean(data.my_application);

  return (
    <div className="flex flex-col gap-6">
      <Link to="/student/jobs" className="text-sm text-brand-600 hover:text-brand-700">
        ← {t("common.back")}
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{t(`jobs.type_${data.employment_type}`)}</Badge>
              <Badge tone="neutral">{t(`jobs.mode_${data.work_mode}`)}</Badge>
              {data.company.is_verified && <Badge tone="success">✓</Badge>}
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-ink-900">{data.title}</h1>
            <p className="mt-1 text-sm text-ink-600">
              {data.company.name}
              {data.city && ` · ${data.city}`}
              {data.region_name && ` · ${data.region_name}`}
            </p>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-500">
                  {t("jobs.title")}
                </dt>
                <dd className="text-sm text-ink-800">
                  {formatSalary(
                    data.salary_min,
                    data.salary_max,
                    data.currency,
                    t("jobs.salaryHidden"),
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink-500">
                  {t("experience.title")}
                </dt>
                <dd className="text-sm text-ink-800">
                  {data.min_experience_months > 0
                    ? t("jobs.experienceRequired", {
                        count: data.min_experience_months,
                      })
                    : t("jobs.noExperienceRequired")}
                </dd>
              </div>
              {data.deadline && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-500">
                    {t("jobs.deadline", { date: "" })}
                  </dt>
                  <dd className="text-sm text-ink-800">
                    {formatDate(data.deadline, i18n.resolvedLanguage)}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title={t("jobs.title")} />
            <div className="whitespace-pre-wrap text-sm text-ink-700">
              {data.description}
            </div>
            {data.responsibilities && (
              <div className="mt-4">
                <h3 className="mb-1 text-sm font-semibold text-ink-800">
                  {t("employer.note")}
                </h3>
                <div className="whitespace-pre-wrap text-sm text-ink-700">
                  {data.responsibilities}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={t("jobs.requiredSkills")} />
            <div className="flex flex-col gap-2">
              {data.skills?.map((skill) => {
                const matched = match.data?.matched_skills.find(
                  (item) => item.skill_id === skill.skill,
                );
                return (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="text-sm text-ink-800">{skill.skill_name}</span>
                      <span className="ml-2 text-xs text-ink-400">
                        {t(`requirement.${skill.requirement}`)} ·{" "}
                        {skill.min_knowledge_score}+
                      </span>
                    </div>
                    {matched ? (
                      <Badge tone={matched.met ? "success" : "warning"}>
                        {matched.current_level}
                        {matched.verified && " ✓"}
                      </Badge>
                    ) : (
                      <Badge tone="danger">{t("jobs.youMiss")}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {match.data && (
            <Card>
              <CardHeader title={t("jobs.match")} />
              <p className="text-center text-4xl font-semibold tabular-nums text-brand-700">
                {match.data.overall_score}%
              </p>
              <div className="mt-4 flex flex-col gap-2.5">
                <ProgressBar
                  label={t("match.coverage")}
                  value={match.data.coverage_score}
                  showLabel
                  size="sm"
                  tone={matchTone(match.data.coverage_score)}
                />
                <ProgressBar
                  label={t("match.knowledge")}
                  value={match.data.knowledge_score}
                  showLabel
                  size="sm"
                  tone={matchTone(match.data.knowledge_score)}
                />
                <ProgressBar
                  label={t("match.verification")}
                  value={match.data.verification_score}
                  showLabel
                  size="sm"
                  tone={matchTone(match.data.verification_score)}
                />
                <ProgressBar
                  label={t("match.experience")}
                  value={match.data.experience_score}
                  showLabel
                  size="sm"
                  tone={matchTone(match.data.experience_score)}
                />
              </div>

              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-ink-800">
                  {t("jobs.matchWhy")}
                </h3>
                <MatchExplanation reasons={match.data.explanation} />
              </div>
            </Card>
          )}

          <Card>
            {applied ? (
              <div className="text-center">
                <Badge tone="success">{t("jobs.applied")}</Badge>
                <p className="mt-2 text-sm text-ink-600">
                  {t(`applications.status.${data.my_application!.status}`)}
                </p>
                <Link
                  to="/student/applications"
                  className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  {t("nav.applications")}
                </Link>
              </div>
            ) : (
              <Button
                fullWidth
                size="lg"
                disabled={!data.is_open}
                onClick={() => setApplyOpen(true)}
              >
                {t("jobs.apply")}
              </Button>
            )}

            <Button
              variant="secondary"
              fullWidth
              className="mt-2"
              onClick={() => toggleSave.mutate()}
              disabled={data.is_saved}
            >
              {data.is_saved ? t("jobs.unsave") : t("jobs.save")}
            </Button>
          </Card>

          {(data.screening_tests?.length ?? 0) > 0 && (
            <Card>
              <CardHeader title={t("nav.tests")} />
              <p className="mb-2 text-xs text-ink-500">{t("tests.screeningNote")}</p>
              {data.screening_tests?.map((test) => (
                <Link
                  key={test.id}
                  to={`/student/tests/${test.id}/run`}
                  className="block rounded-md px-2 py-1.5 text-sm text-brand-600 hover:bg-brand-50"
                >
                  {test.title}
                  {test.is_mandatory && (
                    <span className="ml-1 text-danger">*</span>
                  )}
                </Link>
              ))}
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title={t("jobs.applyConfirm", { title: data.title })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setApplyOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => apply.mutate()} loading={apply.isPending}>
              {t("jobs.apply")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {(cvs.data?.length ?? 0) > 0 && (
            <div>
              <label
                htmlFor="cv"
                className="mb-1.5 block text-sm font-medium text-ink-700"
              >
                {t("jobs.selectCv")}
              </label>
              <select
                id="cv"
                value={cvId}
                onChange={(event) => setCvId(event.target.value)}
                className="w-full rounded-xl border border-ink-300 px-3 py-2 text-sm"
              >
                <option value="">{t("common.none")}</option>
                {cvs.data?.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Textarea
            id="cover-letter"
            label={t("jobs.coverLetter")}
            hint={t("jobs.coverLetterHint")}
            value={coverLetter}
            onChange={(event) => setCoverLetter(event.target.value)}
            maxLength={4000}
          />

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
