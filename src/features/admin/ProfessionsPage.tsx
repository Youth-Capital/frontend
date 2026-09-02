import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  Input,
  Modal,
  Select,
  Spinner,
} from "@/shared/ui";
import type {
  Paginated,
  Profession,
  RequirementLevel,
  Skill,
  SkillCategory,
} from "@/shared/types/api";

const EMPTY = {
  slug: "",
  category: "",
  name_uz: "",
  name_ru: "",
  name_en: "",
  description_uz: "",
  demand_level: "MEDIUM",
  median_salary: "",
};

export default function ProfessionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [selected, setSelected] = useState<string | null>(null);
  const [skillQuery, setSkillQuery] = useState("");
  const [error, setError] = useState("");

  const professions = useQuery({
    queryKey: ["admin-professions"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Profession>>(
        "/taxonomy/professions/?page_size=100",
      );
      return data.results;
    },
  });

  const detail = useQuery({
    queryKey: ["profession", selected],
    queryFn: async () => {
      const { data } = await api.get<Profession>(`/taxonomy/professions/${selected}/`);
      return data;
    },
    enabled: Boolean(selected),
  });

  const categories = useQuery({
    queryKey: ["skill-categories"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<SkillCategory>>(
        "/taxonomy/skill-categories/?page_size=100",
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

  const create = useMutation({
    mutationFn: async () => {
      await api.post("/taxonomy/professions/", {
        ...form,
        median_salary: form.median_salary ? Number(form.median_salary) : null,
        category: form.category || null,
      });
    },
    onSuccess: () => {
      setOpen(false);
      setForm(EMPTY);
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["admin-professions"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const addSkill = useMutation({
    mutationFn: async ({
      skillId,
      requirement,
    }: {
      skillId: string;
      requirement: RequirementLevel;
    }) => {
      await api.post(`/taxonomy/professions/${selected}/skills/`, {
        skill: skillId,
        requirement,
        min_proficiency: 50,
      });
    },
    onSuccess: () => {
      setSkillQuery("");
      void queryClient.invalidateQueries({ queryKey: ["profession", selected] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const removeSkill = useMutation({
    mutationFn: async (skillId: string) => {
      await api.delete(`/taxonomy/professions/${selected}/skills/${skillId}/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profession", selected] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">{t("nav.professions")}</h1>
        <Button onClick={() => setOpen(true)}>{t("admin.newProfession")}</Button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {professions.isLoading && <CardSkeleton rows={5} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-2">
          {professions.data?.map((profession) => (
            <button
              key={profession.id}
              type="button"
              onClick={() => setSelected(profession.id)}
              className={
                selected === profession.id
                  ? "rounded-(--radius-card) border-2 border-brand-500 bg-brand-50 p-3 text-left"
                  : "rounded-(--radius-card) border border-ink-200 bg-surface p-3 text-left hover:border-ink-300"
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-ink-900">{profession.name}</span>
                <Badge
                  tone={
                    profession.demand_level === "HIGH"
                      ? "success"
                      : profession.demand_level === "LOW"
                        ? "neutral"
                        : "brand"
                  }
                >
                  {t(`demand.${profession.demand_level}`)}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-ink-500">
                {profession.required_count ?? 0} {t("jobs.requiredSkills").toLowerCase()}
              </p>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <EmptyState title={t("career.selectProfession")} />
          ) : detail.isLoading ? (
            <CardSkeleton rows={6} />
          ) : detail.data ? (
            <Card>
              <CardHeader
                title={detail.data.name}
                subtitle={detail.data.description}
              />

              <div className="mb-4 flex flex-col gap-2">
                {detail.data.skills?.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="text-sm text-ink-800">{link.skill_name}</span>
                      <span className="ml-2 text-xs text-ink-400">
                        {t(`requirement.${link.requirement}`)} · {link.min_proficiency}+
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSkill.mutate(link.skill)}
                      className="text-xs text-danger hover:underline"
                    >
                      {t("common.remove")}
                    </button>
                  </div>
                ))}
              </div>

              <Input
                id="profession-skill-search"
                label={t("common.add")}
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
                    <div
                      key={skill.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-ink-50"
                    >
                      <span>{skill.name}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() =>
                            addSkill.mutate({
                              skillId: skill.id,
                              requirement: "REQUIRED",
                            })
                          }
                        >
                          {t("requirement.REQUIRED")}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            addSkill.mutate({
                              skillId: skill.id,
                              requirement: "PREFERRED",
                            })
                          }
                        >
                          {t("requirement.PREFERRED")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("admin.newProfession")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => create.mutate()}
              loading={create.isPending}
              disabled={!form.slug || !form.name_uz}
            >
              {t("common.create")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="prof-slug"
            label="slug"
            required
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
          />
          <Select
            id="prof-category"
            label={t("nav.taxonomy")}
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          >
            <option value="">{t("common.notSpecified")}</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.path || category.name}
              </option>
            ))}
          </Select>
          <Input
            id="prof-name-uz"
            label="O'zbekcha"
            required
            value={form.name_uz}
            onChange={(event) => setForm({ ...form, name_uz: event.target.value })}
          />
          <Input
            id="prof-name-ru"
            label="Русский"
            value={form.name_ru}
            onChange={(event) => setForm({ ...form, name_ru: event.target.value })}
          />
          <Input
            id="prof-name-en"
            label="English"
            value={form.name_en}
            onChange={(event) => setForm({ ...form, name_en: event.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="prof-demand"
              label={t("admin.skillDemand")}
              value={form.demand_level}
              onChange={(event) =>
                setForm({ ...form, demand_level: event.target.value })
              }
            >
              <option value="LOW">{t("demand.LOW")}</option>
              <option value="MEDIUM">{t("demand.MEDIUM")}</option>
              <option value="HIGH">{t("demand.HIGH")}</option>
            </Select>
            <Input
              id="prof-salary"
              type="number"
              min={0}
              label="UZS"
              value={form.median_salary}
              onChange={(event) =>
                setForm({ ...form, median_salary: event.target.value })
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
