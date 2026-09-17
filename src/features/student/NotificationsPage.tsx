import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { formatRelative, humanisePayload } from "@/shared/lib/format";
import { Badge, Button, Card, CardSkeleton, EmptyState } from "@/shared/ui";
import type { Notification, Paginated } from "@/shared/types/api";

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Notification>>(
        "/notifications/?page_size=50",
      );
      return data.results;
    },
  });

  const markRead = useMutation({
    mutationFn: async (ids?: string[]) => {
      await api.post("/notifications/mark-read/", ids ? { ids } : {});
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unread = (notifications.data ?? []).filter((item) => !item.is_read).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">
            {t("notifications.title")}
          </h1>
          {unread > 0 && (
            <p className="mt-1 text-sm text-ink-500">
              {t("notifications.unread", { count: unread })}
            </p>
          )}
        </div>
        {unread > 0 && (
          <Button
            variant="secondary"
            onClick={() => markRead.mutate(undefined)}
            loading={markRead.isPending}
          >
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      {notifications.isLoading && <CardSkeleton rows={5} />}
      {!notifications.isLoading && (notifications.data?.length ?? 0) === 0 && (
        <EmptyState title={t("notifications.empty")} />
      )}

      <div className="flex flex-col gap-2">
        {notifications.data?.map((notification) => {
          // The payload is machine output until it is made readable: dates
          // arrive as ISO timestamps and a status arrives as its enum name.
          const body = t(notification.body_key, {
            ...humanisePayload(notification.payload, i18n.resolvedLanguage),
            status: notification.payload.status
              ? t(`applications.status.${notification.payload.status as string}`, {
                  defaultValue: String(notification.payload.status),
                })
              : undefined,
            defaultValue: "",
          });

          return (
            <Card
              key={notification.id}
              className={notification.is_read ? "opacity-70" : "border-brand-300"}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!notification.is_read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-brand-fill" />
                    )}
                    <span className="font-medium text-ink-900">
                      {t(notification.title_key, {
                        defaultValue: notification.type,
                      })}
                    </span>
                    {notification.priority === "HIGH" && (
                      <Badge tone="warning">!</Badge>
                    )}
                  </div>
                  {body && <p className="mt-1 text-sm text-ink-600">{body}</p>}
                  <p className="mt-1 text-xs text-ink-400">
                    {formatRelative(notification.created_at, i18n.resolvedLanguage)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {notification.action_url && (
                    <Link
                      to={notification.action_url}
                      onClick={() => markRead.mutate([notification.id])}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      {t("plan.openLinked")}
                    </Link>
                  )}
                  {!notification.is_read && (
                    <button
                      type="button"
                      onClick={() => markRead.mutate([notification.id])}
                      className="text-xs text-ink-400 hover:text-ink-700"
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
