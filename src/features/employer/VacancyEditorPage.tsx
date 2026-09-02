import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  Input,
  Select,
  Spinner,
  Textarea,
} from "@/shared/ui";
import type {
  Paginated,
  Profession,
  Region,
  RequirementLevel,
  Skill,
  Vacancy,
} from "@/shared/types/api";

interface DraftSkill {
  id: string;
  name: string;
  requirement: RequirementLevel;
  min_knowledge_score: number;
  skillLinkId?: string;
}

const EMPTY = {
  title: "",
  description: "",
  responsibilities: "",
  conditions: "",
  employment_type: "FULL_TIME",
  work_mode: "ONSITE",
  region: "",
  city: "",
  profession: "",
  min_experience_months: 0,
  education_required: "NONE",
  salary_min: "",
  salary_max: "",
  is_salary_public: true,
  positions_count: 1,
  deadline: "",
};

export default function VacancyEditorPage() {
  const { vacancyId } = useParams<{ vacancyId: string }>();
  const isNew = !vacancyId;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [form, setForm] = useState(EMPTY);
  const [skills, setSkills] = useState<DraftSkill[]>([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [error, setError] = useState("");

  const existing = useQuery({
    queryKey: ["vacancy", vacancyId],
    queryFn: async () => {
      const { data } = await api.get<Vacancy>(`/jobs/vacancies/${vacancyId}/`);
      return data;
    },
    enabled: !isNew,
  });

  const regions = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Region>>("/taxonomy/regions/");
      return data.results;
    },
  });

  const professions = useQuery({
    queryKey: ["professions"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Profession>>(
        "/taxonomy/professions/?page_size=100",
      );
      return data.results;
    },
  });

  const skillSearch = useQuery({
    queryKey: ["skill-search", skillQuery],
    queryFn: async () => {
      const { data } = await api.get<Skill[]>(
        `/taxonomy/skills/search/?q=${encodeURIComponent(skillQuery)}`,
      );
      return data;
    },
    enabled: skillQuery.trim().length >= 2,
  });

  useEffect(() => {
    if (!existing.data) return;
    const data = existing.data;
    setForm({
      title: data.title,
      description: data.description ?? "",
      responsibilities: data.responsibilities ?? "",
      conditions: data.conditions ?? "",
      employment_type: data.employment_type,
      work_mode: data.work_mode,
      region: data.region ?? "",
      city: data.city,
      profession: data.profession ?? "",
      min_experience_months: data.min_experience_months,
      education_required: data.education_required,
      salary_min: data.salary_min?.toString() ?? "",
      salary_max: data.salary_max?.toString() ?? "",
      is_salary_public: data.is_salary_public,
      positions_count: data.positions_count,
      deadline: data.deadline ?? "",
    });
    setSkills(
      (data.skills ?? []).map((link) => ({
        id: link.skill,
        name: link.skill_name,
        requirement: link.requirement,
        min_knowledge_score: link.min_knowledge_score,
        skillLinkId: link.id,
      })),
    );
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        region: form.region || null,
        profession: form.profession || null,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        deadline: form.deadline || null,
      };

      const id = isNew
        ? (await api.post<Vacancy>("/jobs/vacancies/", payload)).data.id
        : (await api.patch<Vacancy>(`/jobs/vacancies/${vacancyId}/`, payload)).data.id;

      // Skills are a separate resource; sync them after the vacancy exists.
      for (const skill of skills) {
        await api.post(`/jobs/vacancies/${id}/skills/`, {
          skill: skill.id,
          requirement: skill.requirement,
          min_knowledge_score: skill.min_knowledge_score,
        });
      }
      return id;
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ["employer-vacancies"] });
      void queryClient.invalidateQueries({ queryKey: ["vacancy", id] });
      navigate("/employer/vacancies");
    },
    onError: (caught) => setError(describeError(caught)),
  });

  if (!isNew && existing.isLoading) return <CardSkeleton rows={8} />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isNew ? t("employer.newVacancy") : t("common.edit")}
      />

      <Card>
        <CardHeader title={t("jobs.title")} />
        <div className="flex flex-col gap-4">
          <Input
            id="title"
            label={t("jobs.title")}
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <Textarea
            id="description"
            label={t("cv.summary")}
            required
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <Textarea
            id="responsibilities"
            label={t("employer.note")}
            value={form.responsibilities}
            onChange={(event) =>
              setForm({ ...form, responsibilities: event.target.value })
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="employment-type"
              label={t("jobs.employmentType")}
              value={form.employment_type}
              onChange={(event) =>
                setForm({ ...form, employment_type: event.target.value })
              }
            >
              {["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT", "FREELANCE"].map(
                (type) => (
                  <option key={type} value={type}>
                    {t(`jobs.type_${type}`)}
                  </option>
                ),
              )}
            </Select>
            <Select
              id="work-mode"
              label={t("jobs.workMode")}
              value={form.work_mode}
              onChange={(event) => setForm({ ...form, work_mode: event.target.value })}
            >
              {["ONSITE", "REMOTE", "HYBRID"].map((mode) => (
                <option key={mode} value={mode}>
                  {t(`jobs.mode_${mode}`)}
                </option>
              ))}
            </Select>
            <Select
              id="region"
              label={t("jobs.region")}
              value={form.region}
              onChange={(event) => setForm({ ...form, region: event.target.value })}
            >
              <option value="">{t("common.notSpecified")}</option>
              {regions.data?.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </Select>
            <Input
              id="city"
              label={t("auth.region")}
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
            <Select
              id="profession"
              label={t("nav.professions")}
              value={form.profession}
              onChange={(event) => setForm({ ...form, profession: event.target.value })}
            >
              <option value="">{t("common.notSpecified")}</option>
              {professions.data?.map((profession) => (
                <option key={profession.id} value={profession.id}>
                  {profession.name}
                </option>
              ))}
            </Select>
            <Input
              id="experience"
              type="number"
              min={0}
              label={t("experience.duration", { count: 0 }).replace("0", "")}
              value={form.min_experience_months}
              onChange={(event) =>
                setForm({
                  ...form,
                  min_experience_months: Number(event.target.value),
                })
              }
            />
            <Input
              id="salary-min"
              type="number"
              min={0}
              label="Min"
              value={form.salary_min}
              onChange={(event) => setForm({ ...form, salary_min: event.target.value })}
            />
            <Input
              id="salary-max"
              type="number"
              min={0}
              label="Max"
              value={form.salary_max}
              onChange={(event) => setForm({ ...form, salary_max: event.target.value })}
            />
            <Input
              id="deadline"
              type="date"
              label={t("jobs.deadline", { date: "" })}
              value={form.deadline}
              onChange={(event) => setForm({ ...form, deadline: event.target.value })}
            />
            <Select
              id="education"
              label={t("onboarding.educationStatus")}
              value={form.education_required}
              onChange={(event) =>
                setForm({ ...form, education_required: event.target.value })
              }
            >
              {["NONE", "SCHOOL", "COLLEGE", "UNIVERSITY"].map((option) => (
                <option key={option} value={option}>
                  {t(`education.${option}`)}
                </option>
              ))}
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.is_salary_public}
              onChange={(event) =>
                setForm({ ...form, is_salary_public: event.target.checked })
              }
            />
            {t("jobs.salaryHidden")}
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={t("jobs.requiredSkills")}
          subtitle={t("admin.taxonomyHint")}
        />

        <div className="mb-4 flex flex-col gap-2">
          {skills.map((skill, index) => (
            <div
              key={skill.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-200 p-3"
            >
              <span className="min-w-32 flex-1 text-sm font-medium text-ink-800">
                {skill.name}
              </span>
              <select
                value={skill.requirement}
                onChange={(event) =>
                  setSkills((previous) =>
                    previous.map((item, i) =>
                      i === index
                        ? {
                            ...item,
                            requirement: event.target.value as RequirementLevel,
                          }
                        : item,
                    ),
                  )
                }
                className="rounded-md border border-ink-300 px-2 py-1 text-sm"
              >
                <option value="REQUIRED">{t("requirement.REQUIRED")}</option>
                <option value="PREFERRED">{t("requirement.PREFERRED")}</option>
              </select>
              <input
                type="number"
                min={0}
                max={100}
                value={skill.min_knowledge_score}
                onChange={(event) =>
                  setSkills((previous) =>
                    previous.map((item, i) =>
                      i === index
                        ? { ...item, min_knowledge_score: Number(event.target.value) }
                        : item,
                    ),
                  )
                }
                className="w-20 rounded-md border border-ink-300 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setSkills((previous) => previous.filter((_, i) => i !== index))
                }
                className="text-sm text-danger hover:underline"
              >
                {t("common.remove")}
              </button>
            </div>
          ))}
          {skills.length === 0 && (
            <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
              {t("errors.vacancy_no_skills", {
                defaultValue: t("jobs.requiredSkills"),
              })}
            </p>
          )}
        </div>

        <Input
          id="skill-search"
          placeholder={t("onboarding.searchSkill")}
          value={skillQuery}
          onChange={(event) => setSkillQuery(event.target.value)}
          autoComplete="off"
        />
        {skillQuery.trim().length >= 2 && (
          <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-ink-200">
            {skillSearch.isLoading && (
              <div className="flex justify-center p-3 text-ink-400">
                <Spinner size={16} />
              </div>
            )}
            {skillSearch.data?.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => {
                  if (!skills.some((item) => item.id === skill.id)) {
                    setSkills((previous) => [
                      ...previous,
                      {
                        id: skill.id,
                        name: skill.name,
                        requirement: "REQUIRED",
                        min_knowledge_score: 50,
                      },
                    ]);
                  }
                  setSkillQuery("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50"
              >
                <span>{skill.name}</span>
                <Badge tone="neutral">{skill.category_name}</Badge>
              </button>
            ))}
          </div>
        )}
      </Card>

      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate("/employer/vacancies")}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={() => save.mutate()}
          loading={save.isPending}
          disabled={!form.title.trim() || !form.description.trim()}
        >
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
