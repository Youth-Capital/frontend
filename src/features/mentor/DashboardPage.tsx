import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import {
  Badge,
  Card,
  CardHeader,
  CardSkeleton,
  ErrorState,
  StatCard,
} from "@/shared/ui";
import type { Mentor } from "@/shared/types/api";

interface MentorDashboard {
  mentor: Mentor;
  sessions: { requested: number; upcoming: number; completed: number };
  students: number;
  pending_reviews: number;
}

export default function DashboardPage() {
  const { t } = useTranslation();

  const dashboard = useQuery({
    queryKey: ["mentor", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get<MentorDashboard>("/mentorship/dashboard/");
      return data;
    },
  });

  if (dashboard.isLoading) return <CardSkeleton rows={5} />;
  if (dashboard.isError || !dashboard.data) {
    return (
      <ErrorState
        title={t("errors.loadFailed")}
        retryLabel={t("common.retry")}
        onRetry={() => void dashboard.refetch()}
      />
    );
  }

  const data = dashboard.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={data.mentor.full_name}
        subtitle={data.mentor.headline}
      />

      {data.mentor.verification_status !== "VERIFIED" && (
        <div className="rounded-(--radius-card) border border-warning-soft bg-warning-soft/40 p-4 text-sm text-warning">
          {t("employer.verificationPending")}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("mentors.status.REQUESTED")}
          value={data.sessions.requested}
          tone={data.sessions.requested > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label={t("mentors.status.ACCEPTED")}
          value={data.sessions.upcoming}
          tone="brand"
        />
        <StatCard
          label={t("mentors.status.COMPLETED")}
          value={data.sessions.completed}
          tone="success"
        />
        <StatCard label={t("admin.students")} value={data.students} />
      </div>

      <Card>
        <CardHeader
          title={t("mentors.expertise")}
          action={
            <Link
              to="/mentor/sessions"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              {t("nav.sessions")}
            </Link>
          }
        />
        <div className="flex flex-wrap gap-1.5">
          {data.mentor.expertise_names.map((skill) => (
            <Badge key={skill} tone="brand">
              {skill}
            </Badge>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-600">{data.mentor.bio}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ink-500">
          <span>
            {t("mentors.yearsExperience", { count: data.mentor.years_experience })}
          </span>
          {data.mentor.rating_count > 0 && <span>★ {data.mentor.rating_avg}</span>}
        </div>
      </Card>
    </div>
  );
}
