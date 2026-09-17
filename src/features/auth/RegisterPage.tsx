import { useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { HOME_BY_ROLE, useAuth, type RegisterPayload } from "@/shared/auth/AuthContext";
import { useApiError } from "@/shared/hooks/useApiError";
import { Button, Input } from "@/shared/ui";
import type { Language } from "@/shared/types/api";

type SelfRole = "STUDENT" | "EMPLOYER";

/** The server refuses to create an account without all three (accounts.REQUIRED_CONSENTS). */
const REQUIRED_CONSENTS = ["TERMS", "PRIVACY", "DATA_PROCESSING"] as const;
const OPTIONAL_CONSENTS = ["AI_PROCESSING", "TALENT_SEARCH"] as const;

const OPTIONAL_LABEL: Record<string, string> = {
  AI_PROCESSING: "auth.consentAi",
  TALENT_SEARCH: "auth.consentTalent",
};

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const describeError = useApiError();
  const noticeId = useId();
  const blockedId = useId();

  const [role, setRole] = useState<SelfRole>("STUDENT");
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    birth_date: "",
    company_name: "",
  });
  /*
   * Nothing is ticked to begin with.
   *
   * The three required consents used to start already checked. A box somebody
   * never touched is not an agreement they gave — it is one the form gave on
   * their behalf — and consent to having personal data processed is exactly
   * the thing that has to be an action the person takes.
   */
  const [consents, setConsents] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof form) => (value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const agreed = REQUIRED_CONSENTS.every((consent) => consents.includes(consent));

  /*
   * One box for the three required consents.
   *
   * Terms, privacy policy and data processing are all conditions of having an
   * account at all — refusing any one of them means not registering — so three
   * separate boxes offered three choices that were really one. They are still
   * sent, and recorded, as three consents. The optional ones are genuine
   * choices and stay separate, because bundling a real choice into a required
   * box would take the choice away.
   */
  const toggleRequired = () =>
    setConsents((previous) =>
      agreed
        ? previous.filter((item) => !(REQUIRED_CONSENTS as readonly string[]).includes(item))
        : [...new Set([...previous, ...REQUIRED_CONSENTS])],
    );

  const toggleOptional = (consent: string) =>
    setConsents((previous) =>
      previous.includes(consent)
        ? previous.filter((item) => item !== consent)
        : [...previous, consent],
    );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    // The button is disabled until this is true; the check stays for the Enter
    // key, and the server makes the same one regardless.
    if (!agreed) {
      setError(t("auth.consentToContinue"));
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

        {role === "STUDENT" && (
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

        {/* What the person is agreeing to, said before the box they tick —
            not only in a policy they would have to go and find. */}
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
          <p id={noticeId} className="text-sm leading-relaxed text-ink-700">
            {t("auth.consentNotice")}
          </p>

          <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0"
              checked={agreed}
              onChange={toggleRequired}
              aria-describedby={noticeId}
              required
            />
            <span className="font-medium text-ink-900">{t("auth.consentAgree")}</span>
          </label>
        </div>

        <fieldset className="rounded-xl border border-ink-200 p-3">
          <legend className="px-1 text-sm font-medium text-ink-700">
            {t("auth.consentOptional")}
          </legend>
          <div className="flex flex-col gap-2">
            {OPTIONAL_CONSENTS.map((consent) => (
              <label key={consent} className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  checked={consents.includes(consent)}
                  onChange={() => toggleOptional(consent)}
                />
                <span className="text-ink-700">{t(OPTIONAL_LABEL[consent])}</span>
              </label>
            ))}
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

        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            loading={busy}
            fullWidth
            size="lg"
            disabled={!agreed}
            aria-describedby={agreed ? undefined : blockedId}
          >
            {t("auth.register")}
          </Button>
          {/* A disabled button on its own does not say why. */}
          {!agreed && (
            <p id={blockedId} aria-live="polite" className="text-center text-xs text-ink-500">
              {t("auth.consentToContinue")}
            </p>
          )}
        </div>
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
