import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Flow } from "@/shared/ui/geometry";
import "@/shared/styles/deep.css";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";
import { scoreTone } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  ProgressBar,
  Select,
} from "@/shared/ui";
import type {
  Paginated,
  Profession,
  SkillGapEntry,
} from "@/shared/types/api";

interface CareerPathResponse {
  profession: string;
  profession_id: string;
  readiness: number;
  required_total: number;
  required_met: number;
  matching_skills: SkillGapEntry[];
  partial_skills: SkillGapEntry[];
  missing_skills: SkillGapEntry[];
  recommended_courses: {
    id: string;
    title: string;
    level: string;
    duration_minutes: number;
    rating: number;
  }[];
  related_vacancies: {
    id: string;
    title: string;
    company: string;
    employment_type: string;
  }[];
}

interface ProfessionMatch {
  id: string;
  profession: string;
  profession_name: string;
  score: number;
  missing_skills: SkillGapEntry[];
}

export default function CareerPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const profile = user?.profile as { target_profession_id?: string | null } | null;
  const targetId = profile?.target_profession_id ?? null;

  const professions = useQuery({
    queryKey: ["professions"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Profession>>(
        "/taxonomy/professions/?page_size=100",
      );
      return data.results;
    },
  });

  const careerPath = useQuery({
    queryKey: ["career-path", targetId],
    queryFn: async () => {
      const { data } = await api.get<CareerPathResponse>(
        `/taxonomy/professions/${targetId}/career-path/`,
      );
      return data;
    },
    enabled: Boolean(targetId),
  });

  const matches = useQuery({
    queryKey: ["profession-matches"],
    queryFn: async () => {
      const { data } = await api.get<ProfessionMatch[]>("/matching/professions/");
      return data;
    },
  });

  const setTarget = useMutation({
    mutationFn: async (professionId: string) => {
      await api.patch("/me/profile/", { target_profession: professionId || null });
    },
    onSuccess: async () => {
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: ["career-path"] });
      void queryClient.invalidateQueries({ queryKey: ["profession-matches"] });
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("career.title")}
        subtitle={t("career.subtitle")}
      />

      <Card>
        <Select
          id="target-profession"
          label={t("career.selectProfession")}
          value={targetId ?? ""}
          onChange={(event) => setTarget.mutate(event.target.value)}
          disabled={setTarget.isPending}
        >
          <option value="">{t("common.notSpecified")}</option>
          {professions.data?.map((profession) => (
            <option key={profession.id} value={profession.id}>
              {profession.name}
            </option>
          ))}
        </Select>
      </Card>

      {!targetId && (
        <EmptyState
          title={t("career.selectProfession")}
          description={t("onboarding.targetProfessionHint")}
        />
      )}

      {targetId && careerPath.isLoading && <CardSkeleton rows={6} />}

      {careerPath.data && (
        <>
          <RouteToProfession path={careerPath.data} />

          {/* The pipeline the prompt asks for: have -> missing -> learn -> apply */}
          <div className="grid gap-4 lg:grid-cols-3">
            <SkillColumn
              title={t("career.haveSkills")}
              tone="success"
              entries={careerPath.data.matching_skills}
            />
            <SkillColumn
              title={t("career.partialSkills")}
              tone="warning"
              entries={careerPath.data.partial_skills}
            />
            <SkillColumn
              title={t("career.missingSkills")}
              tone="danger"
              entries={careerPath.data.missing_skills}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title={t("career.recommendedCourses")} />
              {careerPath.data.recommended_courses.length === 0 ? (
                <EmptyState title={t("courses.empty")} />
              ) : (
                <ul className="flex flex-col gap-2">
                  {careerPath.data.recommended_courses.map((course) => (
                    <li key={course.id}>
                      <Link
                        to={`/student/courses/${course.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 p-3 hover:border-brand-400"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-800">
                            {course.title}
                          </p>
                          <p className="text-xs text-ink-500">
                            {t(`courses.level_${course.level}`)} ·{" "}
                            {t("common.minutes", { count: course.duration_minutes })}
                          </p>
                        </div>
                        <Badge tone="brand">★ {course.rating}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title={t("career.relatedVacancies")} />
              {careerPath.data.related_vacancies.length === 0 ? (
                <EmptyState title={t("jobs.empty")} />
              ) : (
                <ul className="flex flex-col gap-2">
                  {careerPath.data.related_vacancies.map((vacancy) => (
                    <li key={vacancy.id}>
                      <Link
                        to={`/student/jobs/${vacancy.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 p-3 hover:border-brand-400"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink-800">
                            {vacancy.title}
                          </p>
                          <p className="text-xs text-ink-500">{vacancy.company}</p>
                        </div>
                        <Badge tone="neutral">
                          {t(`jobs.type_${vacancy.employment_type}`)}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader
          title={t("career.otherProfessions")}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void matches.refetch()}
              loading={matches.isFetching}
            >
              {t("common.retry")}
            </Button>
          }
        />
        {!matches.data || matches.data.length === 0 ? (
          <EmptyState title={t("common.none")} />
        ) : (
          <ul className="flex flex-col gap-2">
            {matches.data
              .filter((match) => match.profession !== targetId)
              .slice(0, 6)
              .map((match) => (
                <li
                  key={match.id}
                  className="flex items-center gap-3 rounded-xl border border-ink-200 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-800">
                      {match.profession_name}
                    </p>
                    <div className="mt-1.5">
                      <ProgressBar
                        value={match.score}
                        tone={scoreTone(match.score)}
                        size="sm"
                      />
                    </div>
                  </div>
                  <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-700">
                    {match.score}%
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setTarget.mutate(match.profession)}
                  >
                    {t("career.changeProfession")}
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/**
 * The route to the profession, drawn as one line.
 *
 * The stops are the skills the profession actually requires, in the order
 * someone reaches them: the ones already at level, then the ones part-way,
 * then the untouched. So the filled section of the path is exactly what has
 * been done — the picture cannot claim progress the data does not have.
 *
 * Seven stops fit before the labels start colliding. When a profession asks
 * for more, the overflow is stated rather than dropped: a path that quietly
 * ends early would read as a shorter journey than it is.
 */
function RouteToProfession({ path }: { path: CareerPathResponse }) {
  const { t } = useTranslation();

  const met = path.matching_skills;
  const ordered = [...met, ...path.partial_skills, ...path.missing_skills];
  const LIMIT = 7;
  const shown = ordered.slice(0, LIMIT);
  const hidden = ordered.length - shown.length;

  return (
    <section className="deep rounded-(--radius-card) px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--band-dim)" }}
          >
            {t("career.routeTo")}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold leading-tight">
            {path.profession}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--band-muted)" }}>
            {t("career.readinessHint", {
              met: path.required_met,
              total: path.required_total,
            })}
          </p>
        </div>

        <span className="shrink-0 text-4xl font-semibold tabular-nums leading-none">
          {path.readiness}%
        </span>
      </div>

      {shown.length > 0 && (
        <div className="mt-6">
          <Flow
            className="w-full"
            reached={met.length}
            stops={shown.map((entry) => entry.skill)}
          />
          {hidden > 0 && (
            <p className="text-center text-[11px]" style={{ color: "var(--band-dim)" }}>
              {t("career.andMoreSkills", { count: hidden })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function SkillColumn({
  title,
  tone,
  entries,
}: {
  title: string;
  tone: "success" | "warning" | "danger";
  entries: SkillGapEntry[];
}) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {title}
            <Badge tone={tone}>{entries.length}</Badge>
          </span>
        }
      />
      {entries.length === 0 ? (
        <p className="text-sm text-ink-400">{t("common.none")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li
              key={entry.skill_id}
              className="rounded-xl border border-ink-200 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-ink-800">{entry.skill}</span>
                {entry.verified && <Badge tone="success">✓</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-ink-500">
                {t("career.level", {
                  current: entry.current_level,
                  required: entry.required_level,
                })}
                {entry.requirement === "PREFERRED" &&
                  ` · ${t("requirement.PREFERRED")}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
