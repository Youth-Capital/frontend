/**
 * Chart wrappers.
 *
 * One set of axis, grid and tooltip defaults so a bar chart in the admin panel
 * and one on the student dashboard read as the same system. Every colour comes
 * from the active theme — Recharts writes colours into SVG attributes and
 * cannot resolve CSS variables, so the palette is passed in explicitly.
 *
 * There is deliberately no radar chart here. The capital index is drawn by
 * `CapitalBloom`, which can express "this axis has no evidence yet" as its own
 * state; a radar has to close its polygon and would render that as a zero.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTheme } from "@/shared/theme/ThemeContext";
import type { Palette } from "@/shared/theme/palettes";

const axisStyle = (palette: Palette) =>
  ({ fontSize: 12, fill: palette.ink[500] }) as const;

const tooltipStyle = (palette: Palette) =>
  ({
    borderRadius: 10,
    border: `1px solid ${palette.ink[200]}`,
    backgroundColor: palette.card,
    color: palette.ink[800],
    fontSize: 12,
    boxShadow: "0 4px 12px rgb(15 23 42 / 0.08)",
  }) as const;

/** Score bands share one meaning across the product: red is "needs work". */
const bandColor = (palette: Palette, score: number): string => {
  if (score >= 75) return palette.success;
  if (score >= 50) return palette.brand[600];
  if (score >= 25) return palette.warning;
  return palette.danger;
};

export function KnowledgeBars({
  data,
  height = 280,
}: {
  data: { name: string; score: number }[];
  height?: number;
}) {
  const { palette } = useTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke={palette.ink[100]} />
        <XAxis type="number" domain={[0, 100]} tick={axisStyle(palette)} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ ...axisStyle(palette), fontSize: 11 }}
        />
        <Tooltip
          contentStyle={tooltipStyle(palette)}
          cursor={{ fill: palette.ink[50] }}
        />
        <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={16}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={bandColor(palette, entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({
  data,
  series,
  height = 260,
}: {
  data: Record<string, string | number>[];
  series: { key: string; label: string }[];
  height?: number;
}) {
  const { palette } = useTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 16, top: 8 }}>
        <CartesianGrid stroke={palette.ink[100]} />
        <XAxis dataKey="date" tick={axisStyle(palette)} />
        <YAxis domain={[0, 100]} tick={axisStyle(palette)} width={36} />
        <Tooltip contentStyle={tooltipStyle(palette)} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((item, index) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={palette.chart[index % palette.chart.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function FunnelChart({
  data,
  height = 300,
}: {
  data: { step: string; count: number; rate: number }[];
  height?: number;
}) {
  const { palette } = useTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 40 }}>
        <CartesianGrid horizontal={false} stroke={palette.ink[100]} />
        <XAxis type="number" tick={axisStyle(palette)} />
        <YAxis
          type="category"
          dataKey="step"
          width={140}
          tick={{ ...axisStyle(palette), fontSize: 11 }}
        />
        <Tooltip
          contentStyle={tooltipStyle(palette)}
          cursor={{ fill: palette.ink[50] }}
        />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((_entry, index) => (
            // Fading down the funnel makes drop-off legible at a glance.
            <Cell
              key={index}
              fill={palette.brand[600]}
              opacity={1 - index * 0.09}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DemandSupplyChart({
  data,
  height = 320,
  labels,
}: {
  data: { skill: string; demand: number; verified_supply: number }[];
  height?: number;
  labels: { demand: string; supply: string };
}) {
  const { palette } = useTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 8, bottom: 40 }}>
        <CartesianGrid vertical={false} stroke={palette.ink[100]} />
        <XAxis
          dataKey="skill"
          tick={{ ...axisStyle(palette), fontSize: 10 }}
          angle={-35}
          textAnchor="end"
          height={60}
          interval={0}
        />
        <YAxis tick={axisStyle(palette)} width={32} />
        <Tooltip
          contentStyle={tooltipStyle(palette)}
          cursor={{ fill: palette.ink[50] }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="demand"
          name={labels.demand}
          fill={palette.brand[600]}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="verified_supply"
          name={labels.supply}
          fill={palette.success}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
