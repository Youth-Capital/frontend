import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { Badge, Card, CardSkeleton, ErrorState } from "@/shared/ui";
import { Logo } from "@/shared/ui/Logo";

interface Passport {
  youth_id: string | null;
  name: string;
  headline: string;
  avatar: string | null;
  region: string | null;
  target_profession: string | null;
  skills?: { name: string; proficiency: number; verified: boolean }[];
  experience?: {
    title: string;
    organization: string;
    type: string;
    duration_months: number;
  }[];
  portfolio?: { title: string; type: string; url: string }[];
  certificates?: { title: string; serial: string; issued_at: string }[];
  contacts?: { email: string };
}

/**
 * The public Youth Passport.
 *
 * Unauthenticated by design, so it uses a bare axios call rather than the
 * authenticated client — no token should ever be attached to a public page.
 */
export default function PassportPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();

  const passport = useQuery({
    queryKey: ["public-passport", slug],
    queryFn: async () => {
      const { data } = await axios.get<Passport>(`/api/v1/cv/passport/${slug}/`);
      return data;
    },
    enabled: Boolean(slug),
    retry: false,
  });

  if (passport.isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <CardSkeleton rows={8} />
      </div>
    );
  }

  if (passport.isError || !passport.data) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ErrorState title={t("errors.not_found")} />
      </div>
    );
  }

  const data = passport.data;

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="border-b border-ink-200 bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="text-sm font-semibold text-ink-900">
              {t("cv.passport")}
            </span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
              {data.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-ink-900">{data.name}</h1>
              {data.target_profession && (
                <p className="text-sm text-ink-600">{data.target_profession}</p>
              )}
              <p className="mt-1 text-xs text-ink-500">
                {[data.region, data.youth_id].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          {data.headline && (
            <p className="mt-4 text-sm text-ink-600">{data.headline}</p>
          )}
        </Card>

        {(data.skills?.length ?? 0) > 0 && (
          <Card className="mt-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              {t("cv.section.skills")}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {data.skills?.map((skill) => (
                <Badge
                  key={skill.name}
                  tone={skill.verified ? "success" : "neutral"}
                >
                  {skill.name} {skill.proficiency}
                  {skill.verified && " ✓"}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {(data.experience?.length ?? 0) > 0 && (
          <Card className="mt-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              {t("cv.section.experience")}
            </h2>
            <ul className="flex flex-col gap-3">
              {data.experience?.map((item, index) => (
                <li key={index}>
                  <p className="text-sm font-medium text-ink-800">{item.title}</p>
                  <p className="text-xs text-ink-500">
                    {item.organization} ·{" "}
                    {t("experience.duration", { count: item.duration_months })}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(data.portfolio?.length ?? 0) > 0 && (
          <Card className="mt-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              {t("cv.portfolio")}
            </h2>
            <ul className="flex flex-col gap-2">
              {data.portfolio?.map((item, index) => (
                <li key={index} className="text-sm">
                  <span className="text-ink-800">{item.title}</span>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 text-brand-600 hover:underline"
                    >
                      ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {(data.certificates?.length ?? 0) > 0 && (
          <Card className="mt-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              {t("cv.section.certificates")}
            </h2>
            <ul className="flex flex-col gap-2">
              {data.certificates?.map((certificate) => (
                <li key={certificate.serial} className="text-sm text-ink-800">
                  {certificate.title}
                  <span className="ml-2 font-mono text-xs text-ink-400">
                    {certificate.serial}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {data.contacts && (
          <Card className="mt-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
              {t("cv.section.contacts")}
            </h2>
            <a
              href={`mailto:${data.contacts.email}`}
              className="text-sm text-brand-600 hover:underline"
            >
              {data.contacts.email}
            </a>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-ink-400">
          {t("app.name")}
        </p>
      </main>
    </div>
  );
}
