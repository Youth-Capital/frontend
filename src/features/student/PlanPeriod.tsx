import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

/** What the API accepts — mirrored from `PlanGenerateSerializer.period_days`. */
export const PERIOD_MIN = 14;
export const PERIOD_MAX = 365;
export const PERIOD_DEFAULT = 30;

const PRESETS = [15, 30];

/**
 * How long the plan should run.
 *
 * The length was fixed at 90 days and stated in the button's own label, which
 * is the kind of decision a plan should not be making for the person following
 * it: three months is a long commitment to ask for before anybody has seen
 * what the plan contains. Two short presets and a free field is the whole
 * control — 90 is still reachable, it is just no longer the only answer.
 *
 * The bounds are the API's, repeated here so the field cannot offer a number
 * the server will refuse. They are shown rather than enforced silently: a
 * spinner that quietly clamps 400 to 365 leaves somebody wondering why their
 * year-long plan came back short.
 *
 * Radio inputs rather than buttons, because that is what this is — one choice
 * out of a set — and it gets arrow-key navigation and a group label for free.
 */
export function PlanPeriod({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (days: number) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const name = useId();
  const [custom, setCustom] = useState(() => !PRESETS.includes(value));

  const itemRadius = "rounded-[calc(var(--radius-control)-2px)]";

  return (
    <fieldset disabled={disabled} className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{t("plan.periodLabel")}</legend>

      <span className="text-xs text-ink-500">{t("plan.periodLabel")}</span>

      <div className="flex items-center rounded-(--radius-control) border border-ink-200 p-0.5">
        {PRESETS.map((days) => {
          const active = !custom && value === days;
          return (
            <label
              key={days}
              className={`${itemRadius} cursor-pointer px-3 py-1 text-xs font-semibold tabular-nums transition-colors ${
                active
                  ? "bg-brand-fill text-on-brand"
                  : "text-ink-500 hover:bg-ink-100"
              }`}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={active}
                onChange={() => {
                  setCustom(false);
                  onChange(days);
                }}
              />
              {days}
            </label>
          );
        })}

        <label
          className={`${itemRadius} cursor-pointer px-3 py-1 text-xs font-semibold transition-colors ${
            custom ? "bg-brand-fill text-on-brand" : "text-ink-500 hover:bg-ink-100"
          }`}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={custom}
            onChange={() => setCustom(true)}
          />
          {t("plan.periodCustom")}
        </label>
      </div>

      {custom && (
        <label className="flex items-center gap-2 text-xs text-ink-500">
          <input
            type="number"
            inputMode="numeric"
            min={PERIOD_MIN}
            max={PERIOD_MAX}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            aria-label={t("plan.periodLabel")}
            className="w-20 rounded-(--radius-control) border border-ink-300 bg-surface px-2 py-1 text-base tabular-nums text-ink-800 sm:text-sm"
          />
          <span>
            {t("plan.periodRange", { min: PERIOD_MIN, max: PERIOD_MAX })}
          </span>
        </label>
      )}
    </fieldset>
  );
}

/** Whether a chosen length is one the server will accept. */
export function isValidPeriod(days: number): boolean {
  return Number.isInteger(days) && days >= PERIOD_MIN && days <= PERIOD_MAX;
}
