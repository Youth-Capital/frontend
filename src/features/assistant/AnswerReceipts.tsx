import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { formatDate, resolveTaskTitle } from "@/shared/lib/format";
import type { ChatMessage } from "@/shared/types/api";

/**
 * The data behind the sentence.
 *
 * Shown rather than summarised: an explanation the reader cannot check against
 * the screen it describes is just a claim with extra steps.
 *
 * Every shape the server can send is rendered here. An earlier version handled
 * three of the ten, so most answers arrived as a sentence with nothing under
 * it — "Задачи из плана на сегодня:" followed by blank space, which reads as
 * the assistant having nothing to say.
 */

/** The six scoring parts, in the order they are weighted. */
const COMPONENTS = [
  "coverage",
  "knowledge",
  "verification",
  "experience",
  "education",
  "location",
] as const;

/** Plain counts worth showing as a small grid, ordered as they read best. */
const COUNTS = [
  "readiness",
  "skills_total",
  "skills_verified",
  "courses_completed",
  "capital",
  "best_match",
  "published",
  "total",
  "applications",
  "new",
  "strong_matches",
] as const;

interface SkillRow {
  skill: string;
  current_level?: number;
  required_level?: number;
  proficiency?: number;
  evidence?: { source: string; weight: number }[];
}

export function AnswerReceipts({ message }: { message: ChatMessage }) {
  const { t, i18n } = useTranslation();
  const facts = (message.grounding ?? {}) as Record<string, unknown>;

  const rows: [string, string][] = [];

  const components = facts.components as Record<string, unknown> | undefined;
  if (components) {
    for (const key of COMPONENTS) {
      const value = components[key];
      if (typeof value === "number") {
        rows.push([t(`match.${key}`, { defaultValue: key }), `${Math.round(value)}%`]);
      }
    }
  }

  const weights = facts.weights as Record<string, number> | undefined;
  if (weights) {
    for (const [key, value] of Object.entries(weights)) {
      rows.push([
        t(`match.${key}`, { defaultValue: key }),
        `${Math.round(value * 100)}%`,
      ]);
    }
  }

  for (const key of COUNTS) {
    const value = facts[key];
    if (typeof value === "number") {
      rows.push([t(`chat.fact.${key}`, { defaultValue: key }), String(value)]);
    }
  }

  // Defensive on the element type: the server sent plain strings from one
  // handler and objects from another, and the renderer showed "1." with
  // nothing beside it. Both shapes now render.
  const tasks = (facts.tasks as (string | { title: string; due?: string | null })[] | undefined)
    ?.map((entry) =>
      typeof entry === "string" ? { title: entry, due: null } : entry,
    );
  const skills = facts.skills as SkillRow[] | undefined;
  const axes = facts.axes as
    | { name: string; score: number; has_data: boolean }[]
    | undefined;
  const tests = facts.tests as
    | { id: string; title: string; skills: string[]; taken: boolean }[]
    | undefined;
  const unproven = facts.unproven as { skill: string; level: number }[] | undefined;
  const professions = facts.professions as
    | {
        id: string;
        name: string;
        category: string;
        required: number;
        met: number;
        is_target: boolean;
      }[]
    | undefined;
  const courses = facts.courses as
    | { id: string; title: string; skills: string[]; enrolled: boolean }[]
    | undefined;

  const gapGroups = (["matching", "partial", "missing"] as const)
    .map((key) => [key, facts[key]] as const)
    .filter(([, value]) => Array.isArray(value) && value.length > 0)
    .map(([key, value]) => [key, value as SkillRow[]] as const);

  const hasAnything =
    rows.length > 0 ||
    Boolean(tasks?.length) ||
    Boolean(skills?.length) ||
    Boolean(axes?.length) ||
    Boolean(tests?.length) ||
    Boolean(unproven?.length) ||
    Boolean(professions?.length) ||
    Boolean(courses?.length) ||
    gapGroups.length > 0;

  if (!hasAnything && message.sources.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-ink-200 pt-3 text-sm">
      {rows.length > 0 && (
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-ink-500">{label}</dt>
              <dd className="font-semibold tabular-nums text-ink-800">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {tasks && tasks.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((task, index) => (
            <li key={`${task.title}-${index}`} className="flex items-baseline gap-2">
              <span className="text-brand-600">{index + 1}.</span>
              <span className="flex-1 text-ink-800">
                {resolveTaskTitle(task.title, t)}
              </span>
              {task.due && (
                <span className="text-xs tabular-nums text-ink-500">
                  {formatDate(task.due, i18n.resolvedLanguage)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {unproven && unproven.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {t("chat.fact.unproven")}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {unproven.map((row) => (
              <span
                key={row.skill}
                className="rounded-full bg-warning-soft px-2.5 py-1 text-xs text-warning"
              >
                {row.skill} · {row.level}
              </span>
            ))}
          </div>
        </div>
      )}

      {professions && professions.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {professions.map((row) => (
            <li key={row.id} className="flex items-baseline gap-2">
              <span className="flex-1 text-ink-800">
                {row.name}
                {row.is_target && (
                  <span className="ml-1.5 text-xs text-brand-600">
                    {t("chat.fact.yourTarget")}
                  </span>
                )}
              </span>
              {row.category && (
                <span className="hidden text-xs text-ink-500 sm:inline">
                  {row.category}
                </span>
              )}
              {row.required > 0 && (
                <span className="text-xs tabular-nums text-ink-600">
                  {row.met}/{row.required}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {courses && courses.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {courses.map((row) => (
            <li key={row.id} className="flex items-baseline gap-2">
              <span className="flex-1 text-ink-800">{row.title}</span>
              {row.skills.length > 0 && (
                <span className="hidden text-xs text-ink-500 sm:inline">
                  {row.skills.join(" · ")}
                </span>
              )}
              {row.enrolled && (
                <span className="text-xs text-success">{t("chat.fact.enrolled")}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {tests && tests.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {tests.map((test) => (
            <li key={test.id} className="flex items-baseline gap-2">
              <span className="flex-1 text-ink-800">{test.title}</span>
              {test.skills.length > 0 && (
                <span className="hidden text-xs text-ink-500 sm:inline">
                  {test.skills.join(" · ")}
                </span>
              )}
              {test.taken && (
                <span className="text-xs text-success">{t("chat.fact.taken")}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {gapGroups.map(([key, group]) => (
        <div key={key}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {t(`chat.fact.${key}`)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {group.slice(0, 8).map((row) => (
              <span key={row.skill} className={gapChip(key)}>
                {row.skill}
                {typeof row.current_level === "number" &&
                typeof row.required_level === "number"
                  ? ` ${row.current_level} → ${row.required_level}`
                  : ""}
              </span>
            ))}
          </div>
        </div>
      ))}

      {skills && skills.length > 0 && (
        <ul className="flex flex-col gap-2">
          {skills.map((row) => (
            <li key={row.skill}>
              <div className="flex justify-between gap-3">
                <span className="text-ink-800">{row.skill}</span>
                <span className="font-semibold tabular-nums text-ink-800">
                  {row.proficiency}
                </span>
              </div>
              {row.evidence && row.evidence.length > 0 && (
                <p className="text-xs text-ink-500">
                  {row.evidence
                    .map(
                      (item) =>
                        `${t(`evidence.${item.source}`, { defaultValue: item.source })} × ${item.weight}`,
                    )
                    .join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {axes && axes.length > 0 && (
        <ul className="flex flex-col gap-1">
          {axes.map((axis) => (
            <li key={axis.name} className="flex items-center gap-3">
              <span className="flex-1 truncate text-ink-700">{axis.name}</span>
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-ink-100">
                <i
                  className="block h-full rounded-full bg-brand-600"
                  style={{ width: `${axis.has_data ? axis.score : 0}%` }}
                />
              </span>
              <span className="w-14 text-right text-xs tabular-nums text-ink-600">
                {/* An unmeasured axis is not a zero, and saying so is the whole
                    point of the capital index. */}
                {axis.has_data ? axis.score : t("chat.fact.noData")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {message.sources.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          {message.sources
            .filter((source) => source.screen)
            .map((source) => (
              <Link
                key={`${source.type}-${source.screen}`}
                to={source.screen}
                className="text-brand-600 hover:text-brand-700"
              >
                {t("chat.openSource")} →
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}

function gapChip(kind: "matching" | "partial" | "missing"): string {
  const base = "rounded-full px-2.5 py-1 text-xs";
  if (kind === "missing") return `${base} bg-danger-soft text-danger`;
  if (kind === "partial") return `${base} bg-warning-soft text-warning`;
  return `${base} bg-success-soft text-success`;
}
