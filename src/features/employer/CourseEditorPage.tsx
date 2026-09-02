import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, toApiError } from "@/shared/api/client";
import { PageHeader } from "@/shared/ui/PageHeader";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  Input,
  Select,
  Textarea,
} from "@/shared/ui";
import type { Course, Paginated, SkillCategory } from "@/shared/types/api";

import { LessonEditor } from "./LessonEditor";
import { MaterialsEditor } from "./MaterialsEditor";

/**
 * Building a course, on a page rather than in a box.
 *
 * A course is modules, lessons, videos and reading — it does not fit in a
 * modal, and the modal it used to live in could only take the title and a
 * couple of dropdowns. So the flow is: this page creates the course, and then
 * stays open as the place where it is filled in.
 *
 * Creating first is deliberate. Modules and lessons have to hang off a course
 * id, so there is nothing to attach them to until one exists — and a draft
 * course is exactly what an unfinished course is.
 */
export default function CourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const creating = !courseId || courseId === "new";
  const [error, setError] = useState("");

  const course = useQuery({
    queryKey: ["employer-course", courseId],
    queryFn: async () => {
      const { data } = await api.get<Course>(`/learning/courses/${courseId}/`);
      return data;
    },
    enabled: !creating,
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

  const [form, setForm] = useState({
    title: "",
    summary: "",
    description: "",
    category: "",
    level: "BEGINNER",
    duration_minutes: 120,
  });

  // Once the course arrives, the form becomes its editor.
  const loaded = course.data;
  const [hydrated, setHydrated] = useState(false);
  if (loaded && !hydrated) {
    setForm({
      title: loaded.title,
      summary: loaded.summary ?? "",
      description: loaded.description ?? "",
      category: loaded.category ?? "",
      level: loaded.level,
      duration_minutes: loaded.duration_minutes,
    });
    setHydrated(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (creating) {
        const { data } = await api.post<Course>("/learning/courses/", form);
        return data;
      }
      const { data } = await api.patch<Course>(
        `/learning/courses/${courseId}/`,
        form,
      );
      return data;
    },
    onSuccess: (data) => {
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["employer-courses"] });
      void queryClient.invalidateQueries({ queryKey: ["employer-course"] });
      if (creating) navigate(`/employer/courses/${data.id}/edit`, { replace: true });
    },
    onError: (err) => {
      const api_error = toApiError(err);
      setError(
        t(`errors.${api_error.code}`, { defaultValue: t("errors.generic") }),
      );
    },
  });

  const publish = useMutation({
    mutationFn: async () => {
      await api.post(`/learning/courses/${courseId}/submit/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employer-course"] });
      void queryClient.invalidateQueries({ queryKey: ["employer-courses"] });
    },
  });

  if (!creating && course.isLoading) {
    return <CardSkeleton rows={8} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/employer/courses"
        className="text-sm text-brand-600 hover:text-brand-700"
      >
        ← {t("nav.courses")}
      </Link>

      <PageHeader
        title={creating ? t("employer.newCourse") : form.title || t("nav.courses")}
        subtitle={
          creating ? t("courses.editorNewHint") : t("courses.editorHint")
        }
        action={
          loaded && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={loaded.status === "PUBLISHED" ? "success" : "neutral"}>
                {t(`moderation.${loaded.status}`, { defaultValue: loaded.status })}
              </Badge>
              {(loaded.status === "DRAFT" || loaded.status === "REJECTED") && (
                <Button
                  size="sm"
                  onClick={() => publish.mutate()}
                  loading={publish.isPending}
                >
                  {t("employer.publish")}
                </Button>
              )}
              <Link to={`/employer/courses/${courseId}`}>
                <Button variant="secondary" size="sm">
                  {t("courses.previewAsLearner")}
                </Button>
              </Link>
            </div>
          )
        }
      />

      {/* ------------------------------------------------- the course itself */}
      <Card>
        <CardHeader title={t("courses.aboutCourse")} />
        <div className="flex flex-col gap-4">
          <Input
            id="course-title"
            label={t("courses.courseTitle")}
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <Input
            id="course-summary"
            label={t("courses.shortDescription")}
            hint={t("courses.shortDescriptionHint")}
            value={form.summary}
            onChange={(event) => setForm({ ...form, summary: event.target.value })}
          />
          <Textarea
            id="course-description"
            label={t("courses.fullDescription")}
            rows={4}
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
          />
          <Select
            id="course-category"
            label={t("courses.category")}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="course-level"
              label={t("courses.level")}
              value={form.level}
              onChange={(event) => setForm({ ...form, level: event.target.value })}
            >
              <option value="BEGINNER">{t("courses.level_BEGINNER")}</option>
              <option value="INTERMEDIATE">{t("courses.level_INTERMEDIATE")}</option>
              <option value="ADVANCED">{t("courses.level_ADVANCED")}</option>
            </Select>
            <Input
              id="course-duration"
              type="number"
              min={0}
              label={t("courses.duration")}
              value={form.duration_minutes}
              onChange={(event) =>
                setForm({ ...form, duration_minutes: Number(event.target.value) })
              }
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end">
            <Button
              onClick={() => save.mutate()}
              loading={save.isPending}
              disabled={!form.title || !form.category}
            >
              {creating ? t("common.create") : t("common.save")}
            </Button>
          </div>
        </div>
      </Card>

      {creating ? (
        <Card>
          <p className="text-sm text-ink-500">{t("courses.saveFirstHint")}</p>
        </Card>
      ) : (
        <>
          <LessonEditor courseId={courseId!} />
          <MaterialsEditor courseId={courseId!} />
        </>
      )}
    </div>
  );
}
