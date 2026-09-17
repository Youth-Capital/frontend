import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatDate } from "@/shared/lib/format";
import {
  Badge,
  Button,
  Card,
  CardSkeleton,
  EmptyState,
  Input,
  Select,
  Table,
  Td,
  Th,
} from "@/shared/ui";
import type { Paginated, Role } from "@/shared/types/api";

interface AdminUser {
  id: string;
  email: string;
  phone: string | null;
  role: Role;
  display_name: string;
  is_active: boolean;
  email_verified: boolean;
  date_joined: string;
  last_login: string | null;
  profile_summary: Record<string, string | number | null>;
}

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  const users = useQuery({
    queryKey: ["admin-users", search, role],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "50" });
      if (search) params.set("search", search);
      if (role) params.set("role", role);
      const { data } = await api.get<Paginated<AdminUser>>(
        `/auth/admin/users/?${params.toString()}`,
      );
      return data.results;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await api.post(`/auth/admin/users/${id}/${active ? "deactivate" : "activate"}/`);
    },
    onSuccess: () => {
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, nextRole }: { id: string; nextRole: string }) => {
      await api.post(`/auth/admin/users/${id}/change-role/`, { role: nextRole });
    },
    onSuccess: () => {
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.userManagement")}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Input
            id="user-search"
            placeholder={t("common.search")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          id="user-role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="">{t("common.all")}</option>
          <option value="STUDENT">{t("role.STUDENT")}</option>
          <option value="EMPLOYER">{t("role.EMPLOYER")}</option>
          <option value="ADMIN">{t("role.ADMIN")}</option>
        </Select>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {users.isLoading && <CardSkeleton rows={6} />}
      {!users.isLoading && (users.data?.length ?? 0) === 0 && (
        <EmptyState title={t("common.none")} />
      )}

      {(users.data?.length ?? 0) > 0 && (
        <Card padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>{t("auth.email")}</Th>
                <Th>{t("admin.role")}</Th>
                <Th>{t("admin.profile")}</Th>
                <Th align="right">{t("common.edit")}</Th>
              </tr>
            </thead>
            <tbody>
              {users.data?.map((user) => (
                <tr key={user.id} className={user.is_active ? "" : "opacity-60"}>
                  <Td>
                    <div className="min-w-0">
                      <p className="font-medium text-ink-800">{user.display_name}</p>
                      <p className="text-xs text-ink-500">{user.email}</p>
                      <p className="text-xs text-ink-400">
                        {formatDate(user.date_joined, i18n.resolvedLanguage)}
                      </p>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <Badge tone={user.role === "ADMIN" ? "warning" : "neutral"}>
                        {t(`role.${user.role}`)}
                      </Badge>
                      {!user.is_active && <Badge tone="danger">✕</Badge>}
                      {!user.email_verified && <Badge tone="warning">!</Badge>}
                    </div>
                  </Td>
                  <Td>
                    <div className="text-xs text-ink-500">
                      {Object.entries(user.profile_summary).map(([key, value]) => (
                        <p key={key}>
                          {key}: {String(value ?? "—")}
                        </p>
                      ))}
                    </div>
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        value={user.role}
                        onChange={(event) =>
                          changeRole.mutate({
                            id: user.id,
                            nextRole: event.target.value,
                          })
                        }
                        className="rounded-md border border-ink-300 px-2 py-1 text-xs"
                        aria-label={t("admin.changeRole")}
                      >
                        {(["STUDENT", "EMPLOYER", "ADMIN"] as const).map(
                          (option) => (
                            <option key={option} value={option}>
                              {t(`role.${option}`)}
                            </option>
                          ),
                        )}
                      </select>
                      <Button
                        variant={user.is_active ? "ghost" : "secondary"}
                        size="sm"
                        onClick={() =>
                          toggleActive.mutate({ id: user.id, active: user.is_active })
                        }
                      >
                        {user.is_active ? t("admin.deactivate") : t("admin.activate")}
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
