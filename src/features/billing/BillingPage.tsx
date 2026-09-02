import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatDate } from "@/shared/lib/format";
import {
  DataList,
  DataRow,
  RowMain,
  RowValue,
} from "@/shared/ui/DataList";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  EmptyState,
  Modal,
  ProgressBar,
} from "@/shared/ui";
import type {
  CheckoutResponse,
  Payment,
  Plan,
  Subscription,
  SubscriptionStatus,
  UsageEntry,
} from "@/shared/types/api";

const STATUS_TONE: Record<
  SubscriptionStatus,
  "neutral" | "brand" | "success" | "warning" | "danger" | "info"
> = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELED: "neutral",
  EXPIRED: "danger",
};

const PAYMENT_TONE: Record<
  Payment["status"],
  "neutral" | "brand" | "success" | "warning" | "danger" | "info"
> = {
  PENDING: "warning",
  SUCCEEDED: "success",
  FAILED: "danger",
  REFUNDED: "neutral",
};

/**
 * Billing and subscription.
 *
 * One page serves both roles: the plans list is filtered by the caller's role
 * server-side, and the usage panel only ever contains features that role can
 * actually reach. Splitting it in two would duplicate the whole upgrade flow
 * to change four strings.
 */
export default function BillingPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);

  const subscription = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: async () => {
      const { data } = await api.get<Subscription>("/billing/subscription/");
      return data;
    },
  });

  const plans = useQuery({
    queryKey: ["billing", "plans", user?.role],
    queryFn: async () => {
      const { data } = await api.get<Plan[]>(`/billing/plans/?role=${user?.role}`);
      return data;
    },
    enabled: Boolean(user?.role),
  });

  const usage = useQuery({
    queryKey: ["billing", "usage"],
    queryFn: async () => {
      const { data } = await api.get<UsageEntry[]>("/billing/usage/");
      return data;
    },
  });

  const history = useQuery({
    queryKey: ["billing", "history"],
    queryFn: async () => {
      const { data } = await api.get<Payment[]>("/billing/history/");
      return data;
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["billing"] });
  };

  /* Checkout is two calls on purpose: the server records what is owed, then
     re-reads settlement from the provider. The client never asserts that a
     payment succeeded — it only says which one to check. */
  const upgrade = useMutation({
    mutationFn: async (planCode: string) => {
      const { data } = await api.post<CheckoutResponse>("/billing/checkout/", {
        plan_code: planCode,
      });

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
        return null;
      }

      const { data: settled } = await api.post<Payment>("/billing/confirm/", {
        reference: data.reference,
      });
      return settled;
    },
    onSuccess: (settled) => {
      if (settled && settled.status !== "SUCCEEDED") {
        setError(t(`billing.paymentFailed.${settled.failure_reason}`, {
          defaultValue: t("billing.paymentFailed.generic"),
        }));
        return;
      }
      setError("");
      refresh();
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const cancel = useMutation({
    mutationFn: async () => {
      await api.post("/billing/cancel/", { immediately: false });
    },
    onSuccess: () => {
      setConfirmCancel(false);
      setError("");
      refresh();
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const current = subscription.data;
  const currentCode = current?.plan.code;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("billing.title")}
        subtitle={t("billing.subtitle")}
      />

      {error && (
        <div role="alert" className="rounded-(--radius-card) bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {/* -- current plan -------------------------------------------------- */}
      {subscription.isLoading && <CardSkeleton rows={3} />}
      {current && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {t("billing.currentPlan")}
              </p>
              <p className="mt-1 font-display text-3xl font-semibold text-ink-900">
                {current.plan.name}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[current.status]}>
                  {t(`billing.status.${current.status}`)}
                </Badge>
                {current.cancel_at_period_end && (
                  <Badge tone="warning">{t("billing.willNotRenew")}</Badge>
                )}
              </div>
            </div>

            <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-500">{t("billing.price")}</dt>
                <dd className="font-semibold tabular-nums text-ink-900">
                  {current.plan.is_free
                    ? t("billing.free")
                    : `${current.plan.price_display} / ${t(
                        `billing.interval.${current.plan.interval}`,
                      )}`}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">
                  {current.cancel_at_period_end
                    ? t("billing.accessUntil")
                    : t("billing.nextBilling")}
                </dt>
                <dd className="font-semibold tabular-nums text-ink-900">
                  {current.current_period_end
                    ? formatDate(current.current_period_end, i18n.resolvedLanguage)
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>

          {!current.plan.is_free && !current.cancel_at_period_end && (
            <div className="mt-4 border-t border-ink-200 pt-4">
              <Button variant="secondary" onClick={() => setConfirmCancel(true)}>
                {t("billing.cancel")}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* -- usage --------------------------------------------------------- */}
      <Card>
        <CardHeader title={t("billing.usage")} subtitle={t("billing.usageHint")} />
        {usage.isLoading && <CardSkeleton rows={4} />}
        {usage.data && usage.data.length === 0 && (
          <EmptyState title={t("common.none")} />
        )}
        {usage.data && usage.data.length > 0 && (
          <div className="mt-3 flex flex-col gap-3">
            {usage.data.map((entry) => (
              <UsageRow key={entry.feature} entry={entry} />
            ))}
          </div>
        )}
      </Card>

      {/* -- plans --------------------------------------------------------- */}
      <div>
        <h2 className="text-lg font-semibold text-ink-900">{t("billing.plans")}</h2>
        {plans.isLoading && <div className="mt-3"><CardSkeleton rows={3} /></div>}
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          {plans.data?.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.code === currentCode}
              busy={upgrade.isPending}
              onSelect={() => upgrade.mutate(plan.code)}
            />
          ))}
        </div>
      </div>

      {/* -- history ------------------------------------------------------- */}
      <div>
        <h2 className="text-lg font-semibold text-ink-900">{t("billing.history")}</h2>
        <div className="mt-3">
          {history.isLoading && <CardSkeleton rows={3} />}
          {history.data && history.data.length === 0 && (
            <EmptyState title={t("billing.noPayments")} />
          )}
          {history.data && history.data.length > 0 && (
            <DataList>
              {history.data.map((payment) => (
                <DataRow key={payment.id}>
                  <RowMain
                    title={payment.plan_name}
                    subtitle={formatDate(
                      payment.paid_at ?? payment.created_at,
                      i18n.resolvedLanguage,
                    )}
                    badges={
                      <Badge tone={PAYMENT_TONE[payment.status]}>
                        {t(`billing.paymentStatus.${payment.status}`)}
                      </Badge>
                    }
                  />
                  <RowValue value={payment.amount_display} />
                </DataRow>
              ))}
            </DataList>
          )}
        </div>
      </div>

      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title={t("billing.cancel")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              {t("common.close")}
            </Button>
            <Button
              variant="danger"
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
            >
              {t("billing.confirmCancel")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">
          {t("billing.cancelExplain", {
            date: current?.current_period_end
              ? formatDate(current.current_period_end, i18n.resolvedLanguage)
              : "—",
          })}
        </p>
      </Modal>
    </div>
  );
}

/** One usage meter. Unlimited and not-included both need a shape that is not a bar. */
function UsageRow({ entry }: { entry: UsageEntry }) {
  const { t } = useTranslation();
  const label = t(`billing.feature.${entry.feature}`, {
    defaultValue: entry.feature,
  });

  if (!entry.granted) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-ink-500">{label}</span>
        <Badge tone="neutral">{t("billing.notIncluded")}</Badge>
      </div>
    );
  }

  if (entry.limit === null) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-ink-800">{label}</span>
        <Badge tone="success">{t("billing.unlimited")}</Badge>
      </div>
    );
  }

  const ratio = entry.limit === 0 ? 100 : (entry.used / entry.limit) * 100;
  const tone = ratio >= 100 ? "danger" : ratio >= 80 ? "warning" : "brand";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink-800">{label}</span>
        <span className="tabular-nums text-ink-600">
          {entry.used} / {entry.limit}
        </span>
      </div>
      <ProgressBar value={Math.min(100, ratio)} size="sm" tone={tone} />
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  busy,
  onSelect,
}: {
  plan: Plan;
  isCurrent: boolean;
  busy: boolean;
  onSelect: () => void;
}) {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? "uz") as "uz" | "ru" | "en";

  return (
    <div
      className={
        isCurrent
          ? "flex flex-col rounded-(--radius-card) border-2 border-brand-600 bg-surface p-5"
          : "flex flex-col rounded-(--radius-card) border border-ink-200 bg-surface p-5"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-xl font-semibold text-ink-900">{plan.name}</h3>
        {isCurrent && <Badge tone="brand">{t("billing.yourPlan")}</Badge>}
      </div>

      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink-900">
        {plan.is_free ? t("billing.free") : plan.price_display}
        {!plan.is_free && (
          <span className="ml-1 text-sm font-normal text-ink-500">
            / {t(`billing.interval.${plan.interval}`)}
          </span>
        )}
      </p>

      {plan.trial_days > 0 && !isCurrent && (
        <p className="mt-1 text-xs text-success">
          {t("billing.trialDays", { count: plan.trial_days })}
        </p>
      )}

      <p className="mt-2 text-sm text-ink-600">{plan.description}</p>

      <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-sm text-ink-700">
        {plan.highlights.map((highlight) => (
          <li key={highlight.en} className="flex gap-2">
            <span aria-hidden className="text-brand-600">✓</span>
            <span>{highlight[language] || highlight.uz}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {isCurrent ? (
          <Button variant="secondary" disabled fullWidth>
            {t("billing.currentPlan")}
          </Button>
        ) : (
          <Button onClick={onSelect} disabled={busy} fullWidth>
            {plan.is_free ? t("billing.switchToFree") : t("billing.upgrade")}
          </Button>
        )}
      </div>
    </div>
  );
}
