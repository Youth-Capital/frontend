import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";

import { api, toApiError } from "@/shared/api/client";
import { homeForUser, useAuth } from "@/shared/auth/AuthContext";
import { useApiError } from "@/shared/hooks/useApiError";
import type { User } from "@/shared/types/api";
import { Button, Input } from "@/shared/ui";

interface VerificationState {
  email_verified: boolean;
  code_sent: boolean;
  expires_in: number;
  resend_after: number;
  attempts_remaining: number;
}

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const { user, setUser, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const describeError = useApiError();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [retryUntil, setRetryUntil] = useState(0);
  const queryKey = ["email-verification", user?.id];
  const status = useQuery({
    queryKey,
    queryFn: async () => (await api.get<VerificationState>("/auth/email/verification/")).data,
    enabled: Boolean(user && !user.email_verified),
    retry: false,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Another tab may have completed verification. Restore the authoritative user
  // rather than leaving this tab trapped behind a stale local flag.
  useEffect(() => {
    if (status.data?.email_verified) void refreshUser();
  }, [status.data?.email_verified, refreshUser]);

  const elapsed = Math.max(0, Math.floor((clock - status.dataUpdatedAt) / 1000));
  const resendAfter = Math.max(
    0, (status.data?.resend_after ?? 0) - elapsed, Math.ceil((retryUntil - clock) / 1000),
  );
  const expiresIn = Math.max(0, (status.data?.expires_in ?? 0) - elapsed);

  if (!user) return <Navigate to="/auth/login" replace />;
  if (user.email_verified) return <Navigate to={homeForUser(user)} replace />;

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!/^[0-9]{6}$/.test(code)) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<User>("/auth/email/verify/", { code });
      queryClient.removeQueries({ queryKey });
      setUser(data);
      navigate(homeForUser(data), { replace: true });
    } catch (caught) {
      setError(describeError(caught));
      void status.refetch();
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setSending(true);
    setError("");
    try {
      const { data } = await api.post<VerificationState>("/auth/email/resend/", {});
      queryClient.setQueryData(queryKey, data);
      setClock(Date.now());
      setCode("");
    } catch (caught) {
      const payload = toApiError(caught);
      const wait = Number(payload.details?.retry_after ?? 0);
      if (Number.isFinite(wait) && wait > 0) setRetryUntil(Date.now() + wait * 1000);
      setError(describeError(caught));
      void status.refetch();
    } finally {
      setSending(false);
    }
  };

  const leave = async () => {
    await logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">{t("auth.verifyTitle")}</h1>
      <p className="mt-2 text-sm text-ink-600">{t("auth.verifySubtitle", { email: user.email })}</p>
      <p className="mt-3 text-sm text-ink-600" role="status">
        {status.isLoading ? t("common.loading") :
          status.data?.code_sent ? t("auth.verifySent") : t("auth.verifySendNotice")}
      </p>

      <form onSubmit={verify} className="mt-6 flex flex-col gap-4">
        <Input
          id="verification-code"
          label={t("auth.verifyCode")}
          hint={t("auth.verifyCodeHint")}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))}
          className="text-center text-2xl tracking-[0.4em] tabular-nums"
          required
        />
        {expiresIn > 0 && (
          <p className="text-xs text-ink-500">
            {t("auth.verifyExpires", { time: `${Math.floor(expiresIn / 60)}:${String(expiresIn % 60).padStart(2, "0")}` })}
          </p>
        )}
        {(error || status.isError) && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {error || describeError(status.error)}
          </p>
        )}
        <Button type="submit" fullWidth loading={busy} disabled={!/^[0-9]{6}$/.test(code) || sending}>
          {t("auth.verifySubmit")}
        </Button>
      </form>

      <div className="mt-4 flex flex-col gap-3">
        <Button
          variant="secondary"
          onClick={() => void resend()}
          loading={sending}
          disabled={busy || status.isLoading || resendAfter > 0}
        >
          {resendAfter > 0 ? t("auth.verifyResendWait", { seconds: resendAfter }) : t("auth.verifyResend")}
        </Button>
        {status.isError && <Button variant="secondary" onClick={() => void status.refetch()}>{t("common.retry")}</Button>}
        <p className="text-xs text-ink-500">{t("auth.verifySpamHint")}</p>
        <Button variant="ghost" onClick={() => void leave()} disabled={busy || sending}>
          {t("auth.verifyDifferentAccount")}
        </Button>
      </div>
    </div>
  );
}
