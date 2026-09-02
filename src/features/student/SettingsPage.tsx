import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/shared/ui/PageHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";
import { useApiError } from "@/shared/hooks/useApiError";
import { SUPPORTED_LANGUAGES } from "@/shared/i18n";
import { Badge, Button, Card, CardHeader, Input } from "@/shared/ui";

const REQUIRED_CONSENTS = new Set(["TERMS", "PRIVACY", "DATA_PROCESSING"]);

interface Consent {
  id: string;
  type: string;
  version: string;
  granted: boolean;
  is_active: boolean;
}

const CONSENT_LABEL: Record<string, string> = {
  TERMS: "auth.consentTerms",
  PRIVACY: "auth.consentPrivacy",
  DATA_PROCESSING: "auth.consentData",
  AI_PROCESSING: "auth.consentAi",
  TALENT_SEARCH: "auth.consentTalent",
  INCOME_TRACKING: "settings.consents",
  MARKETING: "settings.notifications",
};

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const consents = useQuery({
    queryKey: ["consents"],
    queryFn: async () => {
      const { data } = await api.get<Consent[]>("/auth/consents/");
      return data;
    },
  });

  const toggleConsent = useMutation({
    mutationFn: async ({ type, granted }: { type: string; granted: boolean }) => {
      await api.post("/auth/consents/", { type, granted });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["consents"] });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const changeLanguage = useMutation({
    mutationFn: async (code: string) => {
      await i18n.changeLanguage(code);
      const { data } = await api.patch("/auth/me/", { preferred_language: code });
      return data;
    },
    onSuccess: (data) => {
      if (user) setUser({ ...user, ...data });
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      await api.post("/auth/password/change/", {
        current_password: currentPassword,
        new_password: newPassword,
      });
    },
    onSuccess: async () => {
      setNotice(t("settings.passwordChanged"));
      setError("");
      // Changing the password blacklists every session, including this one.
      await logout();
      navigate("/auth/login", { replace: true });
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const active = new Set(
    (consents.data ?? []).filter((consent) => consent.is_active).map((c) => c.type),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("settings.title")}
      />

      <Card>
        <CardHeader title={t("settings.account")} />
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-500">
              {t("auth.email")}
            </dt>
            <dd className="text-sm text-ink-800">
              {user?.email}{" "}
              {user?.email_verified ? (
                <Badge tone="success">✓</Badge>
              ) : (
                <Badge tone="warning">!</Badge>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-500">
              {t("auth.iAmA")}
            </dt>
            <dd className="text-sm text-ink-800">
              {t(`role.${user?.role}`, { defaultValue: user?.role })}
            </dd>
          </div>
        </dl>

        {user?.requires_guardian_approval && (
          <p className="mt-4 rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
            {t("auth.guardianNotice")}
          </p>
        )}
      </Card>

      <Card>
        <CardHeader title={t("settings.language")} />
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_LANGUAGES.map((language) => (
            <Button
              key={language.code}
              variant={
                i18n.resolvedLanguage === language.code ? "primary" : "secondary"
              }
              onClick={() => changeLanguage.mutate(language.code)}
            >
              {language.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={t("settings.consents")} subtitle={t("settings.consentsHint")} />
        <div className="flex flex-col gap-2">
          {Object.keys(CONSENT_LABEL).map((type) => {
            const required = REQUIRED_CONSENTS.has(type);
            return (
              <label
                key={type}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 px-3 py-2.5"
              >
                <span className="text-sm text-ink-700">
                  {t(CONSENT_LABEL[type])}
                  {required && <span className="ml-1 text-danger">*</span>}
                </span>
                <input
                  type="checkbox"
                  checked={active.has(type)}
                  disabled={required}
                  onChange={(event) =>
                    toggleConsent.mutate({ type, granted: event.target.checked })
                  }
                />
              </label>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title={t("settings.password")} />
        <div className="flex max-w-md flex-col gap-4">
          <Input
            id="current-password"
            type="password"
            label={t("auth.currentPassword")}
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <Input
            id="new-password"
            type="password"
            label={t("auth.newPassword")}
            hint={t("auth.passwordHint")}
            autoComplete="new-password"
            minLength={10}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <Button
            onClick={() => changePassword.mutate()}
            loading={changePassword.isPending}
            disabled={!currentPassword || newPassword.length < 10}
          >
            {t("settings.changePassword")}
          </Button>
        </div>
      </Card>

      {error && (
        <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
          {notice}
        </div>
      )}
    </div>
  );
}
