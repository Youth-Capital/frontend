import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { Button, Input } from "@/shared/ui";

/**
 * Where the platform's first administrator is made.
 *
 * Reachable without a session, because the account that could authorise it is
 * the one being created. The authority is the token in the address, which
 * exists only in the server's environment — so the page is useless to anybody
 * who has not been given the link, and useless to everybody once an
 * administrator exists, which the server enforces rather than this form.
 *
 * The password never leaves this form except to the endpoint: it is not put
 * in the URL, not kept in state after the request, and the server writes
 * neither it nor the token into the audit entry it makes.
 *
 * It ends at the sign-in page rather than signing the new admin in. Creating
 * the account and entering it are separate acts, and the second one should go
 * through the ordinary door with its lockout and its new-device notice.
 */
export default function AdminSetupPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const describeError = useApiError();

  const token = params.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const mismatch = repeat.length > 0 && password !== repeat;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mismatch) return;
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/admin-setup/", {
        token,
        email: email.trim(),
        password,
      });
      setPassword("");
      setRepeat("");
      navigate("/auth/login", { replace: true });
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink-900">
          {t("adminSetup.title")}
        </h1>
        <p className="text-sm text-ink-600">{t("adminSetup.noToken")}</p>
        <Link to="/auth/login" className="text-sm font-medium text-brand-700 hover:underline">
          {t("auth.login")}
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold text-ink-900">
          {t("adminSetup.title")}
        </h1>
        <p className="text-sm text-ink-600">{t("adminSetup.subtitle")}</p>
      </div>

      <Input
        id="admin-email"
        type="email"
        autoComplete="email"
        required
        label={t("auth.email")}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Input
        id="admin-password"
        type="password"
        autoComplete="new-password"
        required
        label={t("auth.password")}
        hint={t("adminSetup.passwordHint")}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Input
        id="admin-password-repeat"
        type="password"
        autoComplete="new-password"
        required
        label={t("adminSetup.repeat")}
        error={mismatch ? t("adminSetup.mismatch") : undefined}
        value={repeat}
        onChange={(event) => setRepeat(event.target.value)}
      />

      {error && (
        <p role="alert" className="rounded-(--radius-control) bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button
        type="submit"
        loading={busy}
        disabled={!email || password.length < 10 || mismatch}
      >
        {t("adminSetup.submit")}
      </Button>
    </form>
  );
}
