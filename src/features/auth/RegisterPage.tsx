import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { HOME_BY_ROLE, useAuth, type RegisterPayload } from "@/shared/auth/AuthContext";
import { useApiError } from "@/shared/hooks/useApiError";
import { Button, Input } from "@/shared/ui";
import type { Language } from "@/shared/types/api";

type SelfRole = "STUDENT" | "EMPLOYER" | "MENTOR";

const REQUIRED_CONSENTS = ["TERMS", "PRIVACY", "DATA_PROCESSING"] as const;
const OPTIONAL_CONSENTS = ["AI_PROCESSING", "TALENT_SEARCH"] as const;

const CONSENT_LABEL: Record<string, string> = {
  TERMS: "auth.consentTerms",
  PRIVACY: "auth.consentPrivacy",
  DATA_PROCESSING: "auth.consentData",
  AI_PROCESSING: "auth.consentAi",
  TALENT_SEARCH: "auth.consentTalent",
};

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const describeError = useApiError();

  const [role, setRole] = useState<SelfRole>("STUDENT");
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    birth_date: "",
    company_name: "",
    headline: "",
  });
  const [consents, setConsents] = useState<string[]>([...REQUIRED_CONSENTS]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof form) => (value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const toggleConsent = (consent: string) =>
    setConsents((previous) =>
      previous.includes(consent)
        ? previous.filter((item) => item !== consent)
        : [...previous, consent],
    );

  const missingRequired = REQUIRED_CONSENTS.some(
    (consent) => !consents.includes(consent),
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (missingRequired) {
      setError(t("auth.consentRequired"));
      return;
    }

    const payload: RegisterPayload = {
      email: form.email.trim(),
      password: form.password,
      role,
      preferred_language: (i18n.resolvedLanguage ?? "uz") as Language,
      consents,
    };
    if (role === "STUDENT") {
      payload.first_name = form.first_name;
      payload.last_name = form.last_name;
      payload.birth_date = form.birth_date;
    }
    if (role === "EMPLOYER") {
      payload.company_name = form.company_name;
      payload.legal_name = form.company_name;
    }
    if (role === "MENTOR") {
      payload.first_name = form.first_name;
      payload.last_name = form.last_name;
      payload.headline = form.headline;
    }

    setBusy(true);
    try {
      const user = await register(payload);
      // A brand new learner goes to the intake interview, not to an empty
      // dashboard — the old form wizard was skippable, which is how accounts
      // ended up on a dashboard with zero skills and nothing to do.
      navigate(role === "STUDENT" ? "/intake" : HOME_BY_ROLE[user.role], {
        replace: true,
      });
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  const roleOptions: { value: SelfRole; label: string; hint: string }[] = [
    { value: "STUDENT", label: t("auth.roleStudent"), hint: t("auth.roleStudentHint") },
    { value: "EMPLOYER", label: t("auth.roleEmployer"), hint: t("auth.roleEmployerHint") },
    { value: "MENTOR", label: t("auth.roleMentor"), hint: t("auth.roleMentorHint") },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">
        {t("auth.registerTitle")}
      </h1>
      <p className="mt-1 text-sm text-ink-500">{t("auth.registerSubtitle")}</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink-700">
            {t("auth.iAmA")}
          </legend>
          <div className="flex flex-col gap-2">
            {roleOptions.map((option) => (
              <label
                key={option.value}
                className={
                  role === option.value
                    ? "flex cursor-pointer gap-3 rounded-xl border-2 border-brand-500 bg-brand-50 p-3"
                    : "flex cursor-pointer gap-3 rounded-xl border border-ink-300 p-3 hover:border-ink-400"
                }
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                  className="mt-1"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-800">
                    {option.label}
                  </span>
                  <span className="block text-xs text-ink-500">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Input
          id="email"
          type="email"
          label={t("auth.email")}
          autoComplete="email"
          required
          value={form.email}
          onChange={(event) => update("email")(event.target.value)}
        />
        <Input
          id="password"
          type="password"
          label={t("auth.password")}
          hint={t("auth.passwordHint")}
          autoComplete="new-password"
          minLength={10}
          required
          value={form.password}
          onChange={(event) => update("password")(event.target.value)}
        />

        {(role === "STUDENT" || role === "MENTOR") && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="first_name"
              label={t("auth.firstName")}
              required
              value={form.first_name}
              onChange={(event) => update("first_name")(event.target.value)}
            />
            <Input
              id="last_name"
              label={t("auth.lastName")}
              required
              value={form.last_name}
              onChange={(event) => update("last_name")(event.target.value)}
            />
          </div>
        )}

        {role === "STUDENT" && (
          <Input
            id="birth_date"
            type="date"
            label={t("auth.birthDate")}
            required
            value={form.birth_date}
            onChange={(event) => update("birth_date")(event.target.value)}
          />
        )}

        {role === "EMPLOYER" && (
          <Input
            id="company_name"
            label={t("auth.companyName")}
            required
            value={form.company_name}
            onChange={(event) => update("company_name")(event.target.value)}
          />
        )}

        {role === "MENTOR" && (
          <Input
            id="headline"
            label={t("auth.headline")}
            value={form.headline}
            onChange={(event) => update("headline")(event.target.value)}
          />
        )}

        <fieldset className="rounded-xl border border-ink-200 p-3">
          <legend className="px-1 text-sm font-medium text-ink-700">
            {t("auth.consents")}
          </legend>
          <div className="flex flex-col gap-2">
            {[...REQUIRED_CONSENTS, ...OPTIONAL_CONSENTS].map((consent) => {
              const required = (REQUIRED_CONSENTS as readonly string[]).includes(
                consent,
              );
              return (
                <label key={consent} className="flex items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={consents.includes(consent)}
                    onChange={() => toggleConsent(consent)}
                  />
                  <span className="text-ink-700">
                    {t(CONSENT_LABEL[consent])}
                    {required && <span className="ml-1 text-danger">*</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        )}

        <Button type="submit" loading={busy} fullWidth size="lg">
          {t("auth.register")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        {t("auth.haveAccount")}{" "}
        <Link to="/auth/login" className="font-medium text-brand-600 hover:text-brand-700">
          {t("auth.login")}
        </Link>
      </p>
    </div>
  );
}
