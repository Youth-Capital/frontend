import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatDate } from "@/shared/lib/format";
import {
  DataList,
  DataRow,
  RowMain,
  RowMenu,
  RowValue,
} from "@/shared/ui/DataList";
import {
  Badge,
  Button,
  CardSkeleton,
  EmptyState,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
} from "@/shared/ui";
import type { Experience, Paginated, Skill } from "@/shared/types/api";

const TYPES = [
  "WORK",
  "INTERNSHIP",
  "FREELANCE",
  "PROJECT",
  "VOLUNTEER",
  "COMPETITION",
  "HACKATHON",
  "ACHIEVEMENT",
] as const;

/** Kinds of experience that can still be going on today. */
const ONGOING_TYPES = new Set<string>([
  "WORK",
  "INTERNSHIP",
  "FREELANCE",
  "VOLUNTEER",
  "PROJECT",
]);

const EMPTY = {
  type: "WORK" as (typeof TYPES)[number],
  title: "",
  organization: "",
  description: "",
  start_date: "",
  end_date: "",
  is_current: false,
  skill_ids: [] as { id: string; name: string }[],
};

export default function ExperiencePage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [skillQuery, setSkillQuery] = useState("");
  const [error, setError] = useState("");

  const experiences = useQuery({
    queryKey: ["experience"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Experience>>(
        "/experience/?page_size=50",
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

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        type: form.type,
        title: form.title,
        organization: form.organization,
        description: form.description,
        start_date: form.start_date || null,
        end_date: form.is_current ? null : form.end_date || null,
        is_current: form.is_current,
        skill_ids: form.skill_ids.map((skill) => skill.id),
      };
      if (editingId) {
        await api.patch(`/experience/${editingId}/`, payload);
      } else {
        await api.post("/experience/", payload);
      }
    },
    onSuccess: () => {
      setOpen(false);
      setForm(EMPTY);
      setEditingId(null);
      setError("");
      // Tagged skills become evidence, which moves knowledge and matches.
      void queryClient.invalidateQueries({ queryKey: ["experience"] });
      void queryClient.invalidateQueries({ queryKey: ["my-skills"] });
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/experience/${id}/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["experience"] });
      void queryClient.invalidateQueries({ queryKey: ["my-skills"] });
    },
  });

  const startEdit = (experience: Experience) => {
    setEditingId(experience.id);
    setForm({
      type: experience.type as (typeof TYPES)[number],
      title: experience.title,
      organization: experience.organization,
      description: experience.description,
      start_date: experience.start_date ?? "",
      end_date: experience.end_date ?? "",
      is_current: experience.is_current,
      skill_ids: experience.skills.map((link) => ({
        id: link.skill,
        name: link.skill_name,
      })),
    });
    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("experience.title")}
        subtitle={t("experience.subtitle")}
        action={
            <Button
              onClick={() => {
                setForm(EMPTY);
                setEditingId(null);
                setOpen(true);
              }}
            >
              {t("experience.add")}
            </Button>
        }
      />

      {experiences.isLoading && <CardSkeleton rows={4} />}
      {!experiences.isLoading && (experiences.data?.length ?? 0) === 0 && (
        <EmptyState title={t("experience.empty")} />
      )}

      {(experiences.data?.length ?? 0) > 0 && (
        <DataList>
          {experiences.data?.map((experience) => (
            <DataRow
              key={experience.id}
              onClick={() => startEdit(experience)}
              expanded={
                experience.description || experience.skills.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {experience.description && (
                      <p className="text-sm text-ink-600">
                        {experience.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {experience.skills.map((link) => (
                        <Badge key={link.id} tone="neutral">
                          {link.skill_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null
              }
            >
              <RowMain
                title={experience.title}
                subtitle={[
                  experience.organization,
                  `${formatDate(experience.start_date, i18n.resolvedLanguage)} — ${
                    experience.is_current
                      ? t("experience.current")
                      : formatDate(experience.end_date, i18n.resolvedLanguage)
                  }`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                badges={
                  <>
                    <Badge tone="brand">
                      {t(`experience.type_${experience.type}`)}
                    </Badge>
                    {/* Untagged experience cannot influence matching, so the
                        gap is surfaced on the row rather than buried. */}
                    {experience.skills.length === 0 && (
                      <Badge tone="warning">{t("experience.linkSkills")}</Badge>
                    )}
                  </>
                }
              />

              {/* Only tenure types count toward a vacancy's experience
                  requirement, so a hackathon shows a dash rather than a
                  duration that would never be used. */}
              <RowValue
                value={
                  experience.counts_as_tenure
                    ? t("experience.duration", {
                        count: experience.duration_months,
                      })
                    : "—"
                }
                hint={
                  experience.counts_as_tenure ? t("match.experience") : undefined
                }
              />

              <RowMenu
                label={t("common.edit")}
                actions={[
                  {
                    label: t("common.edit"),
                    onSelect: () => startEdit(experience),
                  },
                  {
                    label: t("common.delete"),
                    tone: "danger",
                    onSelect: () => remove.mutate(experience.id),
                  },
                ]}
              />
            </DataRow>
          ))}
        </DataList>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? t("common.edit") : t("experience.add")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => save.mutate()}
              loading={save.isPending}
              disabled={!form.title.trim()}
            >
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select
            id="exp-type"
            label={t("experience.type")}
            value={form.type}
            onChange={(event) => {
              const type = event.target.value as (typeof TYPES)[number];
              // Switching to a one-off type hides the "ongoing" box; leaving
              // its value behind would save a hackathon as still running.
              setForm({
                ...form,
                type,
                is_current: ONGOING_TYPES.has(type) ? form.is_current : false,
              });
            }}
          >
            {TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`experience.type_${type}`)}
              </option>
            ))}
          </Select>

          {/* Both fields are stored the same way, but they mean different
              things per type: a job has a position at an employer, a hackathon
              has a project at an organiser. A single job-shaped label leaves
              the reader guessing what to type. */}
          <Input
            id="exp-title"
            label={t(`experience.titleFor.${form.type}`, {
              defaultValue: t("experience.position"),
            })}
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />

          <Input
            id="exp-org"
            label={t(`experience.orgFor.${form.type}`, {
              defaultValue: t("experience.organization"),
            })}
            hint={t(`experience.orgHint.${form.type}`, { defaultValue: "" })}
            value={form.organization}
            onChange={(event) => setForm({ ...form, organization: event.target.value })}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="exp-start"
              type="date"
              label={t("experience.startDate")}
              value={form.start_date}
              onChange={(event) => setForm({ ...form, start_date: event.target.value })}
            />
            <Input
              id="exp-end"
              type="date"
              label={t("experience.endDate")}
              disabled={form.is_current}
              value={form.end_date}
              onChange={(event) => setForm({ ...form, end_date: event.target.value })}
            />
          </div>

          {/* A hackathon, a competition and an award happen and end. Offering
              "I'm currently working here" for them invites an answer that
              cannot be true, and the open-ended date it implies would then
              read as ongoing tenure. */}
          {ONGOING_TYPES.has(form.type) && (
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={form.is_current}
                onChange={(event) =>
                  setForm({ ...form, is_current: event.target.checked })
                }
              />
              {t("experience.current")}
            </label>
          )}

          <Textarea
            id="exp-description"
            label={t("cv.summary")}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />

          <div>
            <p className="mb-1 text-sm font-medium text-ink-700">
              {t("experience.linkSkills")}
            </p>
            <p className="mb-2 text-xs text-ink-500">
              {t("experience.linkSkillsHint")}
            </p>

            <div className="mb-2 flex flex-wrap gap-1.5">
              {form.skill_ids.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      skill_ids: form.skill_ids.filter((item) => item.id !== skill.id),
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700 hover:bg-brand-100"
                >
                  {skill.name} ×
                </button>
              ))}
            </div>

            <Input
              id="exp-skill-search"
              placeholder={t("onboarding.searchSkill")}
              value={skillQuery}
              onChange={(event) => setSkillQuery(event.target.value)}
              autoComplete="off"
            />
            {skillQuery.trim().length >= 2 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-ink-200">
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
                      if (!form.skill_ids.some((item) => item.id === skill.id)) {
                        setForm({
                          ...form,
                          skill_ids: [
                            ...form.skill_ids,
                            { id: skill.id, name: skill.name },
                          ],
                        });
                      }
                      setSkillQuery("");
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-ink-50"
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            )}
          </div>

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
