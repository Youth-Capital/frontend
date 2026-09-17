import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { HOME_BY_ROLE, useAuth } from "@/shared/auth/AuthContext";
import { useApiError } from "@/shared/hooks/useApiError";
import { Button, Input } from "@/shared/ui";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const describeError = useApiError();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      navigate(HOME_BY_ROLE[user.role], { replace: true });
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">{t("auth.loginTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">{t("auth.loginSubtitle")}</p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        <Input
          id="email"
          type="email"
          label={t("auth.email")}
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          id="password"
          type="password"
          label={t("auth.password")}
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger"
          >
            {error}
          </div>
        )}

        <Button type="submit" loading={busy} fullWidth size="lg">
          {t("auth.login")}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link
          to="/auth/reset-password"
          className="-my-3 inline-block py-3 text-brand-600 hover:text-brand-700"
        >
          {t("auth.forgotPassword")}
        </Link>
        <span className="text-ink-500">
          {t("auth.noAccount")}{" "}
          <Link to="/auth/register" className="font-medium text-brand-600 hover:text-brand-700">
            {t("auth.register")}
          </Link>
        </span>
      </div>
    </div>
  );
}
