import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { Button, Input } from "@/shared/ui";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const describeError = useApiError();

  const token = params.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const requestReset = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/password/reset/", { email: email.trim() });
      setSent(true);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/password/reset/confirm/", {
        token,
        new_password: password,
      });
      navigate("/auth/login", { replace: true });
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">{t("auth.resetTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {token ? t("auth.passwordHint") : t("auth.resetSubtitle")}
      </p>

      {token ? (
        <form onSubmit={confirmReset} className="mt-8 flex flex-col gap-4">
          <Input
            id="new-password"
            type="password"
            label={t("auth.newPassword")}
            autoComplete="new-password"
            minLength={10}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && (
            <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Button type="submit" loading={busy} fullWidth size="lg">
            {t("common.save")}
          </Button>
        </form>
      ) : sent ? (
        <div className="mt-8 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          {t("auth.resetSent")}
        </div>
      ) : (
        <form onSubmit={requestReset} className="mt-8 flex flex-col gap-4">
          <Input
            id="reset-email"
            type="email"
            label={t("auth.email")}
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {error && (
            <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}
          <Button type="submit" loading={busy} fullWidth size="lg">
            {t("common.submit")}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm">
        <Link to="/auth/login" className="-my-3 inline-block py-3 text-brand-600 hover:text-brand-700">
          {t("common.back")}
        </Link>
      </p>
    </div>
  );
}
