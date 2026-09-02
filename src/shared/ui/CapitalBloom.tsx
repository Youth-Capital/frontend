import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAxisColor, useTheme } from "@/shared/theme/ThemeContext";
import type { CapitalDimensionScore } from "@/shared/types/api";

/**
 * The Kapital Index visualisation — nine radial bars, one per axis.
 *
 * Why not a radar chart. A radar closes its polygon, so an axis with no data is
 * plotted at the origin and reads as "score: zero". Here that is a lie with
 * consequences: a learner who simply has never had a mentor session would be
 * shown as having zero social capital. Nine independent bars have no polygon to
 * close, so "not measured yet" gets its own visual state — a dotted, hollow
 * track — which reads as *an empty slot to fill*, which is what it is.
 *
 * The nine capital types are the concept the programme is named after
 * (TZ §2.1); drawing them with the same stock widget every dashboard uses
 * throws that identity away.
 *
 * Encoding: bar length outward from the inner ring = score 0–100. Colour is the
 * axis's own hue, constant across the product, and carries identity only — no
 * value is ever communicated by colour alone.
 *
 * Below `sm` the radial form is replaced by a plain bar list. A 9-spoke chart
 * on a 360 px screen either clips its labels or shrinks them past readability;
 * the same data as horizontal bars stays legible.
 */

// Wider than tall on purpose: the side labels need horizontal room, and a
// square viewBox is what pushed them outside the canvas.
const WIDTH = 560;
const HEIGHT = 420;
const CX = WIDTH / 2;
const CY = 200;
const R_INNER = 62;
const R_OUTER = 140;
const R_LABEL = R_OUTER + 20;
const BAR_WIDTH = 26;
const GUIDES = [25, 50, 75, 100];

const polar = (radius: number, degrees: number): [number, number] => {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(radians), CY + radius * Math.sin(radians)];
};

interface Props {
  dimensions: CapitalDimensionScore[];
  overall: number;
  measured: number;
  total: number;
}

export function CapitalBloom({ dimensions, overall, measured, total }: Props) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const axisColor = useAxisColor();
  const [active, setActive] = useState<number | null>(null);
  const gradientId = useId();

  const step = 360 / (dimensions.length || 1);
  const focused = active !== null ? dimensions[active] : null;

  return (
    <>
      {/* Radial view — sm and up */}
      <div className="mx-auto hidden w-full max-w-[560px] sm:block">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={t("capital.chartLabel", { measured, total, overall })}
        >
          <defs>
            <radialGradient id={gradientId}>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor={palette.ink[50]} />
            </radialGradient>
          </defs>

          {/* Scale guides — reference, deliberately faint */}
          {GUIDES.map((guide) => (
            <circle
              key={guide}
              cx={CX}
              cy={CY}
              r={R_INNER + ((R_OUTER - R_INNER) * guide) / 100}
              fill="none"
              stroke={palette.ink[200]}
              strokeWidth={1}
              strokeDasharray={guide === 100 ? undefined : "2 4"}
            />
          ))}

          {dimensions.map((dimension, index) => {
            const angle = index * step;
            const [xInner, yInner] = polar(R_INNER, angle);
            const [xTrack, yTrack] = polar(R_OUTER, angle);
            const [xValue, yValue] = polar(
              R_INNER + ((R_OUTER - R_INNER) * dimension.score) / 100,
              angle,
            );
            const isActive = active === index;
            const color = axisColor(dimension.slug, dimension.color);

            return (
              <g
                key={dimension.slug}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                tabIndex={0}
                role="img"
                aria-label={`${dimension.name}: ${
                  dimension.has_data ? `${dimension.score}%` : t("capital.noData")
                }`}
                className="cursor-pointer outline-none"
              >
                {dimension.has_data ? (
                  <line
                    x1={xInner}
                    y1={yInner}
                    x2={xTrack}
                    y2={yTrack}
                    stroke={palette.ink[100]}
                    strokeWidth={BAR_WIDTH}
                    strokeLinecap="round"
                  />
                ) : (
                  <line
                    x1={xInner}
                    y1={yInner}
                    x2={xTrack}
                    y2={yTrack}
                    stroke={palette.ink[300]}
                    strokeWidth={BAR_WIDTH}
                    strokeLinecap="round"
                    strokeDasharray="1 9"
                    opacity={isActive ? 0.95 : 0.5}
                  />
                )}

                {dimension.has_data && dimension.score > 0 && (
                  <line
                    x1={xInner}
                    y1={yInner}
                    x2={xValue}
                    y2={yValue}
                    stroke={color}
                    strokeWidth={isActive ? BAR_WIDTH + 4 : BAR_WIDTH}
                    strokeLinecap="round"
                    opacity={active === null || isActive ? 1 : 0.3}
                    style={{ transition: "stroke-width 150ms, opacity 150ms" }}
                  />
                )}

                <AxisLabel
                  angle={angle}
                  slug={dimension.slug}
                  fallback={dimension.name}
                  score={dimension.score}
                  hasData={dimension.has_data}
                  isActive={isActive}
                  dimmed={active !== null && !isActive}
                />
              </g>
            );
          })}

          {/* Centre shows the focused axis, or the overall index when idle */}
          <circle
            cx={CX}
            cy={CY}
            r={R_INNER - 8}
            fill={`url(#${gradientId})`}
            stroke={palette.ink[200]}
          />
          {focused ? (
            <>
              <text
                x={CX}
                y={CY - 6}
                textAnchor="middle"
                className="fill-ink-900 text-[28px] font-semibold tabular-nums"
              >
                {focused.has_data ? focused.score : "—"}
              </text>
              <text
                x={CX}
                y={CY + 16}
                textAnchor="middle"
                className="fill-ink-500 text-[13px]"
              >
                {t(`capital.axis.${focused.slug}`, {
                  defaultValue: focused.name,
                })}
              </text>
            </>
          ) : (
            <>
              <text
                x={CX}
                y={CY - 4}
                textAnchor="middle"
                className="fill-ink-900 text-[36px] font-semibold tabular-nums"
              >
                {overall}
              </text>
              <text
                x={CX}
                y={CY + 18}
                textAnchor="middle"
                className="fill-ink-500 text-[13px]"
              >
                {measured}/{total} {t("capital.axesShort")}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Bar view — below sm */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums text-ink-900">
            {overall}
          </span>
          <span className="text-sm text-ink-500">
            {measured}/{total} {t("capital.axesShort")}
          </span>
        </div>

        {dimensions.map((dimension) => (
          <div key={dimension.slug}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span
                className={
                  dimension.has_data
                    ? "text-sm text-ink-700"
                    : "text-sm text-ink-400"
                }
              >
                {t(`capital.axis.${dimension.slug}`, {
                  defaultValue: dimension.name,
                })}
              </span>
              <span
                className={
                  dimension.has_data
                    ? "text-sm font-semibold tabular-nums text-ink-800"
                    : "text-xs text-ink-400"
                }
              >
                {dimension.has_data ? dimension.score : t("capital.noData")}
              </span>
            </div>
            <div
              className={
                dimension.has_data
                  ? "h-2.5 w-full overflow-hidden rounded-full bg-ink-200"
                  : "h-2.5 w-full rounded-full border border-dashed border-ink-300"
              }
              role="progressbar"
              aria-valuenow={dimension.has_data ? dimension.score : undefined}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={dimension.name}
            >
              {dimension.has_data && (
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${dimension.score}%`,
                    backgroundColor: axisColor(dimension.slug, dimension.color),
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Unmeasured axes, rendered as things to do rather than things missing.
 *
 * The action text is derived from the signals the backend actually uses to
 * compute that axis (`breakdown.signals`), so the advice cannot drift from the
 * scoring logic the way a hardcoded list would.
 */
export function CapitalUnlockList({
  dimensions,
}: {
  dimensions: CapitalDimensionScore[];
}) {
  const { t } = useTranslation();
  const axisColor = useAxisColor();

  const pending = dimensions.filter((dimension) => !dimension.has_data);
  if (pending.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1.5">
      {pending.map((dimension) => {
        const signals =
          (dimension.breakdown?.signals as { signal: string }[] | undefined) ?? [];
        const first = signals[0]?.signal;

        return (
          <li
            key={dimension.slug}
            className="flex items-center gap-2.5 rounded-xl border border-dashed border-ink-300 px-3 py-2"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: axisColor(dimension.slug, dimension.color) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-sm text-ink-700">
              {t(`capital.axis.${dimension.slug}`, {
                defaultValue: dimension.name,
              })}
            </span>
            <span className="shrink-0 text-xs text-ink-500">
              {first
                ? t(`capital.signal.${first}`, {
                    defaultValue: t("capital.noData"),
                  })
                : t("capital.notTracked")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AxisLabel({
  angle,
  slug,
  fallback,
  score,
  hasData,
  isActive,
  dimmed,
}: {
  angle: number;
  slug: string;
  fallback: string;
  score: number;
  hasData: boolean;
  isActive: boolean;
  dimmed: boolean;
}) {
  const { t } = useTranslation();
  const [x, y] = polar(R_LABEL, angle);

  // Anchor by horizontal position so a label grows away from the chart rather
  // than across it — this is what clipped the long names before.
  const radians = ((angle - 90) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const anchor = cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle";
  const dy = sin > 0.7 ? 12 : sin < -0.7 ? -4 : 4;

  return (
    <text
      x={x}
      y={y + dy}
      textAnchor={anchor}
      className={
        isActive
          ? "fill-ink-900 text-[14px] font-semibold"
          : dimmed
            ? "fill-ink-400 text-[14px]"
            : hasData
              ? "fill-ink-700 text-[14px]"
              : "fill-ink-400 text-[14px]"
      }
      style={{ transition: "fill 150ms" }}
    >
      {t(`capital.axis.${slug}`, { defaultValue: fallback })}
      <tspan className={hasData ? "fill-ink-500" : "fill-ink-300"} fontSize="13">
        {" "}
        {hasData ? score : "—"}
      </tspan>
    </text>
  );
}
