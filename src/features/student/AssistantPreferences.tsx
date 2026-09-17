import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";
import { Card, CardHeader, CardSkeleton } from "@/shared/ui";

/**
 * How the assistant talks to you.
 *
 * The assistant already adapts on its own: it reads what your account
 * actually contains — how many skills are confirmed, how many lessons are
 * finished — and pitches its answers at that. Someone who has just arrived
 * gets terms explained and one step at a time; someone with a track record
 * gets the short version.
 *
 * So this screen is a *correction*, not a configuration, and it is built to
 * say so. Every setting has an "automatic" option and that option is the
 * default; picking one of the others is telling the assistant it read you
 * wrong. That is also why the card shows what it currently assumes — a
 * control that changes behaviour without telling you what it is changing
 * from is a control people stop trusting.
 */

type Detail = "BRIEF" | "NORMAL" | "DETAILED";
type Tone = "WARM" | "NEUTRAL" | "DIRECT";

interface Preferences {
  stage: "new" | "starting" | "building" | "ready";
  chosen: {
    detail: Detail | null;
    tone: Tone | null;
    explain_terms: boolean | null;
  };
  effective: {
    detail: Detail;
    tone: Tone;
    explain_terms: boolean;
  };
}

const DETAILS: Detail[] = ["BRIEF", "NORMAL", "DETAILED"];
const TONES: Tone[] = ["WARM", "NEUTRAL", "DIRECT"];

export function AssistantPreferences() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const preferences = useQuery({
    queryKey: ["assistant-preferences"],
    queryFn: async () => {
      const { data } = await api.get<Preferences>("/ai/assistant/preferences/");
      return data;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { data } = await api.patch<Preferences>(
        "/ai/assistant/preferences/",
        patch,
      );
      return data;
    },
    onSuccess: (data) => queryClient.setQueryData(["assistant-preferences"], data),
  });

  if (preferences.isLoading) return <CardSkeleton rows={3} />;
  if (!preferences.data) return null;

  const { stage, chosen, effective } = preferences.data;

  return (
    <Card>
      <CardHeader
        title={t("settings.assistant")}
        subtitle={t("settings.assistantHint")}
      />

      <p className="mb-4 text-sm text-ink-600">
        {t(`settings.assistantStage_${stage}`)}
      </p>

      <div className="flex flex-col gap-5">
        <Choice
          label={t("settings.assistantDetail")}
          /* null is a real value here, not an absence: it means "follow what
             you worked out", and it has to be reachable again after someone
             has tried one of the fixed options. */
          value={chosen.detail}
          auto={t(`settings.assistantDetail_${effective.detail}`)}
          options={DETAILS.map((value) => ({
            value,
            label: t(`settings.assistantDetail_${value}`),
          }))}
          busy={update.isPending}
          onPick={(value) => update.mutate({ detail: value })}
        />

        <Choice
          label={t("settings.assistantTone")}
          value={chosen.tone}
          auto={t(`settings.assistantTone_${effective.tone}`)}
          options={TONES.map((value) => ({
            value,
            label: t(`settings.assistantTone_${value}`),
          }))}
          busy={update.isPending}
          onPick={(value) => update.mutate({ tone: value })}
        />

        <Choice
          label={t("settings.assistantTerms")}
          value={
            chosen.explain_terms === null ? null : String(chosen.explain_terms)
          }
          auto={t(
            effective.explain_terms
              ? "settings.assistantTerms_true"
              : "settings.assistantTerms_false",
          )}
          options={[
            { value: "true", label: t("settings.assistantTerms_true") },
            { value: "false", label: t("settings.assistantTerms_false") },
          ]}
          busy={update.isPending}
          onPick={(value) =>
            update.mutate({ explain_terms: value === null ? null : value === "true" })
          }
        />
      </div>
    </Card>
  );
}

/**
 * One setting, as a row of pills with "automatic" first.
 *
 * A radio group rather than toggle buttons: these are one-of-N, and a screen
 * reader should say "2 of 4" rather than announcing four independent toggles
 * that happen to be mutually exclusive.
 */
function Choice({
  label,
  value,
  auto,
  options,
  busy,
  onPick,
}: {
  label: string;
  value: string | null;
  /** What the assistant currently does when nothing is chosen. */
  auto: string;
  options: { value: string; label: string }[];
  busy: boolean;
  onPick: (value: string | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <fieldset className="min-w-0 border-0 p-0" role="radiogroup" aria-label={label}>
      <legend className="mb-2 text-sm font-medium text-ink-700">{label}</legend>
      <div className="flex flex-wrap gap-2">
        <Pill
          selected={value === null}
          busy={busy}
          onClick={() => onPick(null)}
          /* The automatic option names what it resolves to, so choosing it is
             not choosing the unknown. */
          label={`${t("settings.assistantAuto")} · ${auto}`}
        />
        {options.map((option) => (
          <Pill
            key={option.value}
            selected={value === option.value}
            busy={busy}
            onClick={() => onPick(option.value)}
            label={option.label}
          />
        ))}
      </div>
    </fieldset>
  );
}

function Pill({
  selected,
  busy,
  onClick,
  label,
}: {
  selected: boolean;
  busy: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={busy}
      onClick={onClick}
      className={
        selected
          ? "rounded-full border border-brand-edge bg-brand-fill px-3.5 py-1.5 text-sm font-medium text-on-brand disabled:opacity-60"
          : "glass rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-400 disabled:opacity-60"
      }
    >
      {label}
    </button>
  );
}
