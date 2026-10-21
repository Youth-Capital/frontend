import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { api } from "@/shared/api/client";
import { formatDate } from "@/shared/lib/format";
import {
  Badge,
  Card,
  CardSkeleton,
  DataList,
  DataRow,
  ErrorState,
  SectionLabel,
} from "@/shared/ui";
import { PageHeader } from "@/shared/ui/PageHeader";

/**
 * One person's whole record, for an administrator.
 *
 * The list answers "who is on the platform"; this answers "who is this" —
 * everything the platform holds about one account on one screen, so handling a
 * support request or a complaint does not mean opening six of them.
 *
 * The password is not here, and the account block says so rather than leaving
 * a blank where an administrator would look for it. It is not withheld: the
 * account stores an Argon2id hash, which confirms a password typed at sign-in
 * and cannot produce one. Somebody locked out gets a reset, not a readout.
 */

interface Overview {
  account: {
    id: string;
    email: string;
    email_verified: boolean;
    phone: string | null;
    role: string;
    display_name: string;
    preferred_language: string;
    is_active: boolean;
    is_superuser: boolean;
    date_joined: string;
    last_login: string | null;
    last_login_ip: string | null;
    password: string;
  };
  profile: Record<string, string | number | boolean | null> | null;
  company: Record<string, string | null> | null;
  skills: {
    total: number;
    verified: number;
    items: { name: string; proficiency: number; verified: boolean; band: string }[];
  };
  learning: {
    enrolled: number;
    completed: number;
    courses: { title: string; status: string; progress: number }[];
    certificates: { title: string; serial: string; issued_at: string }[];
  };
  assessment: {
    attempts: number;
    passed: number;
    items: { test: string; status: string; score: number; taken_at: string }[];
  };
  experience: {
    title: string;
    organization: string;
    type: string;
    months: number;
    verification_status: string;
  }[];
  billing: {
    plan: string;
    status: string;
    period_start: string | null;
    period_end: string | null;
  } | null;
  consents: {
    type: string;
    version: string;
    granted: boolean;
    granted_at: string;
    revoked_at: string | null;
  }[];
  devices: {
    browser: string;
    system: string;
    kind: string;
    last_ip: string | null;
    last_seen_at: string;
  }[];
  recent_activity: {
    action: string;
    object_type: string;
    object_repr: string;
    created_at: string;
    ip: string | null;
  }[];
}

export default function AdminUserDetailPage() {
  const { t, i18n } = useTranslation();
  const { userId } = useParams();
  const language = i18n.resolvedLanguage;

  const record = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: async () => {
      const { data } = await api.get<Overview>(`/auth/admin/users/${userId}/overview/`);
      return data;
    },
    enabled: Boolean(userId),
  });

  if (record.isLoading) return <CardSkeleton rows={8} />;
  if (record.isError || !record.data) {
    return <ErrorState title={t("errors.loadFailed")} onRetry={() => record.refetch()} />;
  }

  const data = record.data;
  const a = data.account;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/admin/users" className="text-sm text-brand-700 hover:underline">
        ← {t("nav.users")}
      </Link>

      <PageHeader title={a.display_name || a.email} subtitle={a.email} />

      <Card>
        <SectionLabel>{t("adminUser.account")}</SectionLabel>
        <DataList divided>
          <DataRow title={t("auth.email")} value={a.email} />
          <DataRow
            title={t("profile.verified")}
            value={a.email_verified ? t("common.yes") : t("common.no")}
          />
          <DataRow title={t("profile.phone")} value={a.phone ?? "—"} />
          <DataRow title={t("admin.role")} value={t(`role.${a.role}`)} />
          <DataRow title={t("settings.language")} value={a.preferred_language} />
          <DataRow
            title={t("adminUser.status")}
            value={a.is_active ? t("adminUser.active") : t("adminUser.inactive")}
          />
          <DataRow
            title={t("adminUser.joined")}
            value={formatDate(a.date_joined, language)}
          />
          <DataRow
            title={t("adminUser.lastLogin")}
            value={a.last_login ? formatDate(a.last_login, language) : "—"}
            meta={a.last_login_ip ?? undefined}
          />
        </DataList>

        {/* Stated, not omitted: this is where an administrator looks for it. */}
        <p className="mt-4 rounded-(--radius-control) bg-ink-100 p-3 text-xs text-ink-600">
          <span className="font-semibold">{t("adminUser.password")}: </span>
          {t("adminUser.passwordHint")}
        </p>
      </Card>

      {data.profile && (
        <Card>
          <SectionLabel>{t("adminUser.profile")}</SectionLabel>
          <DataList divided>
            {Object.entries(data.profile).map(([key, value]) => (
              <DataRow
                key={key}
                title={t(`adminUser.field.${key}`, { defaultValue: key })}
                value={value === null || value === "" ? "—" : String(value)}
              />
            ))}
          </DataList>
        </Card>
      )}

      {data.company && (
        <Card>
          <SectionLabel>{t("adminUser.company")}</SectionLabel>
          <DataList divided>
            {Object.entries(data.company).map(([key, value]) => (
              <DataRow
                key={key}
                title={t(`adminUser.field.${key}`, { defaultValue: key })}
                value={value ?? "—"}
              />
            ))}
          </DataList>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="self-start">
          <SectionLabel count={data.skills.total}>{t("nav.skills")}</SectionLabel>
          <p className="mb-2 text-xs text-ink-500">
            {t("adminUser.verifiedOf", {
              verified: data.skills.verified,
              total: data.skills.total,
            })}
          </p>
          <DataList>
            {data.skills.items.map((skill) => (
              <DataRow
                key={skill.name}
                title={skill.name}
                mark={skill.verified ? "success" : undefined}
                meta={skill.band}
                value={skill.proficiency}
              />
            ))}
          </DataList>
        </Card>

        <Card className="self-start">
          <SectionLabel count={data.learning.enrolled}>{t("nav.courses")}</SectionLabel>
          <p className="mb-2 text-xs text-ink-500">
            {t("adminUser.completedOf", {
              done: data.learning.completed,
              total: data.learning.enrolled,
            })}
          </p>
          <DataList>
            {data.learning.courses.map((course) => (
              <DataRow
                key={course.title}
                title={course.title}
                meta={course.status}
                value={`${course.progress}%`}
              />
            ))}
          </DataList>
          {data.learning.certificates.length > 0 && (
            <div className="mt-4">
              <SectionLabel count={data.learning.certificates.length}>
                {t("cv.section.certificates")}
              </SectionLabel>
              <DataList>
                {data.learning.certificates.map((certificate) => (
                  <DataRow
                    key={certificate.serial}
                    title={certificate.title}
                    meta={certificate.serial}
                    value={formatDate(certificate.issued_at, language)}
                  />
                ))}
              </DataList>
            </div>
          )}
        </Card>

        <Card className="self-start">
          <SectionLabel count={data.assessment.attempts}>{t("nav.tests")}</SectionLabel>
          <p className="mb-2 text-xs text-ink-500">
            {t("adminUser.passedOf", {
              done: data.assessment.passed,
              total: data.assessment.attempts,
            })}
          </p>
          <DataList>
            {data.assessment.items.map((attempt, index) => (
              <DataRow
                key={`${attempt.test}-${index}`}
                title={attempt.test}
                meta={`${attempt.status} · ${formatDate(attempt.taken_at, language)}`}
                value={attempt.score}
              />
            ))}
          </DataList>
        </Card>

        <Card className="self-start">
          <SectionLabel count={data.experience.length}>{t("nav.experience")}</SectionLabel>
          <DataList>
            {data.experience.map((item, index) => (
              <DataRow
                key={`${item.title}-${index}`}
                title={item.title}
                meta={[item.organization, item.type, item.verification_status]
                  .filter(Boolean)
                  .join(" · ")}
                value={item.months ? `${item.months}` : undefined}
              />
            ))}
          </DataList>
        </Card>

        <Card className="self-start">
          <SectionLabel>{t("adminUser.billing")}</SectionLabel>
          {data.billing ? (
            <DataList divided>
              <DataRow title={t("billing.currentPlan")} value={data.billing.plan} />
              <DataRow title={t("adminUser.status")} value={data.billing.status} />
              <DataRow
                title={t("adminUser.period")}
                value={
                  data.billing.period_end
                    ? formatDate(data.billing.period_end, language)
                    : "—"
                }
              />
            </DataList>
          ) : (
            <p className="text-sm text-ink-500">{t("common.none")}</p>
          )}
        </Card>

        <Card className="self-start">
          <SectionLabel count={data.consents.length}>
            {t("adminUser.consents")}
          </SectionLabel>
          <DataList divided>
            {data.consents.map((consent) => (
              <DataRow
                key={consent.type + consent.version}
                /* The stored code, as stored: an administrator reading a
                   consent log wants the value in the database, and only
                   three of the seven types have a translation at all. */
                title={consent.type}
                meta={`v${consent.version}`}
                value={
                  consent.granted ? (
                    <Badge tone="success">{t("common.yes")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("common.no")}</Badge>
                  )
                }
                valueMeta={formatDate(consent.granted_at, language)}
              />
            ))}
          </DataList>
        </Card>

        <Card className="self-start">
          <SectionLabel count={data.devices.length}>
            {t("adminUser.devices")}
          </SectionLabel>
          <DataList>
            {data.devices.map((device, index) => (
              <DataRow
                key={`${device.browser}-${index}`}
                title={`${device.browser} · ${device.system}`}
                meta={device.last_ip ?? undefined}
                value={formatDate(device.last_seen_at, language)}
              />
            ))}
          </DataList>
        </Card>

        <Card className="self-start">
          <SectionLabel count={data.recent_activity.length}>
            {t("adminUser.activity")}
          </SectionLabel>
          <DataList>
            {data.recent_activity.map((entry, index) => (
              <DataRow
                key={`${entry.action}-${index}`}
                title={entry.object_repr || entry.object_type || entry.action}
                meta={`${entry.action}${entry.ip ? ` · ${entry.ip}` : ""}`}
                value={formatDate(entry.created_at, language)}
              />
            ))}
          </DataList>
        </Card>
      </div>
    </div>
  );
}
