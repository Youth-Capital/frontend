import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { formatDateTime } from "@/shared/lib/format";
import {
  Badge,
  Card,
  CardSkeleton,
  EmptyState,
  Input,
  Select,
  Table,
  Td,
  Th,
} from "@/shared/ui";
import type { Paginated } from "@/shared/types/api";

interface AuditEntry {
  id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  object_type: string;
  object_id: string;
  object_repr: string;
  changes: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  note: string;
  ip: string | null;
  request_id: string;
  severity: string;
  created_at: string;
}

const SEVERITY_TONE: Record<string, "neutral" | "info" | "warning" | "danger"> = {
  INFO: "neutral",
  NOTICE: "info",
  WARNING: "warning",
  CRITICAL: "danger",
};

export default function AuditPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [action, setAction] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const entries = useQuery({
    queryKey: ["audit", search, severity, action],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "100" });
      if (search) params.set("search", search);
      if (severity) params.set("severity", severity);
      if (action) params.set("action", action);
      const { data } = await api.get<Paginated<AuditEntry>>(
        `/audit/logs/?${params.toString()}`,
      );
      return data.results;
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.auditLog")}
        subtitle={t("admin.auditHint")}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          id="audit-search"
          placeholder={t("common.search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          id="audit-severity"
          value={severity}
          onChange={(event) => setSeverity(event.target.value)}
        >
          <option value="">{t("common.all")}</option>
          {["INFO", "NOTICE", "WARNING", "CRITICAL"].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
        <Select
          id="audit-action"
          value={action}
          onChange={(event) => setAction(event.target.value)}
        >
          <option value="">{t("common.all")}</option>
          {[
            "LOGIN",
            "LOGIN_FAILED",
            "CREATE",
            "UPDATE",
            "ROLE_CHANGE",
            "MODERATE",
            "STATUS_CHANGE",
            "CONSENT_GRANT",
            "CONSENT_REVOKE",
            "PII_ACCESS",
            "CONFIG_CHANGE",
          ].map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </div>

      {entries.isLoading && <CardSkeleton rows={6} />}
      {!entries.isLoading && (entries.data?.length ?? 0) === 0 && (
        <EmptyState title={t("common.none")} />
      )}

      {(entries.data?.length ?? 0) > 0 && (
        <Card padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>{t("common.page")}</Th>
                <Th>actor</Th>
                <Th>action</Th>
                <Th>object</Th>
                <Th align="center">severity</Th>
              </tr>
            </thead>
            <tbody>
              {entries.data?.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() =>
                    setExpanded((current) => (current === entry.id ? null : entry.id))
                  }
                  className="cursor-pointer hover:bg-ink-50"
                >
                  <Td>
                    <span className="whitespace-nowrap text-xs text-ink-500">
                      {formatDateTime(entry.created_at, i18n.resolvedLanguage)}
                    </span>
                  </Td>
                  <Td>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-ink-700">
                        {entry.actor_email || "system"}
                      </p>
                      {entry.actor_role && (
                        <p className="text-xs text-ink-400">{entry.actor_role}</p>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <code className="text-xs text-ink-700">{entry.action}</code>
                  </Td>
                  <Td>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-ink-700">
                        {entry.object_repr || entry.object_type}
                      </p>
                      {expanded === entry.id &&
                        Object.keys(entry.changes).length > 0 && (
                          <pre className="mt-2 max-w-md overflow-x-auto rounded bg-ink-100 p-2 text-[10px] text-ink-600">
                            {JSON.stringify(entry.changes, null, 2)}
                          </pre>
                        )}
                      {expanded === entry.id && entry.note && (
                        <p className="mt-1 text-xs text-ink-500">{entry.note}</p>
                      )}
                      {expanded === entry.id && (
                        <p className="mt-1 font-mono text-[10px] text-ink-400">
                          {entry.ip} · {entry.request_id}
                        </p>
                      )}
                    </div>
                  </Td>
                  <Td align="center">
                    <Badge tone={SEVERITY_TONE[entry.severity] ?? "neutral"}>
                      {entry.severity}
                    </Badge>
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
