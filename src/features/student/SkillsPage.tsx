import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatRelative, scoreTone } from "@/shared/lib/format";
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
  Button,
  CardSkeleton,
  EmptyState,
  Input,
  Modal,
  Spinner,
  Tabs,
} from "@/shared/ui";
import { useAuth } from "@/shared/auth/AuthContext";
import type { Paginated, Skill, SkillGapEntry, UserSkill } from "@/shared/types/api";

import { CapabilityPanel } from "@/shared/ui/CapabilityPanel";
import { SkillsMap, type MapSkill } from "./journey/SkillsMap";

/** Only the parts of the career-path payload the map needs. */
interface CareerPath {
  profession: string;
  readiness: number;
  /** Readiness counts only these — the map says so rather than showing a bare percentage. */
  required_met: number;
  required_total: number;
  matching_skills: SkillGapEntry[];
  partial_skills: SkillGapEntry[];
  missing_skills: SkillGapEntry[];
}

type Filter = "all" | "VERIFIED" | "DECLARED";

/** The three buckets the endpoint returns, tagged so the map can draw them. */
function toMapSkills(path: CareerPath): MapSkill[] {
  return [
    ...path.matching_skills.map((skill) => ({ ...skill, state: "met" as const })),
    ...path.partial_skills.map((skill) => ({ ...skill, state: "partial" as const })),
    ...path.missing_skills.map((skill) => ({ ...skill, state: "missing" as const })),
  ];
}

export default function SkillsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [filter, setFilter] = useState<Filter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Skill | null>(null);
  const [level, setLevel] = useState(50);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const skills = useQuery({
    queryKey: ["my-skills"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<UserSkill>>("/me/skills/?page_size=100");
      return data.results;
    },
  });

  const search = useQuery({
    queryKey: ["skill-search", query],
    queryFn: async () => {
      const { data } = await api.get<Skill[]>(
        `/taxonomy/skills/search/?q=${encodeURIComponent(query)}`,
      );
      return data;
    },
    enabled: query.trim().length >= 2,
  });

  // The map is drawn against the profession the learner is aiming at, so it
  // shows the gap rather than a picture of what they already have. Without a
  // target there is nothing to measure the distance to, and it stays hidden.
  const profile = user?.profile as { target_profession_id?: string | null } | null;
  const targetId = profile?.target_profession_id ?? null;

  const path = useQuery({
    queryKey: ["career-path", targetId],
    queryFn: async () => {
      const { data } = await api.get<CareerPath>(
        `/taxonomy/professions/${targetId}/career-path/`,
      );
      return data;
    },
    enabled: Boolean(targetId),
  });

  const detail = useQuery({
    queryKey: ["my-skill", expanded],
    queryFn: async () => {
      const { data } = await api.get<UserSkill>(`/me/skills/${expanded}/`);
      return data;
    },
    enabled: Boolean(expanded),
  });

  const addSkill = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await api.post("/me/skills/", { skill: selected.id, proficiency: level });
    },
    onSuccess: () => {
      setAddOpen(false);
      setSelected(null);
      setQuery("");
      setLevel(50);
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["my-skills"] });
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const removeSkill = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/me/skills/${id}/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-skills"] });
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
    },
  });

  const rows = (skills.data ?? []).filter((skill) =>
    filter === "all" ? true : skill.status === filter,
  );
  const verified = (skills.data ?? []).filter(
    (skill) => skill.status === "VERIFIED",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("skills.title")}
        subtitle={t("skills.subtitle")}
        action={
            <Button onClick={() => setAddOpen(true)}>{t("skills.addTitle")}</Button>
        }
      />

      {path.data && (
        <SkillsMap
          profession={path.data.profession}
          requiredMet={path.data.required_met}
          requiredTotal={path.data.required_total}
          skills={toMapSkills(path.data)}
        />
      )}

      {/* Behavioural competencies belong on the skills page, not on a page
          of their own: they are skills, and splitting them out is how a
          profile ends up with two disagreeing pictures of one person. */}
      <CapabilityPanel />

      <Tabs<Filter>
        active={filter}
        onChange={setFilter}
        tabs={[
          { key: "all", label: t("common.all"), count: skills.data?.length ?? 0 },
          { key: "VERIFIED", label: t("skills.verified"), count: verified },
          {
            key: "DECLARED",
            label: t("skills.declared"),
            count: (skills.data?.length ?? 0) - verified,
          },
        ]}
      />

      {skills.isLoading && <CardSkeleton rows={6} />}

      {!skills.isLoading && rows.length === 0 && (
        <EmptyState
          title={t("skills.empty")}
          action={<Button onClick={() => setAddOpen(true)}>{t("skills.addTitle")}</Button>}
        />
      )}

      {rows.length > 0 && (
        <DataList>
          {rows.map((skill) => {
            const isOpen = expanded === skill.id;

            return (
              <DataRow
                key={skill.id}
                onClick={() => setExpanded(isOpen ? null : skill.id)}
                highlighted={isOpen}
                expanded={
                  isOpen ? (
                    detail.isLoading ? (
                      <Spinner size={18} />
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                          {t("skills.evidence")}
                        </p>
                        {(detail.data?.evidence ?? []).map((evidence) => (
                          <div
                            key={evidence.id}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="text-ink-700">
                              {t(`skills.source.${evidence.source}`)}
                              {evidence.note && (
                                <span className="ml-1 text-ink-400">
                                  · {evidence.note}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-ink-500">
                              {evidence.score} ·{" "}
                              {formatRelative(
                                evidence.issued_at,
                                i18n.resolvedLanguage,
                              )}
                            </span>
                          </div>
                        ))}
                        {!skill.is_verified && (
                          <p className="mt-1 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
                            {t("skills.verifyPrompt")}
                          </p>
                        )}
                      </div>
                    )
                  ) : null
                }
              >
                <RowMain
                  title={skill.skill_name}
                  subtitle={`${skill.category_name} · ${t(
                    `skills.source.${skill.best_source}`,
                  )} · ${t("skills.confidence")} ${Math.round(skill.confidence * 100)}%`}
                  badges={
                    skill.is_verified ? (
                      <Badge tone="success">{t("skills.verified")}</Badge>
                    ) : (
                      <Badge tone="neutral">{t("skills.declared")}</Badge>
                    )
                  }
                />

                <RowMeter
                  value={skill.proficiency}
                  tone={scoreTone(skill.proficiency)}
                />

                <RowValue
                  value={skill.proficiency}
                  hint={
                    skill.knowledge_score !== null
                      ? `${t("knowledge.title")} ${skill.knowledge_score}`
                      : t(`skills.band.${skill.band}`)
                  }
                  tone={scoreTone(skill.proficiency)}
                />

                <RowMenu
                  label={t("common.edit")}
                  actions={[
                    {
                      label: t("skills.evidence"),
                      onSelect: () => setExpanded(isOpen ? null : skill.id),
                    },
                    {
                      label: t("common.remove"),
                      tone: "danger",
                      onSelect: () => removeSkill.mutate(skill.id),
                    },
                  ]}
                />
              </DataRow>
            );
          })}
        </DataList>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t("skills.addTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => addSkill.mutate()}
              disabled={!selected}
              loading={addSkill.isPending}
            >
              {t("common.add")}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-ink-500">{t("skills.addHint")}</p>

        {selected ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-xl border border-brand-300 bg-brand-50 p-3">
              <span className="font-medium text-brand-800">{selected.name}</span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-sm text-brand-600 hover:underline"
              >
                {t("common.edit")}
              </button>
            </div>
            <div>
              <label
                htmlFor="level"
                className="mb-1.5 block text-sm font-medium text-ink-700"
              >
                {t("skills.yourLevel")}: {level}
              </label>
              <input
                id="level"
                type="range"
                min={0}
                max={100}
                step={5}
                value={level}
                onChange={(event) => setLevel(Number(event.target.value))}
                className="w-full accent-brand-600"
              />
            </div>
          </div>
        ) : (
          <>
            <Input
              id="skill-query"
              placeholder={t("onboarding.searchSkill")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
            <div className="mt-2 max-h-60 overflow-y-auto">
              {search.isLoading && (
                <div className="flex justify-center p-4 text-ink-400">
                  <Spinner size={18} />
                </div>
              )}
              {search.data?.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => setSelected(skill)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-ink-50"
                >
                  <span className="text-ink-800">{skill.name}</span>
                  <span className="text-xs text-ink-400">{skill.category_name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </Modal>
    </div>
  );
}
