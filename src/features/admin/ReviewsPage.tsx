import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatRelative } from "@/shared/lib/format";
import { PageHeader } from "@/shared/ui/PageHeader";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  Input,
  Modal,
  ProgressBar,
  StatCard,
  Tabs,
  Textarea,
} from "@/shared/ui";
import type { Paginated, Role } from "@/shared/types/api";

type Tab = "reviews" | "campaigns";

interface ReviewSummary {
  count: number;
  average: number;
  nps: number | null;
  promoters: number;
  detractors: number;
  distribution: Record<string, number>;
  by_role: Record<string, { count: number; average: number }>;
  pending_moderation: number;
  with_cons: number;
}

interface AdminReview {
  id: string;
  author: { anonymous: boolean; role: Role; name?: string; user_id?: string };
  role_at_review: Role;
  trigger: string;
  rating: number;
  nps_score: number | null;
  pros: string;
  cons: string;
  suggestion: string;
  status: string;
  is_anonymous: boolean;
  admin_response: string;
  created_at: string;
}

interface Campaign {
  id: string;
  title: string;
  message: string;
  audience_roles: Role[];
  min_account_age_days: number;
  status: "DRAFT" | "RUNNING" | "FINISHED";
  launched_at: string | null;
  invited_count: number;
  responded_count: number;
  response_rate: number;
  created_at: string;
}

const ROLES: Role[] = ["STUDENT", "EMPLOYER"];

/**
 * What the people on this platform think, and the machinery for asking them.
 *
 * The summary leads with the things that need a decision — reviews waiting on
 * moderation, and reviews that named a problem — rather than with the average
 * star rating. An average is a number to report; a list of named weaknesses is
 * a thing to fix, and this screen exists for the second one.
 */
export default function AdminReviewsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [tab, setTab] = useState<Tab>("reviews");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [replyTo, setReplyTo] = useState<AdminReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    audience_roles: [] as Role[],
    min_account_age_days: 14,
  });
  const [error, setError] = useState("");

  const summary = useQuery({
    queryKey: ["review-summary"],
    queryFn: async () => {
      const { data } = await api.get<ReviewSummary>("/feedback/reviews/summary/");
      return data;
    },
  });

  const reviews = useQuery({
    queryKey: ["admin-reviews", roleFilter],
    queryFn: async () => {
      const { data } = await api.get<Paginated<AdminReview>>("/feedback/reviews/", {
        params: roleFilter ? { role_at_review: roleFilter } : undefined,
      });
      return data.results;
    },
    enabled: tab === "reviews",
  });

  const campaigns = useQuery({
    queryKey: ["review-campaigns"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Campaign>>("/feedback/campaigns/");
      return data.results;
    },
    enabled: tab === "campaigns",
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    void queryClient.invalidateQueries({ queryKey: ["review-summary"] });
  };

  const moderate = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      await api.post(`/feedback/reviews/${id}/moderate/`, { approve });
    },
    onSuccess: refresh,
    onError: (failure) => setError(describeError(failure)),
  });

  const respond = useMutation({
    mutationFn: async () => {
      if (!replyTo) return;
      await api.post(`/feedback/reviews/${replyTo.id}/respond/`, { text: replyText });
    },
    onSuccess: () => {
      setReplyTo(null);
      setReplyText("");
      refresh();
    },
    onError: (failure) => setError(describeError(failure)),
  });

  const createCampaign = useMutation({
    mutationFn: async () => {
      await api.post("/feedback/campaigns/", form);
    },
    onSuccess: () => {
      setCreateOpen(false);
      setForm({ title: "", message: "", audience_roles: [], min_account_age_days: 14 });
      void queryClient.invalidateQueries({ queryKey: ["review-campaigns"] });
    },
    onError: (failure) => setError(describeError(failure)),
  });

  const launch = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/feedback/campaigns/${id}/launch/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["review-campaigns"] });
    },
    onError: (failure) => setError(describeError(failure)),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("adminReviews.title")} subtitle={t("adminReviews.subtitle")} />

      {summary.data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("adminReviews.pending")}
            value={summary.data.pending_moderation}
            hint={t("adminReviews.pendingHint")}
            tone={summary.data.pending_moderation > 0 ? "warning" : "neutral"}
          />
          <StatCard
            label={t("adminReviews.namedProblems")}
            value={summary.data.with_cons}
            hint={t("adminReviews.namedProblemsHint")}
            tone="brand"
          />
          <StatCard
            label={t("adminReviews.average")}
            value={summary.data.average.toFixed(1)}
            hint={t("adminReviews.averageHint", { count: summary.data.count })}
          />
          <StatCard
            label={t("adminReviews.nps")}
            value={summary.data.nps ?? "—"}
            hint={t("adminReviews.npsHint", {
              promoters: summary.data.promoters,
              detractors: summary.data.detractors,
            })}
            tone={
              summary.data.nps === null
                ? "neutral"
                : summary.data.nps >= 30
                  ? "success"
                  : summary.data.nps >= 0
                    ? "warning"
                    : "danger"
            }
          />
        </div>
      )}

      {summary.data && summary.data.count > 0 && (
        <Card>
          <CardHeader title={t("adminReviews.distribution")} />
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <ProgressBar
                  key={star}
                  label={`${star} ★`}
                  value={
                    (100 * (summary.data.distribution[String(star)] ?? 0)) /
                    Math.max(summary.data.count, 1)
                  }
                  size="sm"
                  tone={star >= 4 ? "success" : star === 3 ? "warning" : "danger"}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {Object.entries(summary.data.by_role).map(([role, row]) => (
                <div
                  key={role}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-3 py-2"
                >
                  <span className="text-sm text-ink-700">
                    {t(`role.${role}`, { defaultValue: role })}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-ink-900">
                    {row.average.toFixed(1)} ★
                    <span className="ml-2 text-xs font-normal text-ink-500">
                      ({row.count})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Tabs<Tab>
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "reviews", label: t("adminReviews.reviews") },
          { key: "campaigns", label: t("adminReviews.campaigns") },
        ]}
      />

      {error && (
        <p className="rounded-(--radius-card) bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {tab === "reviews" && (
        <>
          <div className="flex flex-wrap gap-2">
            {(["", ...ROLES] as (Role | "")[]).map((role) => (
              <button
                key={role || "all"}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={
                  roleFilter === role
                    ? "rounded-full bg-brand-fill px-3 py-1.5 text-sm font-medium text-on-colour"
                    : "rounded-full border border-ink-300 px-3 py-1.5 text-sm text-ink-600 hover:border-ink-400"
                }
              >
                {role ? t(`role.${role}`) : t("common.all")}
              </button>
            ))}
          </div>

          {reviews.isLoading && <CardSkeleton rows={5} />}
          {!reviews.isLoading && (reviews.data?.length ?? 0) === 0 && (
            <EmptyState title={t("adminReviews.empty")} />
          )}

          <div className="flex flex-col gap-3">
            {reviews.data?.map((review) => (
              <Card key={review.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">
                      {"★".repeat(review.rating)}
                      <span className="text-ink-300">
                        {"★".repeat(5 - review.rating)}
                      </span>
                      <span className="ml-2 font-normal text-ink-500">
                        {review.is_anonymous
                          ? t("adminReviews.anonymous")
                          : review.author.name}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {[
                        t(`role.${review.role_at_review}`, {
                          defaultValue: review.role_at_review,
                        }),
                        t(`review.trigger.${review.trigger}`, {
                          defaultValue: review.trigger,
                        }),
                        formatRelative(review.created_at),
                      ].join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      tone={
                        review.status === "PUBLISHED"
                          ? "success"
                          : review.status === "REJECTED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {t(`moderation.${review.status}`, { defaultValue: review.status })}
                    </Badge>
                    {review.nps_score !== null && (
                      <Badge tone="neutral">NPS {review.nps_score}</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {review.pros && (
                    <Quote label={t("review.pros")} tone="success" text={review.pros} />
                  )}
                  {review.cons && (
                    <Quote label={t("review.cons")} tone="warning" text={review.cons} />
                  )}
                </div>
                {review.suggestion && (
                  <p className="mt-3 text-sm text-ink-700">
                    <span className="font-medium">{t("review.suggestion")}: </span>
                    {review.suggestion}
                  </p>
                )}

                {review.admin_response && (
                  <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">
                    <span className="font-medium">{t("adminReviews.ourReply")}: </span>
                    {review.admin_response}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {review.status === "PENDING_REVIEW" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          moderate.mutate({ id: review.id, approve: true })
                        }
                      >
                        {t("adminReviews.publish")}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          moderate.mutate({ id: review.id, approve: false })
                        }
                      >
                        {t("adminReviews.reject")}
                      </Button>
                    </>
                  )}
                  {!review.admin_response && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setReplyTo(review);
                        setReplyText("");
                      }}
                    >
                      {t("adminReviews.reply")}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "campaigns" && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setCreateOpen(true)}>
              {t("adminReviews.newCampaign")}
            </Button>
          </div>

          {campaigns.isLoading && <CardSkeleton rows={3} />}
          {!campaigns.isLoading && (campaigns.data?.length ?? 0) === 0 && (
            <EmptyState
              title={t("adminReviews.noCampaigns")}
              description={t("adminReviews.noCampaignsHint")}
              action={
                <Button onClick={() => setCreateOpen(true)}>
                  {t("adminReviews.newCampaign")}
                </Button>
              }
            />
          )}

          <div className="flex flex-col gap-3">
            {campaigns.data?.map((campaign) => (
              <Card key={campaign.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900">{campaign.title}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {(campaign.audience_roles.length
                        ? campaign.audience_roles.map((role) => t(`role.${role}`))
                        : [t("adminReviews.everyone")]
                      ).join(", ")}
                      {" · "}
                      {t("adminReviews.minAge", { days: campaign.min_account_age_days })}
                    </p>
                  </div>
                  <Badge
                    tone={
                      campaign.status === "RUNNING"
                        ? "brand"
                        : campaign.status === "FINISHED"
                          ? "neutral"
                          : "warning"
                    }
                  >
                    {t(`adminReviews.status.${campaign.status}`)}
                  </Badge>
                </div>

                {campaign.invited_count > 0 && (
                  <div className="mt-3">
                    <ProgressBar
                      label={t("adminReviews.responded", {
                        responded: campaign.responded_count,
                        invited: campaign.invited_count,
                      })}
                      value={campaign.response_rate}
                      showLabel
                      size="sm"
                    />
                  </div>
                )}

                {campaign.status !== "FINISHED" && (
                  <div className="mt-4">
                    <Button
                      size="sm"
                      onClick={() => launch.mutate(campaign.id)}
                      loading={launch.isPending}
                    >
                      {campaign.status === "DRAFT"
                        ? t("adminReviews.launch")
                        : t("adminReviews.inviteMore")}
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={Boolean(replyTo)}
        onClose={() => setReplyTo(null)}
        title={t("adminReviews.replyTitle")}
        footer={
          <Button onClick={() => respond.mutate()} loading={respond.isPending}>
            {t("common.send")}
          </Button>
        }
      >
        <Textarea
          rows={4}
          maxLength={2000}
          value={replyText}
          onChange={(event) => setReplyText(event.target.value)}
          hint={t("adminReviews.replyHint")}
        />
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("adminReviews.newCampaign")}
        footer={
          <Button
            onClick={() => createCampaign.mutate()}
            loading={createCampaign.isPending}
            disabled={!form.title.trim()}
          >
            {t("common.create")}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label={t("adminReviews.campaignTitle")}
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <Textarea
            label={t("adminReviews.campaignMessage")}
            hint={t("adminReviews.campaignMessageHint")}
            rows={3}
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
          />
          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">
              {t("adminReviews.audience")}
            </p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => {
                const on = form.audience_roles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        audience_roles: on
                          ? form.audience_roles.filter((item) => item !== role)
                          : [...form.audience_roles, role],
                      })
                    }
                    className={
                      on
                        ? "rounded-full bg-brand-fill px-3 py-1.5 text-sm font-medium text-on-colour"
                        : "rounded-full border border-ink-300 px-3 py-1.5 text-sm text-ink-600"
                    }
                  >
                    {t(`role.${role}`)}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-ink-500">
              {t("adminReviews.audienceHint")}
            </p>
          </div>
          <Input
            type="number"
            label={t("adminReviews.minAgeLabel")}
            hint={t("adminReviews.minAgeHint")}
            value={String(form.min_account_age_days)}
            onChange={(event) =>
              setForm({
                ...form,
                min_account_age_days: Number(event.target.value) || 0,
              })
            }
          />
        </div>
      </Modal>
    </div>
  );
}

function Quote({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "success" | "warning";
}) {
  return (
    <div
      className={
        tone === "success"
          ? "rounded-xl border border-success-soft bg-success-soft/30 p-3"
          : "rounded-xl border border-warning-soft bg-warning-soft/30 p-3"
      }
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-ink-800">{text}</p>
    </div>
  );
}
