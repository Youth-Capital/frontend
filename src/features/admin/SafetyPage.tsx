import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
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
  Tabs,
  Textarea,
} from "@/shared/ui";
import type { Paginated } from "@/shared/types/api";

interface SafetyEvent {
  id: string;
  rule: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  action: string;
  user_email: string | null;
  user_name: string | null;
  user_role: string | null;
  is_minor: boolean;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  review_note: string;
  created_at: string;
}

const SEVERITY_TONE = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "neutral",
} as const;

/**
 * What the safety filter stopped, and who it happened to.
 *
 * The monitoring page counts these already — "self_harm: 3" — and a count is
 * not something anybody can act on. It does not say who, or when, or whether
 * a person has read it. This is the same data as a queue: names, severity,
 * and a state that can be cleared.
 *
 * Open comes first and stays first. The worst thing that can happen to a
 * safety queue is that it only grows, because then it stops being read — so
 * closing an event takes a note about what was done, and the list of what is
 * still waiting is the default view.
 */
export default function SafetyPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [state, setState] = useState<"open" | "closed">("open");
  const [closing, setClosing] = useState<SafetyEvent | null>(null);
  const [note, setNote] = useState("");

  const events = useQuery({
    queryKey: ["safety-events", state],
    queryFn: async () => {
      const { data } = await api.get<Paginated<SafetyEvent>>(
        `/ai/safety-events/?state=${state}&page_size=50`,
      );
      return data.results;
    },
  });

  const summary = useQuery({
    queryKey: ["safety-summary"],
    queryFn: async () => {
      const { data } = await api.get<{ open: number; open_high: number }>(
        "/ai/safety-events/summary/",
      );
      return data;
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["safety-events"] });
    void queryClient.invalidateQueries({ queryKey: ["safety-summary"] });
  };

  const close = useMutation({
    mutationFn: async () => {
      await api.post(`/ai/safety-events/${closing?.id}/review/`, { note });
    },
    onSuccess: () => {
      setClosing(null);
      setNote("");
      refresh();
    },
  });

  const reopen = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/ai/safety-events/${id}/reopen/`);
    },
    onSuccess: refresh,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.safety")}
        subtitle={t("admin.safetySubtitle")}
        action={
          summary.data && (
            <div className="flex items-center gap-2">
              {summary.data.open_high > 0 && (
                <Badge tone="danger">
                  {t("admin.safetyHighOpen", { count: summary.data.open_high })}
                </Badge>
              )}
              <Badge tone={summary.data.open > 0 ? "warning" : "success"}>
                {t("admin.safetyOpen", { count: summary.data.open })}
              </Badge>
            </div>
          )
        }
      />

      <Tabs
        tabs={[
          {
            key: "open" as const,
            label: t("admin.safetyStateOpen"),
            count: summary.data?.open,
          },
          { key: "closed" as const, label: t("admin.safetyStateClosed") },
        ]}
        active={state}
        onChange={setState}
      />

      {events.isLoading && <CardSkeleton rows={4} />}

      {events.isError && (
        <ErrorState
          title={t("errors.loadFailed")}
          onRetry={() => void events.refetch()}
          retryLabel={t("common.retry")}
        />
      )}

      {events.data?.length === 0 && (
        <EmptyState
          title={
            state === "open" ? t("admin.safetyAllClear") : t("admin.safetyNoneClosed")
          }
          description={state === "open" ? t("admin.safetyAllClearHint") : undefined}
        />
      )}

      <div className="flex flex-col gap-3">
        {events.data?.map((event) => (
          <Card key={event.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={SEVERITY_TONE[event.severity]}>
                    {t(`admin.safetyRule.${event.rule}`, {
                      defaultValue: event.rule,
                    })}
                  </Badge>
                  <Badge tone="neutral">
                    {t(`admin.safetyAction.${event.action}`, {
                      defaultValue: event.action,
                    })}
                  </Badge>
                  {/* Shown because it changes what the right response is. */}
                  {event.is_minor && (
                    <Badge tone="danger">{t("admin.safetyMinor")}</Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-ink-800">
                  {event.user_name || event.user_email || t("admin.safetyNoUser")}
                </p>
                <p className="text-xs text-ink-500">
                  {formatDateTime(event.created_at, i18n.resolvedLanguage)}
                </p>
              </div>

              <div className="shrink-0">
                {event.reviewed_at ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reopen.mutate(event.id)}
                  >
                    {t("admin.safetyReopen")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setClosing(event);
                      setNote("");
                    }}
                  >
                    {t("admin.safetyClose")}
                  </Button>
                )}
              </div>
            </div>

            {event.reviewed_at && (
              <div className="rounded-(--radius-card) border border-ink-200 bg-ink-50 p-3">
                <p className="text-xs text-ink-500">
                  {t("admin.safetyClosedBy", {
                    who: event.reviewed_by_name ?? "—",
                    when: formatDateTime(event.reviewed_at, i18n.resolvedLanguage),
                  })}
                </p>
                {event.review_note && (
                  <p className="mt-1 text-sm text-ink-700">{event.review_note}</p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal
        open={Boolean(closing)}
        onClose={() => setClosing(null)}
        title={t("admin.safetyClose")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setClosing(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => close.mutate()} loading={close.isPending}>
              {t("common.submit")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-600">{t("admin.safetyCloseHint")}</p>
          <Textarea
            id="safety-note"
            label={t("admin.safetyNote")}
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
