import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { useAuth, HOME_BY_ROLE } from "@/shared/auth/AuthContext";
import { formatRelative } from "@/shared/lib/format";
import { PageHeader } from "@/shared/ui/PageHeader";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  Textarea,
} from "@/shared/ui";

interface ReviewRequest {
  id: string;
  trigger: string;
  campaign_title: string;
  campaign_message: string;
  notified_at: string | null;
}

interface Review {
  id: string;
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

/**
 * The feedback form.
 *
 * Pros and cons are separate fields rather than one box, and that is the whole
 * design. One box labelled "feedback" collects praise from people who like the
 * platform and complaints from people who do not, and nothing usable from
 * anyone in between. Two boxes make the satisfied user name a weakness and the
 * frustrated one name a strength — which is where the material worth acting on
 * turns out to be.
 *
 * "Not now" is a real answer and gets a real button. Without one, the only way
 * out of an invitation is to ignore it, and a person who has learned to ignore
 * notifications stops reading the ones that matter.
 */
export default function ReviewPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const describeError = useApiError();

  const [rating, setRating] = useState(0);
  const [nps, setNps] = useState<number | null>(null);
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const mine = useQuery({
    queryKey: ["my-reviews"],
    queryFn: async () => {
      const { data } = await api.get<{
        pending_request: ReviewRequest | null;
        reviews: Review[];
      }>("/feedback/me/");
      return data;
    },
  });

  const pending = mine.data?.pending_request ?? null;
  const requestId = params.get("request") ?? pending?.id ?? null;

  useEffect(() => {
    if (sent) {
      const timer = setTimeout(() => navigate(user ? HOME_BY_ROLE[user.role] : "/"), 2600);
      return () => clearTimeout(timer);
    }
  }, [sent, navigate, user]);

  const submit = useMutation({
    mutationFn: async () => {
      setError("");
      await api.post("/feedback/me/", {
        rating,
        nps_score: nps,
        pros,
        cons,
        suggestion,
        is_anonymous: anonymous,
        request: requestId,
      });
    },
    onSuccess: () => {
      setSent(true);
      void queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (failure) => setError(describeError(failure)),
  });

  const dismiss = useMutation({
    mutationFn: async () => {
      if (!requestId) return;
      await api.post(`/feedback/requests/${requestId}/dismiss/`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      navigate(user ? HOME_BY_ROLE[user.role] : "/");
    },
    onError: (failure) => setError(describeError(failure)),
  });

  if (mine.isLoading) return <CardSkeleton rows={6} />;

  if (sent) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <p className="text-4xl" aria-hidden>
          ✓
        </p>
        <h1 className="mt-3 text-lg font-semibold text-ink-900">
          {t("review.thanksTitle")}
        </h1>
        <p className="mt-1 text-sm text-ink-600">{t("review.thanksBody")}</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title={t("review.title")}
        subtitle={pending?.campaign_message || t("review.subtitle")}
      />

      {pending && (
        <p className="rounded-(--radius-card) border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {t(`review.trigger.${pending.trigger}`, {
            defaultValue: t("review.trigger.CAMPAIGN"),
          })}
        </p>
      )}

      <Card>
        <CardHeader title={t("review.ratingLabel")} />
        <div className="flex gap-2" role="radiogroup" aria-label={t("review.ratingLabel")}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={t("review.stars", { count: value })}
              onClick={() => setRating(value)}
              className={
                value <= rating
                  ? "flex h-12 w-12 items-center justify-center rounded-xl bg-warning-soft text-2xl text-warning"
                  : "flex h-12 w-12 items-center justify-center rounded-xl border border-ink-300 text-2xl text-ink-300 hover:border-ink-400"
              }
            >
              ★
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="mt-2 text-sm text-ink-600">
            {t(`review.rating.${rating}`)}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader
          title={t("review.npsLabel")}
          subtitle={t("review.npsHint")}
        />
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }, (_, value) => (
            <button
              key={value}
              type="button"
              aria-pressed={nps === value}
              onClick={() => setNps(nps === value ? null : value)}
              className={
                nps === value
                  ? "h-9 w-9 rounded-lg bg-brand-fill text-sm font-semibold text-on-colour"
                  : "h-9 w-9 rounded-lg border border-ink-300 text-sm text-ink-600 hover:border-ink-400"
              }
            >
              {value}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        {/* Both, always. The point is to make a happy user name a weakness and
            an unhappy one name a strength. */}
        <div className="flex flex-col gap-4">
          <Textarea
            label={t("review.pros")}
            hint={t("review.prosHint")}
            rows={3}
            maxLength={2000}
            value={pros}
            onChange={(event) => setPros(event.target.value)}
          />
          <Textarea
            label={t("review.cons")}
            hint={t("review.consHint")}
            rows={3}
            maxLength={2000}
            value={cons}
            onChange={(event) => setCons(event.target.value)}
          />
          <Textarea
            label={t("review.suggestion")}
            rows={2}
            maxLength={2000}
            value={suggestion}
            onChange={(event) => setSuggestion(event.target.value)}
          />

          <label className="flex items-center gap-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(event) => setAnonymous(event.target.checked)}
            />
            {t("review.anonymous")}
          </label>
          <p className="-mt-2 text-xs text-ink-500">{t("review.anonymousHint")}</p>
        </div>
      </Card>

      {error && (
        <p className="rounded-(--radius-card) bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {requestId ? (
          <Button
            variant="ghost"
            onClick={() => dismiss.mutate()}
            loading={dismiss.isPending}
          >
            {t("review.notNow")}
          </Button>
        ) : (
          <span />
        )}
        <Button
          onClick={() => submit.mutate()}
          loading={submit.isPending}
          disabled={rating === 0}
        >
          {t("review.send")}
        </Button>
      </div>

      {(mine.data?.reviews.length ?? 0) > 0 && (
        <Card>
          <CardHeader title={t("review.mine")} />
          <ul className="flex flex-col divide-y divide-ink-200">
            {mine.data?.reviews.map((review) => (
              <li key={review.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ink-800">
                    {"★".repeat(review.rating)}
                    <span className="text-ink-300">
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={review.status === "PUBLISHED" ? "success" : "neutral"}
                    >
                      {t(`moderation.${review.status}`, {
                        defaultValue: review.status,
                      })}
                    </Badge>
                    <span className="text-xs text-ink-500">
                      {formatRelative(review.created_at)}
                    </span>
                  </div>
                </div>
                {review.cons && (
                  <p className="mt-1.5 text-sm text-ink-600">{review.cons}</p>
                )}
                {review.admin_response && (
                  <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">
                    <span className="font-medium">{t("review.teamReplied")}: </span>
                    {review.admin_response}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
