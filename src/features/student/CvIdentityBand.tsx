import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";
import type { StudentDashboard, StudentProfileStub } from "@/shared/types/api";

import "@/shared/styles/deep.css";

/**
 * Who this CV belongs to, and what of it is actually proven.
 *
 * The badge is earned, not printed. It appears only when the account holds
 * evidence somebody else produced — a passed test or a verified skill — so it
 * means the same thing every time an employer sees it. A "verified" label
 * granted to everyone would devalue the one thing this product sells.
 */
export function CvIdentityBand() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Already fetched and cached by the dashboard; this reuses it rather than
  // asking the server for the same counts a second time.
  const dashboard = useQuery({
    queryKey: ["student", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get<StudentDashboard>("/me/dashboard/");
      return data;
    },
  });

  const profile = user?.profile as StudentProfileStub | null;
  const stats = dashboard.data?.stats;
  const proven = (stats?.skills_verified ?? 0) + (stats?.tests_passed ?? 0);
  const initial = (user?.display_name ?? "?").charAt(0).toUpperCase();

  return (
    <section className="deep rounded-(--radius-card) p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {profile?.avatar ? (
          <img
            src={profile.avatar}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover"
            style={{ outline: "2px solid var(--band-accent)", outlineOffset: "2px" }}
          />
        ) : (
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-semibold"
            style={{
              background: "color-mix(in oklab, var(--band-dim) 32%, transparent)",
              outline: "2px solid var(--band-accent)",
              outlineOffset: "2px",
            }}
          >
            {initial}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold leading-tight">
              {user?.display_name}
            </h1>
            {proven > 0 && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: "var(--band-accent)", color: "var(--band-on-accent)" }}
              >
                <CheckGlyph />
                {t("cv.verifiedProfile")}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--band-muted)" }}>
            {dashboard.data?.target_profession?.name ?? t("dashboard.noTarget")}
          </p>
        </div>

        <dl className="flex shrink-0 gap-6">
          <Figure
            label={t("cv.provenSkills")}
            value={stats?.skills_verified ?? 0}
          />
          <Figure label={t("cv.passedTests")} value={stats?.tests_passed ?? 0} />
          {profile?.youth_id && (
            <div>
              <dt
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--band-dim)" }}
              >
                Youth ID
              </dt>
              <dd className="mt-1 font-mono text-xs" style={{ color: "var(--band-muted)" }}>
                {profile.youth_id}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--band-dim)" }}
      >
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function CheckGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
