import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api, toApiError } from "@/shared/api/client";
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
export function CvIdentityBand({ editable = false }: { editable?: boolean } = {}) {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [uploadError, setUploadError] = useState<string | null>(null);

  /**
   * Changing the picture.
   *
   * The control is a real file input with a label over the avatar rather than
   * a button that clicks a hidden input: the native control is the one a
   * keyboard reaches and a screen reader announces, and it brings its own
   * "no file chosen" semantics for free.
   *
   * The server owns the rules — JPEG, PNG or WebP, 5 MB, and a megapixel
   * ceiling so a 20000x20000 PNG cannot decode into a gigabyte of memory. Its
   * refusal is shown as it comes back rather than second-guessed here, because
   * a check written twice is a check that will disagree with itself.
   */
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("avatar", file);
      await api.patch("/me/profile/", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: async () => {
      setUploadError(null);
      // The band reads the avatar off the signed-in user, and the dashboard
      // holds the counts beside it; both are stale the moment this lands.
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: ["student", "dashboard"] });
    },
    onError: (error) => {
      // The server's own words when it has them — "only JPEG, PNG and WebP"
      // is more use than "upload failed", and it arrives already translated.
      const detail = toApiError(error).details?.avatar;
      const said = Array.isArray(detail) ? String(detail[0]) : null;
      setUploadError(said ?? t("profile.avatarFailed"));
    },
  });

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

  const portrait = profile?.avatar ? (
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
  );

  return (
    <section className="deep rounded-(--radius-card) p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {editable ? (
          <div className="shrink-0">
            <label
              className="group/avatar relative block h-16 w-16 cursor-pointer rounded-full focus-within:outline-2 focus-within:outline-offset-4"
              style={{ outlineColor: "var(--band-accent)" }}
            >
              {portrait}
              <span
                className="absolute inset-0 flex items-center justify-center rounded-full text-[10px] font-semibold opacity-0 transition-opacity duration-150 group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-100"
                style={{
                  background: "color-mix(in oklab, var(--band-ink) 55%, transparent)",
                  color: "var(--band-on-accent)",
                }}
              >
                {uploadAvatar.isPending ? "…" : t("profile.avatarChange")}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploadAvatar.isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  // Reset the input so choosing the same file twice still
                  // fires a change — after a failed upload that is exactly
                  // what someone does.
                  event.target.value = "";
                  if (file) uploadAvatar.mutate(file);
                }}
              />
            </label>
          </div>
        ) : (
          portrait
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
          {uploadError && (
            <p className="mt-1 text-xs" style={{ color: "var(--band-on-accent)" }}>
              {uploadError}
            </p>
          )}
        </div>

      </div>
    </section>
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
