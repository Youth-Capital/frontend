import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { enUS, ru, uz } from "date-fns/locale";

const LOCALES = { en: enUS, ru, uz } as const;

const resolveLocale = (language: string) =>
  LOCALES[language.split("-")[0] as keyof typeof LOCALES] ?? uz;

export function formatDate(value: string | null | undefined, language = "uz"): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM yyyy", { locale: resolveLocale(language) });
  } catch {
    return "—";
  }
}

export function formatDateTime(
  value: string | null | undefined,
  language = "uz",
): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "d MMM yyyy, HH:mm", {
      locale: resolveLocale(language),
    });
  } catch {
    return "—";
  }
}

export function formatRelative(
  value: string | null | undefined,
  language = "uz",
): string {
  if (!value) return "—";
  try {
    return formatDistanceToNowStrict(parseISO(value), {
      addSuffix: true,
      locale: resolveLocale(language),
    });
  } catch {
    return "—";
  }
}

/**
 * An ISO-8601 date-time, and nothing looser.
 *
 * Anchored at both ends and requiring the T separator, so a course title that
 * happens to start with a year is left alone. Only a value that is genuinely
 * a timestamp gets rewritten.
 */
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Make a notification payload fit to appear in a sentence.
 *
 * Notification bodies are translated templates filled from a payload the
 * server built, and the server sends machine values: `scheduled_at` arrives as
 * "2026-09-20T19:30:00+05:00", which then reached the reader verbatim —
 * «Frontend Intern» — 2026-09-20T19:30:00+05:00.
 *
 * Doing this per notification type would mean remembering it for every new
 * one, and the one that gets forgotten is the one a student reads. So it is
 * done here, by shape: anything that is an ISO timestamp becomes a date the
 * reader recognises, in their own language.
 */
export function humanisePayload(
  payload: Record<string, unknown> | null | undefined,
  language = "uz",
): Record<string, unknown> {
  if (!payload) return {};

  const humanised: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    humanised[key] =
      typeof value === "string" && ISO_DATETIME.test(value)
        ? formatDateTime(value, language)
        : value;
  }
  return humanised;
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string,
  fallback: string,
): string {
  if (min === null && max === null) return fallback;
  const compact = (value: number) =>
    new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
  if (min !== null && max !== null) {
    return `${compact(min)} – ${compact(max)} ${currency}`;
  }
  return `${compact((min ?? max) as number)} ${currency}`;
}

export function formatNumber(value: number, language = "uz"): string {
  return new Intl.NumberFormat(language === "en" ? "en-US" : "ru-RU").format(value);
}

/** 0–100 to a semantic tone, so colour carries the same meaning everywhere. */
export function scoreTone(
  score: number,
): "success" | "brand" | "warning" | "danger" {
  if (score >= 75) return "success";
  if (score >= 50) return "brand";
  if (score >= 25) return "warning";
  return "danger";
}

export function matchTone(score: number): "success" | "brand" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 60) return "brand";
  if (score >= 40) return "warning";
  return "danger";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function minutesToHours(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

/**
 * Human text for a value the server generated.
 *
 * The server stores a translation key with named arguments after "::"
 * (`plan.desc.reach_level::skill=SIEM::level=55`) rather than a finished
 * sentence, because a plan is read again months later in whatever language
 * the person is using then. Hand-written text — a course title, a task the
 * student typed — is returned unchanged.
 *
 * The regex is what separates the two: a key is lowercase, dotted and has no
 * spaces, which no human-entered title is. `defaultValue` covers the rest —
 * an unknown key renders as itself rather than as an empty line.
 */
const KEYED = /^[a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+(?:::|$)/;

export function resolveTaskTitle(
  title: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (!title || !KEYED.test(title)) return title;

  const [key, ...rest] = title.split("::");
  const params: Record<string, string> = {};
  for (const part of rest) {
    const equals = part.indexOf("=");
    // A bare argument is the original single-parameter shape, which every
    // plan generated before this change still uses.
    if (equals === -1) params.skill = part;
    else params[part.slice(0, equals)] = part.slice(equals + 1);
  }
  return t(key, { ...params, defaultValue: title });
}
