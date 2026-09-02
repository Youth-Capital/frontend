import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  Input,
  Modal,
  Tabs,
  Textarea,
} from "@/shared/ui";
import { CvIdentityBand } from "./CvIdentityBand";
import { VerifiedSkills } from "./VerifiedSkills";
import type { CVDocument, Paginated } from "@/shared/types/api";

type Tab = "cv" | "portfolio" | "passport";

interface CVPreview {
  meta: { title: string; sections: string[] };
  personal: Record<string, string | null>;
  contacts?: { email: string; phone: string | null };
  summary?: string;
  education?: { institution: string; degree: string; start_date: string }[];
  skills?: { name: string; proficiency: number; verified: boolean }[];
  experience?: {
    title: string;
    organization: string;
    duration_months: number;
    skills: string[];
  }[];
  courses?: { title: string; provider: string }[];
  certificates?: { title: string; serial: string }[];
  projects?: { title: string; description: string }[];
}

interface Suggestion {
  code: string;
  severity: string;
  data?: Record<string, unknown>;
}

export default function CVPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("cv");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("My CV");
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");

  const cvs = useQuery({
    queryKey: ["cvs"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CVDocument>>("/cv/documents/");
      return data.results;
    },
  });

  const selected = activeId ?? cvs.data?.[0]?.id ?? null;

  const preview = useQuery({
    queryKey: ["cv-preview", selected],
    queryFn: async () => {
      const { data } = await api.get<CVPreview>(`/cv/documents/${selected}/preview/`);
      return data;
    },
    enabled: Boolean(selected) && tab === "cv",
  });

  const suggestions = useQuery({
    queryKey: ["cv-suggestions", selected],
    queryFn: async () => {
      const { data } = await api.get<{ suggestions: Suggestion[] }>(
        `/cv/documents/${selected}/suggestions/`,
      );
      return data.suggestions;
    },
    enabled: Boolean(selected) && tab === "cv",
  });

  const passport = useQuery({
    queryKey: ["passport"],
    queryFn: async () => {
      const { data } = await api.get<{
        public_slug: string;
        is_public: boolean;
        visible_blocks: Record<string, boolean>;
        views_count: number;
      }>("/cv/passport/");
      return data;
    },
    enabled: tab === "passport",
  });

  const createCv = useMutation({
    mutationFn: async () => {
      await api.post("/cv/documents/", { title, headline, summary });
    },
    onSuccess: () => {
      setCreateOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["cvs"] });
    },
  });

  const updatePassport = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      await api.patch("/cv/passport/", payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["passport"] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <CvIdentityBand />

      <PageHeader
        title={t("cv.title")}
        subtitle={t("cv.subtitle")}
        action={
          tab === "cv" ? (
            <Button onClick={() => setCreateOpen(true)}>{t("cv.create")}</Button>
          ) : undefined
        }
      />

      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "cv", label: t("cv.documents"), count: cvs.data?.length ?? 0 },
          { key: "portfolio", label: t("cv.portfolio") },
          { key: "passport", label: t("cv.passport") },
        ]}
      />

      {tab === "cv" && (
        <>
          {/* Proof first: it is the part of a CV nobody can simply assert. */}
          <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
            <VerifiedSkills />
            <div className="hidden lg:block" />
          </div>

          {cvs.isLoading && <CardSkeleton rows={4} />}
          {!cvs.isLoading && (cvs.data?.length ?? 0) === 0 && (
            <EmptyState
              title={t("cv.empty")}
              action={<Button onClick={() => setCreateOpen(true)}>{t("cv.create")}</Button>}
            />
          )}

          {(cvs.data?.length ?? 0) > 0 && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="flex flex-col gap-3">
                {cvs.data?.map((cv) => (
                  <button
                    key={cv.id}
                    type="button"
                    onClick={() => setActiveId(cv.id)}
                    className={
                      selected === cv.id
                        ? "rounded-(--radius-card) border-2 border-brand-500 bg-brand-50 p-4 text-left"
                        : "rounded-(--radius-card) border border-ink-200 bg-surface p-4 text-left hover:border-ink-300"
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-ink-900">{cv.title}</span>
                      {cv.is_primary && <Badge tone="brand">{t("cv.primary")}</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      {cv.enabled_sections.length} {t("cv.sections").toLowerCase()}
                    </p>
                  </button>
                ))}

                {(suggestions.data?.length ?? 0) > 0 && (
                  <Card>
                    <CardHeader title={t("cv.suggestions")} />
                    <ul className="flex flex-col gap-2">
                      {suggestions.data?.map((suggestion) => (
                        <li
                          key={suggestion.code}
                          className={
                            suggestion.severity === "high"
                              ? "rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning"
                              : "rounded-xl bg-ink-100 px-3 py-2 text-xs text-ink-600"
                          }
                        >
                          {t(`cv.suggestion.${suggestion.code}`, {
                            ...suggestion.data,
                            skills: Array.isArray(suggestion.data?.skills)
                              ? (suggestion.data.skills as string[]).join(", ")
                              : "",
                            defaultValue: suggestion.code,
                          })}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>

              <div className="lg:col-span-2">
                {preview.isLoading ? (
                  <CardSkeleton rows={8} />
                ) : preview.data ? (
                  <Card>
                    <div className="border-b border-ink-200 pb-4">
                      <h2 className="text-xl font-semibold text-ink-900">
                        {preview.data.personal.full_name}
                      </h2>
                      {preview.data.personal.headline && (
                        <p className="text-sm text-ink-600">
                          {preview.data.personal.headline}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-ink-500">
                        {[
                          preview.data.personal.city,
                          preview.data.personal.region,
                          preview.data.contacts?.email,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    {preview.data.summary && (
                      <Section title={t("cv.section.summary")}>
                        <p className="text-sm text-ink-700">{preview.data.summary}</p>
                      </Section>
                    )}

                    {(preview.data.skills?.length ?? 0) > 0 && (
                      <Section title={t("cv.section.skills")}>
                        <div className="flex flex-wrap gap-1.5">
                          {preview.data.skills?.map((skill) => (
                            <Badge
                              key={skill.name}
                              tone={skill.verified ? "success" : "neutral"}
                            >
                              {skill.name} {skill.proficiency}
                              {skill.verified && " ✓"}
                            </Badge>
                          ))}
                        </div>
                      </Section>
                    )}

                    {(preview.data.experience?.length ?? 0) > 0 && (
                      <Section title={t("cv.section.experience")}>
                        <ul className="flex flex-col gap-3">
                          {preview.data.experience?.map((item, index) => (
                            <li key={index}>
                              <p className="text-sm font-medium text-ink-800">
                                {item.title}
                              </p>
                              <p className="text-xs text-ink-500">
                                {item.organization} ·{" "}
                                {t("experience.duration", {
                                  count: item.duration_months,
                                })}
                              </p>
                              {item.skills.length > 0 && (
                                <p className="mt-1 text-xs text-ink-400">
                                  {item.skills.join(", ")}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {(preview.data.courses?.length ?? 0) > 0 && (
                      <Section title={t("cv.section.courses")}>
                        <ul className="flex flex-col gap-1.5">
                          {preview.data.courses?.map((course, index) => (
                            <li key={index} className="text-sm text-ink-700">
                              {course.title}
                              <span className="text-ink-400"> · {course.provider}</span>
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}

                    {(preview.data.certificates?.length ?? 0) > 0 && (
                      <Section title={t("cv.section.certificates")}>
                        <ul className="flex flex-col gap-1.5">
                          {preview.data.certificates?.map((certificate) => (
                            <li key={certificate.serial} className="text-sm text-ink-700">
                              {certificate.title}
                              <span className="font-mono text-xs text-ink-400">
                                {" "}
                                {certificate.serial}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </Section>
                    )}
                  </Card>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "portfolio" && <PortfolioTab />}

      {tab === "passport" && (
        <Card>
          {passport.isLoading ? (
            <CardSkeleton rows={4} />
          ) : passport.data ? (
            <>
              <CardHeader
                title={
                  passport.data.is_public
                    ? t("cv.passportPublic")
                    : t("cv.passportPrivate")
                }
                subtitle={t("cv.passportHint")}
                action={
                  <Button
                    variant={passport.data.is_public ? "secondary" : "primary"}
                    onClick={() =>
                      updatePassport.mutate({ is_public: !passport.data!.is_public })
                    }
                    loading={updatePassport.isPending}
                  >
                    {passport.data.is_public ? t("common.no") : t("common.yes")}
                  </Button>
                }
              />

              {passport.data.is_public && (
                <div className="mb-4 rounded-xl bg-ink-100 p-3">
                  <p className="text-xs text-ink-500">{t("cv.publicLink")}</p>
                  <code className="text-sm text-brand-700">
                    {window.location.origin}/p/{passport.data.public_slug}
                  </code>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {Object.entries(passport.data.visible_blocks).map(([block, enabled]) => (
                  <label key={block} className="flex items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() =>
                        updatePassport.mutate({
                          visible_blocks: {
                            ...passport.data!.visible_blocks,
                            [block]: !enabled,
                          },
                        })
                      }
                    />
                    <span className="text-ink-700">
                      {t(`cv.section.${block}`, { defaultValue: block })}
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : null}
        </Card>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("cv.create")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => createCv.mutate()} loading={createCv.isPending}>
              {t("common.create")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="cv-title"
            label={t("common.create")}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Input
            id="cv-headline"
            label={t("cv.headline")}
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
          />
          <Textarea
            id="cv-summary"
            label={t("cv.summary")}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
          <p className="text-xs text-ink-500">{t("cv.sectionsHint")}</p>
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-ink-100 pt-4 first:mt-0 first:border-0 first:pt-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function PortfolioTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", url: "" });

  const items = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const { data } = await api.get<
        Paginated<{ id: string; title: string; description: string; url: string; type: string }>
      >("/cv/portfolio/");
      return data.results;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await api.post("/cv/portfolio/", { ...form, type: "PROJECT" });
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", description: "", url: "" });
      void queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)}>{t("common.add")}</Button>
      </div>

      {items.isLoading && <CardSkeleton rows={3} />}
      {!items.isLoading && (items.data?.length ?? 0) === 0 && (
        <EmptyState title={t("cv.portfolioEmpty")} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.data?.map((item) => (
          <Card key={item.id}>
            <h3 className="font-semibold text-ink-900">{item.title}</h3>
            <p className="mt-1 line-clamp-3 text-sm text-ink-600">{item.description}</p>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-brand-600 hover:underline"
              >
                {item.url}
              </a>
            )}
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("cv.portfolio")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => create.mutate()} loading={create.isPending}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="portfolio-title"
            label={t("experience.position")}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <Textarea
            id="portfolio-description"
            label={t("cv.summary")}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <Input
            id="portfolio-url"
            label="URL"
            value={form.url}
            onChange={(event) => setForm({ ...form, url: event.target.value })}
          />
        </div>
      </Modal>
    </>
  );
}
