import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { useAxisColor } from "@/shared/theme/ThemeContext";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  Input,
  Modal,
  Select,
  Table,
  Td,
  Th,
} from "@/shared/ui";
import type { Paginated, Skill, SkillCategory } from "@/shared/types/api";

interface CapitalDimension {
  id: string;
  slug: string;
  name: string;
  color: string;
}

const EMPTY = {
  slug: "",
  category: "",
  name_uz: "",
  name_ru: "",
  name_en: "",
  aliases: "",
};

export default function TaxonomyPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();
  const axisColor = useAxisColor();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState("");

  const skills = useQuery({
    queryKey: ["admin-skills", search, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "200" });
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      const { data } = await api.get<Paginated<Skill>>(
        `/taxonomy/skills/?${params.toString()}`,
      );
      return data.results;
    },
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

  const dimensions = useQuery({
    queryKey: ["capital-dimensions"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CapitalDimension>>(
        "/taxonomy/capital-dimensions/",
      );
      return data.results;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await api.post("/taxonomy/skills/", {
        ...form,
        aliases: form.aliases
          .split(",")
          .map((alias) => alias.trim())
          .filter(Boolean),
      });
    },
    onSuccess: () => {
      setOpen(false);
      setForm(EMPTY);
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["admin-skills"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{t("nav.taxonomy")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            {t("admin.taxonomyHint")}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>{t("admin.newSkill")}</Button>
      </div>

      <Card>
        <CardHeader title={t("dashboard.capitalTitle")} />
        <div className="flex flex-wrap gap-2">
          {dimensions.data?.map((dimension) => (
            <span
              key={dimension.id}
              className="inline-flex items-center gap-2 rounded-full border border-ink-200 px-3 py-1 text-sm"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: axisColor(dimension.slug, dimension.color) }}
              />
              {dimension.name}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Input
            id="skill-filter"
            placeholder={t("common.search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          id="category-filter"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="">{t("common.all")}</option>
          {categories.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.path || category.name}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {skills.isLoading && <CardSkeleton rows={6} />}

      {(skills.data?.length ?? 0) > 0 && (
        <Card padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>{t("skills.title")}</Th>
                <Th>{t("nav.taxonomy")}</Th>
                <Th>slug</Th>
                <Th align="center">{t("common.yes")}</Th>
              </tr>
            </thead>
            <tbody>
              {skills.data?.map((skill) => (
                <tr key={skill.id}>
                  <Td>
                    <span className="font-medium text-ink-800">{skill.name}</span>
                    {skill.aliases.length > 0 && (
                      <span className="ml-2 text-xs text-ink-400">
                        {skill.aliases.join(", ")}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-ink-500">{skill.category_name}</span>
                  </Td>
                  <Td>
                    <code className="text-xs text-ink-400">{skill.slug}</code>
                  </Td>
                  <Td align="center">
                    {skill.is_active ? (
                      <Badge tone="success">✓</Badge>
                    ) : (
                      <Badge tone="neutral">✕</Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("admin.newSkill")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => create.mutate()}
              loading={create.isPending}
              disabled={!form.slug || !form.name_uz || !form.category}
            >
              {t("common.create")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="skill-slug"
            label="slug"
            required
            value={form.slug}
            onChange={(event) => setForm({ ...form, slug: event.target.value })}
          />
          <Select
            id="skill-category"
            label={t("nav.taxonomy")}
            required
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

          {/* All three languages at once — TZ §12 wants the taxonomy translated. */}
          <Input
            id="name-uz"
            label="O'zbekcha"
            required
            value={form.name_uz}
            onChange={(event) => setForm({ ...form, name_uz: event.target.value })}
          />
          <Input
            id="name-ru"
            label="Русский"
            value={form.name_ru}
            onChange={(event) => setForm({ ...form, name_ru: event.target.value })}
          />
          <Input
            id="name-en"
            label="English"
            value={form.name_en}
            onChange={(event) => setForm({ ...form, name_en: event.target.value })}
          />
          <Input
            id="aliases"
            label="aliases"
            hint="js, ecmascript"
            value={form.aliases}
            onChange={(event) => setForm({ ...form, aliases: event.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
