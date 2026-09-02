import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api, toApiError } from "@/shared/api/client";
import { formatDateTime } from "@/shared/lib/format";
import { PageHeader } from "@/shared/ui/PageHeader";
import {
  Badge,
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  ErrorState,
  Modal,
  ProgressBar,
  Select,
  Textarea,
} from "@/shared/ui";

interface Learner {
  user_id: string;
  youth_id: string | null;
  name: string;
  target_profession: string | null;
  sessions_total: number;
  sessions_completed: number;
  next_session_at: string | null;
  last_session_at: string | null;
  skills_total: number;
  skills_verified: number;
  plan: {
    id: string;
    title: string;
    progress: number;
    reviewed_by_me: boolean;
    approved: boolean;
  } | null;
}

/**
 * The people this mentor works with.
 *
 * A mentor's list comes from the sessions they hold — whoever booked one is
 * who they are responsible for. The same rule decides whose development plan
 * they may review, so the review lives here beside the learner rather than on
 * a page of its own: approving a plan is a judgement about a person, and it
 * should be made where that person's progress is visible.
 *
 * Each card answers what a mentor wants before a session: where this learner
 * is heading, how much of their skill claim is actually verified, and whether
 * their plan is still waiting on someone.
 */
export default function MentorLearnersPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [reviewFor, setReviewFor] = useState<Learner | null>(null);
  const [status, setStatus] = useState("APPROVED");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const learners = useQuery({
    queryKey: ["mentor-learners"],
    queryFn: async () => {
      const { data } = await api.get<{ count: number; results: Learner[] }>(
        "/mentorship/dashboard/learners/",
      );
      return data.results;
    },
  });

  const review = useMutation({
    mutationFn: async () => {
      await api.post("/mentorship/plan-reviews/", {
        plan: reviewFor?.plan?.id,
        status,
        comment,
      });
    },
    onSuccess: () => {
      setReviewFor(null);
      setComment("");
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["mentor-learners"] });
      void queryClient.invalidateQueries({ queryKey: ["mentor", "dashboard"] });
    },
    onError: (caught) =>
      setError(
        t(`errors.${toApiError(caught).code}`, {
          defaultValue: t("errors.generic"),
        }),
      ),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("mentor.learners")}
        subtitle={t("mentor.learnersSubtitle")}
      />

      {learners.isLoading && <CardSkeleton rows={4} />}

      {learners.isError && (
        <ErrorState
          title={t("errors.loadFailed")}
          onRetry={() => void learners.refetch()}
          retryLabel={t("common.retry")}
        />
      )}

      {learners.data?.length === 0 && (
        <EmptyState
          title={t("mentor.noLearners")}
          description={t("mentor.noLearnersHint")}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {learners.data?.map((learner) => (
          <Card key={learner.user_id} className="flex h-full flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">
                  {learner.name}
                </p>
                <p className="truncate text-sm text-ink-500">
                  {[learner.youth_id, learner.target_profession]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {learner.next_session_at ? (
                <Badge tone="brand">
                  {formatDateTime(learner.next_session_at, i18n.resolvedLanguage)}
                </Badge>
              ) : (
                <Badge tone="neutral">{t("mentor.noUpcoming")}</Badge>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="flex gap-1.5">
                <dt className="text-ink-500">{t("mentor.sessionsHeld")}:</dt>
                <dd className="tabular-nums text-ink-800">
                  {learner.sessions_completed}/{learner.sessions_total}
                </dd>
              </div>
              <div className="flex gap-1.5">
                {/* Verified against claimed: the gap is the conversation. */}
                <dt className="text-ink-500">{t("mentor.skillsVerified")}:</dt>
                <dd className="tabular-nums text-ink-800">
                  {learner.skills_verified}/{learner.skills_total}
                </dd>
              </div>
            </dl>

            {learner.plan ? (
              <div className="mt-auto rounded-(--radius-card) border border-ink-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-ink-800">
                    {learner.plan.title}
                  </p>
                  {learner.plan.approved ? (
                    <Badge tone="success">{t("mentor.planApproved")}</Badge>
                  ) : learner.plan.reviewed_by_me ? (
                    <Badge tone="neutral">{t("mentor.planReviewed")}</Badge>
                  ) : (
                    <Badge tone="warning">{t("mentor.planWaiting")}</Badge>
                  )}
                </div>
                <div className="mt-2">
                  <ProgressBar
                    value={learner.plan.progress}
                    showLabel
                    size="sm"
                    tone="brand"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setReviewFor(learner);
                      setStatus("APPROVED");
                      setComment("");
                    }}
                  >
                    {t("mentor.reviewPlan")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-auto text-sm text-ink-500">
                {t("mentor.noPlanYet")}
              </p>
            )}
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(reviewFor)}
        onClose={() => setReviewFor(null)}
        title={reviewFor ? `${t("mentor.reviewPlan")} — ${reviewFor.name}` : ""}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewFor(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => review.mutate()} loading={review.isPending}>
              {t("common.submit")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-600">{t("mentor.reviewPlanHint")}</p>

          <Select
            id="review-status"
            label={t("mentor.reviewDecision")}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="APPROVED">{t("mentor.reviewApprove")}</option>
            <option value="CHANGES_REQUESTED">
              {t("mentor.reviewChanges")}
            </option>
          </Select>

          <Textarea
            id="review-comment"
            label={t("mentor.reviewComment")}
            hint={
              status === "CHANGES_REQUESTED"
                ? t("mentor.reviewCommentRequired")
                : t("common.optional")
            }
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
