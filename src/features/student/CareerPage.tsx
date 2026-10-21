import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import "@/shared/styles/deep.css";
import { useTranslation } from "react-i18next";
import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";
import { scoreTone } from "@/shared/lib/format";
import {
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  DataList,
  DataRow,
  EmptyState,
  ProgressBar,
  SectionLabel,
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
    /** Set for a course taken on the partner's site (Coursera). */
    external_url: string;
    provider_name: string;
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
          {/* The pipeline the prompt asks for: have -> missing -> learn -> apply */}
          <div className="grid gap-4 lg:grid-cols-3">
            <SkillColumn
              title={t("career.haveSkills")}
              entries={careerPath.data.matching_skills}
            />
            <SkillColumn
              title={t("career.partialSkills")}
              entries={careerPath.data.partial_skills}
            />
            <SkillColumn
              title={t("career.missingSkills")}
              entries={careerPath.data.missing_skills}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="self-start">
              <SectionLabel>{t("career.recommendedCourses")}</SectionLabel>
              {careerPath.data.recommended_courses.length === 0 ? (
                <EmptyState title={t("courses.empty")} />
              ) : (
                <DataList>
                  {careerPath.data.recommended_courses.map((course) => (
                    <DataRow
                      key={course.id}
                      title={
                        course.external_url ? (
                          <>
                            {course.title}
                            <span aria-hidden className="ml-1.5 text-ink-500">
                              ↗
                            </span>
                          </>
                        ) : (
                          course.title
                        )
                      }
                      meta={[
                        t(`courses.level_${course.level}`),
                        course.external_url ? course.provider_name : null,
                        course.duration_minutes > 0
                          ? t("common.minutes", {
                              count: course.duration_minutes,
                            })
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      /* The rating is the one figure worth comparing down a
                         list of courses; an external one has none of ours. */
                      value={
                        course.external_url ? undefined : `★ ${course.rating}`
                      }
                      to={
                        course.external_url
                          ? undefined
                          : `/student/courses/${course.id}`
                      }
                      href={course.external_url || undefined}
                    />
                  ))}
                </DataList>
              )}
            </Card>

            <Card className="self-start">
              <SectionLabel>{t("career.relatedVacancies")}</SectionLabel>
              {careerPath.data.related_vacancies.length === 0 ? (
                <EmptyState title={t("jobs.empty")} />
              ) : (
                <DataList>
                  {careerPath.data.related_vacancies.map((vacancy) => (
                    <DataRow
                      key={vacancy.id}
                      title={vacancy.title}
                      meta={[
                        vacancy.company,
                        t(`jobs.type_${vacancy.employment_type}`),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      to={`/student/jobs/${vacancy.id}`}
                    />
                  ))}
                </DataList>
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

function SkillColumn({
  title,
  entries,
}: {
  title: string;
  entries: SkillGapEntry[];
}) {
  const { t } = useTranslation();

  return (
    /*
      Three of these sit side by side, and they used to be three bordered
      panels of bordered rows with a count in a coloured pill — green, amber
      and pink for what is one scale, so the colour said nothing the number did
      not. The heading is now a label, the count rides with it, and the levels
      sit in their own right-aligned column where "0 / 65" can be read down the
      list instead of being found inside a sentence.

      `self-start` is the other half of it: the three columns used to stretch to
      the tallest, so a profession with nothing in the middle band showed a
      half-screen of empty frosted glass.
    */
    <Card className="self-start">
      <SectionLabel count={entries.length}>{title}</SectionLabel>
      {entries.length === 0 ? (
        /* ink-400 measures 3.07:1 on glass — a fill weight, not a text one. */
        <p className="text-sm text-ink-500">{t("common.none")}</p>
      ) : (
        <DataList>
          {entries.map((entry) => (
            <DataRow
              key={entry.skill_id}
              title={entry.skill}
              mark={entry.verified ? "success" : undefined}
              meta={
                entry.requirement === "PREFERRED"
                  ? t("requirement.PREFERRED")
                  : undefined
              }
              value={`${entry.current_level} / ${entry.required_level}`}
            />
          ))}
        </DataList>
      )}
    </Card>
  );
}
