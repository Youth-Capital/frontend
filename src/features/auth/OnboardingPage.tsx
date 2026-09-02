import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";
import { useApiError } from "@/shared/hooks/useApiError";
import { Button, Card, Input, ProgressBar, Select, Spinner } from "@/shared/ui";
import type { Paginated, Profession, Region, Skill } from "@/shared/types/api";

const EDUCATION_OPTIONS = [
  "SCHOOL",
  "COLLEGE",
  "UNIVERSITY",
  "GRADUATE",
  "NONE",
] as const;

interface DeclaredSkill {
  skill: string;
  name: string;
  proficiency: number;
}

export default function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const describeError = useApiError();

  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    region: "",
    city: "",
    education_status: "UNIVERSITY" as (typeof EDUCATION_OPTIONS)[number],
    institution: "",
    target_profession: "",
  });
  const [skills, setSkills] = useState<DeclaredSkill[]>([]);
  const [skillQuery, setSkillQuery] = useState("");

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

  const submit = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/me/onboarding/", {
        first_name: form.first_name,
        last_name: form.last_name,
        region: form.region || null,
        city: form.city,
        education_status: form.education_status,
        institution: form.institution,
        target_profession: form.target_profession || null,
        employment_status: "LOOKING",
        skills: skills.map((item) => ({
          skill: item.skill,
          proficiency: item.proficiency,
        })),
      });
      return data;
    },
    onSuccess: async () => {
      await refreshUser();
      setStep(3);
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const addSkill = (skill: Skill) => {
    if (skills.some((item) => item.skill === skill.id)) return;
    setSkills((previous) => [
      ...previous,
      { skill: skill.id, name: skill.name, proficiency: 50 },
    ]);
    setSkillQuery("");
  };

  const steps = [
    t("onboarding.stepProfile"),
    t("onboarding.stepCareer"),
    t("onboarding.stepSkills"),
    t("onboarding.stepDone"),
  ];

  const canContinue =
    step === 0
      ? form.first_name.trim() !== "" && form.last_name.trim() !== ""
      : true;

  return (
    <div className="min-h-screen bg-ink-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-ink-900">
          {t("onboarding.title")}
        </h1>
        <p className="mt-1 text-sm text-ink-500">{t("onboarding.subtitle")}</p>

        <div className="mt-6 mb-6">
          <ProgressBar value={((step + 1) / steps.length) * 100} size="sm" />
          <div className="mt-2 flex justify-between text-xs text-ink-500">
            {steps.map((label, index) => (
              <span
                key={label}
                className={index <= step ? "font-medium text-brand-700" : ""}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <Card>
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="first_name"
                  label={t("auth.firstName")}
                  required
                  value={form.first_name}
                  onChange={(event) =>
                    setForm({ ...form, first_name: event.target.value })
                  }
                />
                <Input
                  id="last_name"
                  label={t("auth.lastName")}
                  required
                  value={form.last_name}
                  onChange={(event) =>
                    setForm({ ...form, last_name: event.target.value })
                  }
                />
              </div>
              <Select
                id="region"
                label={t("auth.region")}
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
              <Select
                id="education"
                label={t("onboarding.educationStatus")}
                value={form.education_status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    education_status: event.target
                      .value as (typeof EDUCATION_OPTIONS)[number],
                  })
                }
              >
                {EDUCATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`education.${option}`)}
                  </option>
                ))}
              </Select>
              <Input
                id="institution"
                label={t("onboarding.institution")}
                value={form.institution}
                onChange={(event) =>
                  setForm({ ...form, institution: event.target.value })
                }
              />
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-4">
              <Select
                id="profession"
                label={t("onboarding.targetProfession")}
                hint={t("onboarding.targetProfessionHint")}
                value={form.target_profession}
                onChange={(event) =>
                  setForm({ ...form, target_profession: event.target.value })
                }
              >
                <option value="">{t("common.notSpecified")}</option>
                {professions.data?.map((profession) => (
                  <option key={profession.id} value={profession.id}>
                    {profession.name}
                  </option>
                ))}
              </Select>

              {form.target_profession && (
                <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
                  {
                    professions.data?.find(
                      (item) => item.id === form.target_profession,
                    )?.description
                  }
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-ink-600">{t("onboarding.skillsHint")}</p>

              <div className="relative">
                <Input
                  id="skill-search"
                  label={t("onboarding.addSkill")}
                  placeholder={t("onboarding.searchSkill")}
                  value={skillQuery}
                  onChange={(event) => setSkillQuery(event.target.value)}
                  autoComplete="off"
                />
                {skillQuery.trim().length >= 2 && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-ink-200 bg-surface shadow-lg">
                    {skillSearch.isLoading && (
                      <div className="flex justify-center p-3 text-ink-400">
                        <Spinner size={16} />
                      </div>
                    )}
                    {skillSearch.data?.length === 0 && (
                      <p className="p-3 text-sm text-ink-500">{t("common.none")}</p>
                    )}
                    {skillSearch.data?.map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => addSkill(skill)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50"
                      >
                        <span className="text-ink-800">{skill.name}</span>
                        <span className="text-xs text-ink-400">
                          {skill.category_name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {skills.map((item, index) => (
                  <div
                    key={item.skill}
                    className="rounded-xl border border-ink-200 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink-800">
                        {item.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSkills((previous) =>
                            previous.filter((_, i) => i !== index),
                          )
                        }
                        className="text-xs text-danger hover:underline"
                      >
                        {t("common.remove")}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={item.proficiency}
                        onChange={(event) =>
                          setSkills((previous) =>
                            previous.map((entry, i) =>
                              i === index
                                ? { ...entry, proficiency: Number(event.target.value) }
                                : entry,
                            ),
                          )
                        }
                        className="flex-1 accent-brand-600"
                        aria-label={`${item.name} ${t("onboarding.level")}`}
                      />
                      <span className="w-10 text-right text-sm font-semibold tabular-nums text-ink-700">
                        {item.proficiency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-ink-900">
                {t("onboarding.doneTitle")}
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                {t("onboarding.doneSubtitle")}
              </p>
              <Button
                className="mt-6"
                size="lg"
                onClick={() => navigate("/student/dashboard", { replace: true })}
              >
                {t("nav.dashboard")}
              </Button>
            </div>
          )}

          {error && step < 3 && (
            <div
              role="alert"
              className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              {error}
            </div>
          )}

          {step < 3 && (
            <div className="mt-6 flex justify-between gap-3">
              <Button
                variant="ghost"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
              >
                {t("common.back")}
              </Button>
              {step < 2 ? (
                <Button
                  onClick={() => setStep((current) => current + 1)}
                  disabled={!canContinue}
                >
                  {t("common.next")}
                </Button>
              ) : (
                <Button
                  onClick={() => submit.mutate()}
                  loading={submit.isPending}
                >
                  {t("onboarding.finish")}
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
