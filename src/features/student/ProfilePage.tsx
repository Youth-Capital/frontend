import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";
import { useApiError } from "@/shared/hooks/useApiError";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  Input,
  ProgressBar,
  Select,
} from "@/shared/ui";
import { PageHeader } from "@/shared/ui/PageHeader";
import type {
  Paginated,
  Profession,
  StudentDashboard,
  StudentProfile,
  Subscription,
} from "@/shared/types/api";

/** The server's own rule (apps/accounts/models.py `phone_validator`). */
const PHONE_PATTERN = /^\+?[0-9]{9,15}$/;

/**
 * A learner's own page: who they are, what they pay for, where they are headed
 * and how far they have come.
 *
 * It replaced four entries in the account menu — skills, knowledge, experience,
 * CV — that each opened a separate screen and none of which showed the thing a
 * person most often opens a profile to check: their own name, phone and plan.
 * The four are still here, as the last section, beside the progress they add
 * up to.
 *
 * No sidebar (see FocusLayout). Somebody reading about themselves is not on
 * the way to a task, and the way back is the mark in the header.
 *
 * Every figure on the page is read from an endpoint the rest of the product
 * already uses — the dashboard for progress, billing for the plan — so the
 * profile cannot disagree with the screens those numbers come from.
 */
export default function ProfilePage() {
  const { t } = useTranslation();

  const profile = useQuery({
    queryKey: ["me", "profile"],
    queryFn: async () => {
      const { data } = await api.get<StudentProfile>("/me/profile/");
      return data;
    },
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

      {profile.isLoading ? (
        <CardSkeleton rows={5} />
      ) : profile.data ? (
        <>
          <PersonalCard profile={profile.data} />
          <div className="grid gap-6 md:grid-cols-2">
            <SubscriptionCard />
            <ProfessionCard profile={profile.data} />
          </div>
          <ProgressCard />
          <RecordCard />
        </>
      ) : (
        <p role="alert" className="text-sm text-danger">
          {t("profile.loadFailed")}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ personal data */

function PersonalCard({ profile }: { profile: StudentProfile }) {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [form, setForm] = useState({
    last_name: profile.last_name,
    first_name: profile.first_name,
    middle_name: profile.middle_name,
    phone: user?.phone ?? "",
  });
  const [phoneError, setPhoneError] = useState("");
  const [saved, setSaved] = useState(false);

  // A saved form that then gets edited is no longer "saved".
  useEffect(() => setSaved(false), [form]);

  const save = useMutation({
    mutationFn: async () => {
      await api.patch("/me/profile/", {
        last_name: form.last_name.trim(),
        first_name: form.first_name.trim(),
        middle_name: form.middle_name.trim(),
      });

      const phone = form.phone.trim();
      if (phone !== (user?.phone ?? "")) {
        //: Blank is sent as null, not "". The column is unique, and two
        //: accounts that both cleared their number would otherwise collide on
        //: the empty string.
        await api.patch("/auth/me/", { phone: phone || null });
      }
    },
    onSuccess: async () => {
      setSaved(true);
      // The header shows the name; the dashboard greets by it.
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const phone = form.phone.trim();
    //: Checked here only so the message arrives before the round trip; the
    //: server applies the same rule and is the one that decides.
    if (phone && !PHONE_PATTERN.test(phone)) {
      setPhoneError(t("profile.phoneInvalid"));
      return;
    }
    setPhoneError("");
    save.mutate();
  }

  return (
    <Card>
      <CardHeader title={t("profile.personal")} subtitle={t("profile.personalHint")} />

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            id="profile-last-name"
            label={t("profile.lastName")}
            autoComplete="family-name"
            value={form.last_name}
            onChange={(event) => setForm({ ...form, last_name: event.target.value })}
          />
          <Input
            id="profile-first-name"
            label={t("profile.firstName")}
            autoComplete="given-name"
            value={form.first_name}
            onChange={(event) => setForm({ ...form, first_name: event.target.value })}
          />
          <Input
            id="profile-middle-name"
            label={t("profile.middleName")}
            hint={t("profile.optional")}
            autoComplete="additional-name"
            value={form.middle_name}
            onChange={(event) => setForm({ ...form, middle_name: event.target.value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="profile-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            label={t("profile.phone")}
            hint={t("profile.phoneHint")}
            error={phoneError}
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />

          {/* Read-only on purpose. The address is what the account signs in
              with; changing it here, without proving the new one belongs to
              the same person, would be a way to take an account over. */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-700">{t("auth.email")}</span>
            <p className="flex items-center gap-2 rounded-(--radius-control) border border-dashed border-ink-300 px-3 py-2 text-sm text-ink-800">
              <span className="min-w-0 truncate">{user?.email}</span>
              {user?.email_verified ? (
                <Badge tone="success">{t("profile.verified")}</Badge>
              ) : (
                <Badge tone="warning">{t("profile.notVerified")}</Badge>
              )}
            </p>
            <p className="text-xs text-ink-500">{t("profile.emailHint")}</p>
          </div>
        </div>

        {save.isError && (
          <p role="alert" className="text-sm text-danger">
            {describeError(save.error)}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span aria-live="polite" className="text-sm text-success">
              {t("profile.saved")}
            </span>
          )}
          <Button type="submit" loading={save.isPending}>
            {t("profile.save")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------- subscription */

function SubscriptionCard() {
  const { t, i18n } = useTranslation();

  const subscription = useQuery({
    // Shared with the billing page, so upgrading there shows here at once.
    queryKey: ["billing", "subscription"],
    queryFn: async () => {
      const { data } = await api.get<Subscription>("/billing/subscription/");
      return data;
    },
  });

  const plan = subscription.data?.plan;
  const renews = subscription.data?.renews_on;

  return (
    <Card>
      <CardHeader title={t("profile.subscription")} />

      {subscription.isLoading ? (
        <CardSkeleton rows={2} />
      ) : plan ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold text-ink-900">{plan.name}</span>
            {/* The one thing people open this card to learn, so it is a word
                and not only a colour. */}
            <Badge tone={plan.is_free ? "neutral" : "brand"}>
              {plan.is_free ? t("profile.planFree") : t("profile.planPremium")}
            </Badge>
          </div>
          {!plan.is_free && renews && (
            <p className="text-sm text-ink-500">
              {t("profile.renews", {
                date: new Date(renews).toLocaleDateString(i18n.language),
              })}
            </p>
          )}
          <Link
            to="/student/billing"
            className="-my-3 inline-block py-3 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            {plan.is_free ? t("profile.upgrade") : t("profile.managePlan")}
          </Link>
        </div>
      ) : (
        <p className="text-sm text-ink-500">{t("profile.subscriptionUnavailable")}</p>
      )}
    </Card>
  );
}

/* --------------------------------------------------------------- profession */

function ProfessionCard({ profile }: { profile: StudentProfile }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const describeError = useApiError();
  const [value, setValue] = useState(profile.target_profession ?? "");

  const professions = useQuery({
    queryKey: ["professions"],
    queryFn: async () => {
      const { data } = await api.get<Paginated<Profession>>(
        "/taxonomy/professions/?page_size=100",
      );
      return data.results;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      await api.patch("/me/profile/", { target_profession: value || null });
    },
    onSuccess: () => {
      // The whole career side of the product is computed from this one field.
      void queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["career-path"] });
    },
  });

  const unchanged = value === (profile.target_profession ?? "");

  return (
    <Card>
      <CardHeader title={t("profile.profession")} subtitle={t("profile.professionHint")} />

      <div className="flex flex-col gap-3">
        <Select
          id="profile-profession"
          label={t("profile.profession")}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        >
          <option value="">{t("common.notSpecified")}</option>
          {professions.data?.map((profession) => (
            <option key={profession.id} value={profession.id}>
              {profession.name}
            </option>
          ))}
        </Select>

        {save.isError && (
          <p role="alert" className="text-sm text-danger">
            {describeError(save.error)}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/student/career"
            className="-my-3 inline-block py-3 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            {t("profile.openCareer")}
          </Link>
          <Button
            variant="secondary"
            onClick={() => save.mutate()}
            loading={save.isPending}
            disabled={unchanged}
          >
            {save.isSuccess && unchanged ? t("profile.saved") : t("profile.changeProfession")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------------- progress */

function ProgressCard() {
  const { t } = useTranslation();

  const dashboard = useQuery({
    queryKey: ["student", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get<StudentDashboard>("/me/dashboard/");
      return data;
    },
  });

  const data = dashboard.data;

  return (
    <Card>
      <CardHeader title={t("profile.progress")} subtitle={t("profile.progressHint")} />

      {dashboard.isLoading || !data ? (
        <CardSkeleton rows={4} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <Meter
            label={t("profile.profileCompletion")}
            value={data.stats.profile_completion}
          />

          <Meter
            label={t("profile.skillsVerified")}
            value={
              data.stats.skills_total
                ? Math.round((data.stats.skills_verified / data.stats.skills_total) * 100)
                : 0
            }
            detail={t("profile.ofTotal", {
              done: data.stats.skills_verified,
              total: data.stats.skills_total,
            })}
          />

          {data.plan ? (
            <Meter
              label={t("profile.planProgress")}
              value={data.plan.progress}
              detail={t("dashboard.daysLeft", { count: data.plan.days_remaining })}
            />
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm text-ink-700">{t("profile.planProgress")}</span>
              <Link
                to="/student/plan"
                className="-my-3 inline-block py-3 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
              >
                {t("profile.createPlan")}
              </Link>
            </div>
          )}

          {/* Capital is shown with how many axes it is built from. An index
              read off four of nine axes and one read off nine are not the
              same number, and the page should not let them look alike. */}
          <Meter
            label={t("profile.capital")}
            value={data.capital.overall}
            detail={t("profile.axes", {
              measured: data.capital.measured_axes,
              total: data.capital.total_axes,
            })}
          />

          <Meter
            label={t("profile.knowledge")}
            value={Math.round(data.knowledge.average_score)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Figure
              value={`${data.stats.courses_completed}/${data.stats.courses_enrolled}`}
              label={t("profile.coursesCompleted")}
            />
            <Figure value={String(data.stats.tests_passed)} label={t("profile.testsPassed")} />
          </div>
        </div>
      )}
    </Card>
  );
}

function Meter({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-ink-700">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-ink-900">{value}%</span>
      </div>
      <ProgressBar value={value} label={label} />
      {detail && <span className="text-xs text-ink-500">{detail}</span>}
    </div>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xl font-semibold tabular-nums text-ink-900">{value}</span>
      <span className="text-xs text-ink-500">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------- record */

const RECORD = [
  { to: "/student/skills", labelKey: "nav.skills", hintKey: "profile.recordSkills" },
  { to: "/student/knowledge", labelKey: "nav.knowledge", hintKey: "profile.recordKnowledge" },
  { to: "/student/experience", labelKey: "nav.experience", hintKey: "profile.recordExperience" },
  { to: "/student/cv", labelKey: "nav.cv", hintKey: "profile.recordCv" },
];

function RecordCard() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader title={t("profile.record")} subtitle={t("profile.recordHint")} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {RECORD.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className="flex h-full flex-col gap-1 rounded-(--radius-control) border border-ink-200 px-4 py-3 transition-colors hover:border-ink-300 hover:bg-ink-100"
            >
              <span className="text-sm font-semibold text-ink-900">{t(item.labelKey)}</span>
              <span className="text-xs text-ink-500">{t(item.hintKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
