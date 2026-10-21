import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api, toApiError } from "@/shared/api/client";
import { Badge, Button, Card, CardHeader, Input, Spinner } from "@/shared/ui";
import type { Skill } from "@/shared/types/api";

/**
 * The skills a course teaches.
 *
 * This is how a course is found: the career page and the development plan
 * recommend courses by the skills a learner is missing, so a course with none
 * is shown to nobody who did not already search for it by name. The API has
 * always accepted skills; the editor simply never offered them.
 *
 * Picked from the taxonomy, never typed: matching only works while everybody
 * means the same thing by "SQL".
 */
export function CourseSkillsEditor({
  courseId,
  skills,
  required,
}: {
  courseId: string;
  skills: { id: string; name: string }[];
  /** An external course cannot be submitted without one — say so up front. */
  required?: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

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

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["employer-course", courseId] });
    void queryClient.invalidateQueries({ queryKey: ["employer-courses"] });
  };
  const fail = (err: unknown) =>
    setError(t(`errors.${toApiError(err).code}`, { defaultValue: t("errors.generic") }));

  const add = useMutation({
    mutationFn: async (skillId: string) => {
      await api.post(`/learning/courses/${courseId}/skills/`, { skill: skillId });
    },
    onSuccess: () => {
      setError("");
      setQuery("");
      refresh();
    },
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: async (skillId: string) => {
      await api.delete(`/learning/courses/${courseId}/skills/${skillId}/`);
    },
    onSuccess: () => {
      setError("");
      refresh();
    },
    onError: fail,
  });

  const have = new Set(skills.map((skill) => skill.id));

  return (
    <Card>
      <CardHeader
        title={t("courses.skillsYouGain")}
        subtitle={t(required ? "courses.skillsRequiredHint" : "courses.skillsHint")}
      />

      {skills.length > 0 ? (
        <ul className="mb-4 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li key={skill.id} className="flex items-center gap-1">
              <Badge tone="brand">{skill.name}</Badge>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`${t("common.delete")}: ${skill.name}`}
                loading={remove.isPending && remove.variables === skill.id}
                onClick={() => remove.mutate(skill.id)}
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={required ? "mb-4 text-sm text-danger" : "mb-4 text-sm text-ink-500"}>
          {t("courses.noSkillsYet")}
        </p>
      )}

      <Input
        id="course-skill-search"
        label={t("onboarding.searchSkill")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
      />
      {query.trim().length >= 2 && (
        <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-ink-200">
          {search.isLoading && (
            <div className="flex justify-center p-3 text-ink-400">
              <Spinner size={16} />
            </div>
          )}
          {search.data?.length === 0 && (
            <p className="px-3 py-2 text-sm text-ink-500">{t("common.none")}</p>
          )}
          {search.data?.map((skill) => (
            <button
              key={skill.id}
              type="button"
              disabled={have.has(skill.id) || add.isPending}
              onClick={() => add.mutate(skill.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50 disabled:cursor-default disabled:text-ink-400"
            >
              <span>{skill.name}</span>
              <Badge tone="neutral">{skill.category_name}</Badge>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
