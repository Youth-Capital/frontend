import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { api, toApiError } from "@/shared/api/client";
import { Badge, Button, Card, CardHeader, CardSkeleton, Input, Select } from "@/shared/ui";
import type { CourseMaterial, Paginated } from "@/shared/types/api";

/**
 * Reading and downloads attached to the course.
 *
 * Three kinds, and the difference is not cosmetic. A file is hosted here and
 * validated on the way in. A link points somewhere else. A book is a link with
 * an honest label — an author listing "Clean Code, chapter 3" is naming
 * something the platform does not have, and offering a download button for it
 * would be a lie.
 */
export function MaterialsEditor({ courseId }: { courseId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState("LINK");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const materials = useQuery({
    queryKey: ["course-materials", courseId],
    queryFn: async () => {
      const { data } = await api.get<Paginated<CourseMaterial>>(
        `/learning/materials/?course=${courseId}&page_size=100`,
      );
      return data.results;
    },
  });

  const refresh = () =>
    void queryClient.invalidateQueries({
      queryKey: ["course-materials", courseId],
    });

  const add = useMutation({
    mutationFn: async () => {
      if (kind === "FILE") {
        const file = fileInput.current?.files?.[0];
        if (!file) throw new Error("no file");
        // Multipart, because this one carries bytes.
        const body = new FormData();
        body.append("course", courseId);
        body.append("kind", "FILE");
        body.append("title", title);
        body.append("file", file);
        await api.post("/learning/materials/", body);
        return;
      }
      await api.post("/learning/materials/", {
        course: courseId,
        kind,
        title,
        url,
      });
    },
    onSuccess: () => {
      setTitle("");
      setUrl("");
      setError("");
      if (fileInput.current) fileInput.current.value = "";
      refresh();
    },
    onError: (err) =>
      setError(
        t(`errors.${toApiError(err).code}`, {
          defaultValue: t("courses.materialFailed"),
        }),
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/learning/materials/${id}/`);
    },
    onSuccess: refresh,
  });

  const ready = title.trim() && (kind === "FILE" ? true : url.trim());

  return (
    <Card>
      <CardHeader
        title={t("courses.materials")}
        subtitle={t("courses.materialsHint")}
      />

      {materials.isLoading && <CardSkeleton rows={2} />}

      {(materials.data?.length ?? 0) > 0 && (
        <ul className="mb-4 flex flex-col divide-y divide-ink-200">
          {materials.data?.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Badge tone={item.kind === "FILE" ? "brand" : "neutral"}>
                  {t(`courses.material_${item.kind}`)}
                </Badge>
                <span className="min-w-0 truncate text-sm text-ink-800">
                  {item.title}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove.mutate(item.id)}>
                {t("common.delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            id="material-kind"
            label={t("courses.materialKind")}
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="LINK">{t("courses.material_LINK")}</option>
            <option value="BOOK">{t("courses.material_BOOK")}</option>
            <option value="FILE">{t("courses.material_FILE")}</option>
          </Select>
          <div className="sm:col-span-2">
            <Input
              id="material-title"
              label={t("courses.materialTitle")}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
        </div>

        {kind === "FILE" ? (
          <div>
            <label
              htmlFor="material-file"
              className="mb-1 block text-sm font-medium text-ink-700"
            >
              {t("courses.materialFile")}
            </label>
            <input
              id="material-file"
              ref={fileInput}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
              className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-on-colour"
            />
            <p className="mt-1 text-xs text-ink-500">
              {t("courses.materialFileHint")}
            </p>
          </div>
        ) : (
          <Input
            id="material-url"
            label={t("courses.materialUrl")}
            hint={kind === "BOOK" ? t("courses.materialBookHint") : undefined}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end">
          <Button
            onClick={() => add.mutate()}
            disabled={!ready || add.isPending}
            loading={add.isPending}
          >
            {t("common.add")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
