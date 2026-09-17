import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAxisColor, useTheme } from "@/shared/theme/ThemeContext";
import type { CapitalDimensionScore } from "@/shared/types/api";

/**
 * The Kapital Index — a radar over the nine axes.
 *
 * WHY IT LOOKS LIKE AN INSTRUMENT. This was nine thick rounded petals in nine
 * different hues around a glossy sphere. It read as an illustration, and the
 * thing it illustrates is the concept the whole programme is named after
 * (TZ §2.1). The frame here is the ordinary one an assessment chart uses —
 * concentric rings, a spoke to every axis, names set outside the circle, one
 * thin trace — because that frame is what makes a number look measured rather
 * than decorated.
 *
 * WHY THE TRACE IS BROKEN. A radar normally closes its polygon, and a closed
 * polygon has to plot an axis with no evidence somewhere. At the origin it
 * reads "score: zero", which here is a lie with consequences — a learner who
 * has simply never entered a competition would be shown as having zero social
 * capital. So the trace is drawn only across runs of adjacent measured axes
 * and stops where the evidence stops. An unmeasured spoke stays a dashed,
 * empty track with an em dash where its number would be: an empty slot to
 * fill, which is what it is. Only when all nine are measured does the polygon
 * close and take a fill.
 *
 * WHY ONE COLOUR. The nine hues were carrying identity that the labels already
 * carry, and nine hues on one profile reads as nine competing series when it
 * is one. The trace is a single brand tone; the axis hues stay where they mean
 * something — the unlock list, and the bars in the narrow layout.
 *
 * Below `sm` the radial form is replaced by a plain bar list. A 9-spoke chart
 * on a 360px screen either clips its labels or shrinks them past readability.
 */

// Wider than tall on purpose: the side labels need horizontal room, and a
// square viewBox is what pushed them outside the canvas.
const WIDTH = 560;
const HEIGHT = 420;
const CX = WIDTH / 2;
const CY = 200;

/**
 * The scale runs from the inner ring, not from the centre point.
 *
 * The hole is where the overall index sits. It also keeps the low end of the
 * scale readable: nine traces converging on a single pixel tell you nothing
 * about which of them is 4 and which is 11.
 */
const R_INNER = 54;
const R_OUTER = 140;
const R_LABEL = R_OUTER + 20;
const RINGS = [0, 25, 50, 75, 100];

const polar = (radius: number, degrees: number): [number, number] => {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(radians), CY + radius * Math.sin(radians)];
};

const radiusFor = (score: number) =>
  R_INNER + ((R_OUTER - R_INNER) * Math.max(0, Math.min(100, score))) / 100;

/**
 * The runs of adjacent measured axes, walking the wheel.
 *
 * Returns `closed: true` only when every axis has evidence — that is the one
 * case where the trace may be a polygon. Otherwise it starts counting from the
 * first gap, so a run that spans index 0 stays one run instead of being cut in
 * half by the seam.
 */
function measuredRuns(flags: boolean[]): { runs: number[][]; closed: boolean } {
  const count = flags.length;
  if (count === 0) return { runs: [], closed: false };
  if (flags.every(Boolean)) {
    return { runs: [flags.map((_, index) => index)], closed: true };
  }

  const start = flags.indexOf(false);
  const runs: number[][] = [];
  let current: number[] = [];

  for (let step = 1; step <= count; step += 1) {
    const index = (start + step) % count;
    if (flags[index]) {
      current.push(index);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length > 0) runs.push(current);

  return { runs, closed: false };
}

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

  const step = 360 / (dimensions.length || 1);
  const focused = active !== null ? dimensions[active] : null;

  const { runs, closed } = measuredRuns(
    dimensions.map((dimension) => dimension.has_data),
  );

  const pointFor = (index: number) =>
    polar(radiusFor(dimensions[index].score), index * step);

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
          {/* The grid, deliberately recessive: it is the ruler, not the reading. */}
          {RINGS.map((ring) => (
            <circle
              key={ring}
              cx={CX}
              cy={CY}
              r={radiusFor(ring)}
              fill="none"
              /* The outer ring is the chart's edge and gets a boundary weight
                 (ink-400 measures 3.07:1 on the glass composite); the ones
                 inside it are reference only. */
              stroke={ring === 100 ? palette.ink[400] : palette.ink[300]}
              strokeWidth={1}
              opacity={ring === 100 ? 0.7 : 0.45}
            />
          ))}

          {/* One spoke per axis, out to the rim. Dashed where nothing has been
              measured yet, so the empty axes read as tracks, not as zeroes. */}
          {dimensions.map((dimension, index) => {
            const [x, y] = polar(R_OUTER, index * step);
            const [xInner, yInner] = polar(R_INNER, index * step);
            return (
              <line
                key={`spoke-${dimension.slug}`}
                x1={xInner}
                y1={yInner}
                x2={x}
                y2={y}
                stroke={palette.ink[300]}
                strokeWidth={1}
                strokeDasharray={dimension.has_data ? undefined : "3 5"}
                opacity={dimension.has_data ? 0.38 : 0.63}
              />
            );
          })}

          {/*
            A stem from the inner ring out to each measured value.

            Without them the trace was four points and three segments floating
            in a large empty grid, and an axis with no measured neighbour — the
            entrepreneurial one here — was a dot with nothing holding it to the
            scale. The stem is what makes each axis readable on its own, which
            is the reading this chart is actually for.
          */}
          {dimensions.map((dimension, index) =>
            dimension.has_data ? (
              <line
                key={`stem-${dimension.slug}`}
                x1={polar(R_INNER, index * step)[0]}
                y1={polar(R_INNER, index * step)[1]}
                x2={pointFor(index)[0]}
                y2={pointFor(index)[1]}
                stroke={palette.brand[700]}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.35}
              />
            ) : null,
          )}

          {/* The trace. One colour: this is one profile, not nine series. */}
          {runs.map((run) => {
            const points = run.map(pointFor);
            const path =
              points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

            if (points.length < 2) return null;

            return closed ? (
              <polygon
                key={`trace-${run[0]}`}
                points={path}
                fill={palette.brand[700]}
                fillOpacity={0.14}
                stroke={palette.brand[700]}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            ) : (
              <polyline
                key={`trace-${run[0]}`}
                points={path}
                fill="none"
                stroke={palette.brand[700]}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {dimensions.map((dimension, index) => {
            const angle = index * step;
            const [xValue, yValue] = pointFor(index);
            const [xHitInner, yHitInner] = polar(R_INNER, angle);
            const [xHitOuter, yHitOuter] = polar(R_LABEL, angle);
            const isActive = active === index;

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
                className="cursor-pointer"
              >
                {/* An invisible wedge along the whole spoke: the hit target has
                    to be bigger than a 8px dot or the chart is only usable by
                    people with steady hands. */}
                <line
                  x1={xHitInner}
                  y1={yHitInner}
                  x2={xHitOuter}
                  y2={yHitOuter}
                  stroke="transparent"
                  strokeWidth={34}
                />

                {dimension.has_data && (
                  <circle
                    cx={xValue}
                    cy={yValue}
                    r={isActive ? 7 : 5}
                    fill={palette.brand[700]}
                    /* A ring in the surface colour keeps the marker readable
                       where the trace passes behind it. */
                    stroke={palette.card}
                    strokeWidth={2}
                    style={{ transition: "r 150ms" }}
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

          {/* Centre: the focused axis, or the overall index when idle. Flat —
              the gloss and the gradient here were the loudest thing in a chart
              whose job is to be read. */}
          <circle
            cx={CX}
            cy={CY}
            r={R_INNER - 6}
            fill={palette.card}
            stroke={palette.ink[300]}
            strokeWidth={1}
          />
          {focused ? (
            <>
              <text
                x={CX}
                y={CY - 6}
                textAnchor="middle"
                className="fill-ink-900 text-[26px] font-semibold tabular-nums"
              >
                {focused.has_data ? focused.score : "—"}
              </text>
              <text
                x={CX}
                y={CY + 14}
                textAnchor="middle"
                className="fill-ink-500 text-[12px]"
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
                y={CY - 2}
                textAnchor="middle"
                className="fill-ink-900 font-display text-[34px] font-semibold tabular-nums"
              >
                {overall}
              </text>
              <text
                x={CX}
                y={CY + 18}
                textAnchor="middle"
                className="fill-ink-500 text-[12px]"
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
                    : "text-sm text-ink-500"
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
                    : "text-xs text-ink-500"
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
            <span className="min-w-0 flex-1 text-sm text-ink-700">
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
      /* An unmeasured axis is quieter than a measured one but it is still text
         somebody reads, so the dim state is ink-500 (4.61:1 on glass) rather
         than ink-400, which measures 3.07 and is a fill weight. */
      className={
        isActive
          ? "fill-ink-900 text-[13px] font-semibold"
          : dimmed
            ? "fill-ink-500 text-[13px]"
            : hasData
              ? "fill-ink-700 text-[13px]"
              : "fill-ink-500 text-[13px]"
      }
      style={{ transition: "fill 150ms" }}
    >
      {t(`capital.axis.${slug}`, { defaultValue: fallback })}
      <tspan className="fill-ink-500" fontSize="12">
        {" "}
        {hasData ? score : "—"}
      </tspan>
    </text>
  );
}
