import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { SkillGapEntry } from "@/shared/types/api";

import "@/shared/styles/deep.css";

/**
 * The skills map: the target profession in the middle, its skill categories to
 * either side, and each category's skills in a column running outward.
 *
 * WHY A TWO-SIDED TREE AND NOT A FAN. The map used to fan each category's
 * skills around it on a circle. Measured on real accounts before this change,
 * a fan could not be both compact and clean: at the old spacing the
 * "Кибербезопасность" label overlapped the SIEM label, a learner with three
 * development skills had "REST API" printed over "Django", and every attempt
 * to pull the fan tighter made the overlaps larger. Skills stacked in rows
 * cannot overlap — each row has its own line — so the layout is collision-free
 * by construction rather than by tuning, and it is shorter: 181px tall for a
 * seven-skill profile where the fan needed 454px.
 *
 * HOW A SKILL'S LEVEL IS SHOWN. A thin arc around each node: the share of the
 * level the profession asks for that has been reached. A full arc is "at the
 * level", a green ring is verified. That replaced a colour per state and a
 * distance-from-the-category encoding that the eye could not read.
 *
 * WHAT THE CENTRE COUNTS. Readiness is computed from the REQUIRED skills only
 * (profiles.get_skill_gap), so the centre says "0 / 4 required" instead of a
 * bare percentage that seemed to contradict two preferred skills at full level.
 *
 * WHY IT IS DRAWN AT ITS NATURAL SIZE. The SVG used to stretch to the full width
 * of the card, so a small map was scaled up and read as oversized. The viewBox
 * is fitted to the content and the SVG is capped at that width — one unit is
 * one pixel, labels are exactly 11px, and a narrow screen scales it down.
 */

export interface MapSkill extends SkillGapEntry {
  state: "met" | "partial" | "missing";
}

const ROW = 32;
const GROUP_GAP = 18;
/** Space between a category's label and its column of skills. */
const COLUMN_GAP = 34;
/** Space between the centre badge and the nearest category label. */
const CENTRE_GAP = 28;
const NODE_R = 8;
const ARC_R = 13;
const CENTRE_R = 48;
const LABEL_CHAR = 6.3;
const PAD = 18;

const pillWidth = (category: string) => category.length * 6.8 + 22;
const labelWidth = (skill: string) => skill.length * LABEL_CHAR + ARC_R + 10;

export function SkillsMap({
  profession,
  requiredMet,
  requiredTotal,
  skills,
}: {
  profession: string;
  requiredMet: number;
  requiredTotal: number;
  skills: MapSkill[];
}) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const { hubs, leaves, box } = layout(skills);
  const open = leaves.find((leaf) => leaf.skill_id === openId);

  return (
    <div className="skills-map relative overflow-hidden rounded-(--radius-card) p-4 sm:p-6">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold text-ink-900">
          {t("atlas.mapTitle")}
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-ink-500">
          {t("atlas.mapHint")}
        </p>
        <Legend />
      </div>

      {/*
       * A diagram of labelled nodes has a width below which its labels stop
       * being words. Sized purely as `w-full`, the map scaled to fit a phone
       * and took everything drawn in it down with it — on a 390px screen the
       * leaf nodes measured 26x10px, well under a fingertip, and their labels
       * shrank with them.
       *
       * So it is drawn at its own size and scrolls inside its own box instead.
       * That is the one exception the layout rules allow — a table, a code
       * block, a diagram — and it is why the scroller is here rather than on
       * the page: the map moves sideways, the page does not. Drawn at size,
       * a node is 28px against a 32px row pitch; that is short of the 44px a
       * fingertip wants, and the rows cannot be opened up without making the
       * map taller than the screen, so the node also answers to the keyboard
       * and to the panel below it.
       */}
      <div className="relative -mx-4 overflow-x-auto overscroll-x-contain px-4 sm:mx-0 sm:px-0">
        <svg
          viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
          className="mx-auto mt-4 block h-auto"
          style={{ width: box.width }}
          role="img"
          aria-label={t("atlas.mapLabel", {
            profession,
            met: requiredMet,
            total: requiredTotal,
          })}
        >
          {hubs.map((hub) => (
            <path
              key={`spoke-${hub.category}`}
              d={bend(hub.side * CENTRE_R, 0, hub.x - hub.side * (hub.width / 2), hub.y)}
              fill="none"
              strokeWidth="2"
              className="stroke-brand-300"
            />
          ))}
          {leaves.map((leaf) => (
            <path
              key={`thread-${leaf.skill_id}`}
              d={bend(leaf.threadX, leaf.hubY, leaf.x - leaf.side * ARC_R, leaf.y)}
              fill="none"
              strokeWidth="1.3"
              className="stroke-ink-200"
            />
          ))}

          <circle cx={0} cy={0} r={CENTRE_R} className="fill-brand-fill" />
          <text
            x={0}
            y={-4}
            textAnchor="middle"
            className="fill-on-brand text-[22px] font-semibold tabular-nums"
          >
            {requiredMet} / {requiredTotal}
          </text>
          <text
            x={0}
            y={16}
            textAnchor="middle"
            className="fill-on-brand text-[10px] uppercase tracking-wide"
          >
            {t("atlas.requiredCaption")}
          </text>

          {hubs.map((hub) => (
            <g key={hub.category}>
              {/* A pill sized to the name: the category is written in full. */}
              <rect
                x={hub.x - hub.width / 2}
                y={hub.y - 12}
                width={hub.width}
                height={24}
                rx={12}
                strokeWidth="1"
                className="fill-brand-100 stroke-brand-300"
              />
              <text
                x={hub.x}
                y={hub.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-brand-800 text-[11px] font-semibold"
              >
                {hub.category}
              </text>
            </g>
          ))}

          {leaves.map((leaf) => (
            <Leaf
              key={leaf.skill_id}
              leaf={leaf}
              open={leaf.skill_id === openId}
              focused={leaf.skill_id === focusId}
              onToggle={() => setOpenId(leaf.skill_id === openId ? null : leaf.skill_id)}
              onFocus={() => setFocusId(leaf.skill_id)}
              onBlur={() => setFocusId((current) => (current === leaf.skill_id ? null : current))}
            />
          ))}
        </svg>

        {open && <Detail skill={open} onClose={() => setOpenId(null)} />}
      </div>

      {!open && (
        <p className="mx-auto mt-3 max-w-md text-center text-xs text-ink-500">
          {t("atlas.towards", { profession })} · {t("atlas.tapNode")}
        </p>
      )}
    </div>
  );
}

function Legend() {
  const { t } = useTranslation();

  return (
    <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
      <li className="flex items-center gap-1.5 text-[11px] text-ink-600">
        <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden>
          <circle r="6" fill="none" strokeWidth="2" className="stroke-ink-200" />
          <path d={arcPath(6, 0.65)} fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-brand-700" />
        </svg>
        {t("atlas.legend.level")}
      </li>
      <li className="flex items-center gap-1.5 text-[11px] text-ink-600">
        <span className="h-3 w-3 rounded-full border-2 border-success" aria-hidden />
        {t("atlas.legend.verified")}
      </li>
    </ul>
  );
}

/* ------------------------------------------------------------------ layout */

type Side = -1 | 1;

interface Hub {
  category: string;
  side: Side;
  x: number;
  y: number;
  width: number;
}

interface Leaf extends MapSkill {
  side: Side;
  x: number;
  y: number;
  hubY: number;
  /** Where this skill's thread leaves its category label. */
  threadX: number;
  progress: number;
  labelWidth: number;
}

/**
 * Categories go to whichever side currently carries fewer skills, largest
 * first, so the two sides stay balanced. Each side is a stack of category
 * blocks centred on the badge; each block is one row per skill.
 */
function layout(skills: MapSkill[]): {
  hubs: Hub[];
  leaves: Leaf[];
  box: { x: number; y: number; width: number; height: number };
} {
  const groups = new Map<string, MapSkill[]>();
  for (const skill of skills) {
    const list = groups.get(skill.category) ?? [];
    list.push(skill);
    groups.set(skill.category, list);
  }

  const sides: Record<Side, [string, MapSkill[]][]> = { [-1]: [], [1]: [] };
  const load: Record<Side, number> = { [-1]: 0, [1]: 0 };
  const ordered = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const entry of ordered) {
    const side: Side = load[-1] <= load[1] ? -1 : 1;
    sides[side].push(entry);
    load[side] += entry[1].length;
  }

  const hubs: Hub[] = [];
  const leaves: Leaf[] = [];

  for (const side of [-1, 1] as Side[]) {
    const blocks = sides[side];
    if (blocks.length === 0) continue;

    const widest = Math.max(...blocks.map(([category]) => pillWidth(category)));
    const hubX = side * (CENTRE_R + widest / 2 + CENTRE_GAP);
    const columnX = hubX + side * (widest / 2 + COLUMN_GAP);
    const heights = blocks.map(([, members]) => members.length * ROW);
    let top = -(heights.reduce((sum, h) => sum + h, 0) + GROUP_GAP * (blocks.length - 1)) / 2;

    blocks.forEach(([category, members], index) => {
      const height = heights[index];
      const hub: Hub = {
        category,
        side,
        x: hubX,
        y: top + height / 2,
        width: pillWidth(category),
      };
      hubs.push(hub);

      members.forEach((skill, row) => {
        leaves.push({
          ...skill,
          side,
          x: columnX,
          y: top + ROW / 2 + row * ROW,
          hubY: hub.y,
          threadX: hub.x + side * (hub.width / 2),
          progress:
            skill.required_level > 0
              ? Math.min(skill.current_level / skill.required_level, 1)
              : 1,
          labelWidth: labelWidth(skill.skill),
        });
      });

      top += height + GROUP_GAP;
    });
  }

  // Fit the canvas to what is drawn, labels included.
  let minX = -CENTRE_R;
  let maxX = CENTRE_R;
  let minY = -CENTRE_R;
  let maxY = CENTRE_R;
  for (const hub of hubs) {
    minX = Math.min(minX, hub.x - hub.width / 2);
    maxX = Math.max(maxX, hub.x + hub.width / 2);
    minY = Math.min(minY, hub.y - 14);
    maxY = Math.max(maxY, hub.y + 14);
  }
  for (const leaf of leaves) {
    const outer = leaf.x + leaf.side * leaf.labelWidth;
    const inner = leaf.x - leaf.side * (ARC_R + 4);
    minX = Math.min(minX, outer, inner);
    maxX = Math.max(maxX, outer, inner);
    minY = Math.min(minY, leaf.y - ARC_R - 4);
    maxY = Math.max(maxY, leaf.y + ARC_R + 4);
  }

  return {
    hubs,
    leaves,
    box: {
      x: minX - PAD,
      y: minY - PAD,
      width: maxX - minX + PAD * 2,
      height: maxY - minY + PAD * 2,
    },
  };
}

/** A horizontal S-bend, so the threads read as a tree rather than a web. */
function bend(x1: number, y1: number, x2: number, y2: number): string {
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

/** An arc of `share` of a full turn, starting at twelve o'clock, around (0,0). */
function arcPath(radius: number, share: number): string {
  const clamped = Math.max(0, Math.min(share, 0.9999));
  const end = clamped * Math.PI * 2 - Math.PI / 2;
  const x = Math.cos(end) * radius;
  const y = Math.sin(end) * radius;
  const large = clamped > 0.5 ? 1 : 0;
  return `M 0 ${-radius} A ${radius} ${radius} 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)}`;
}

/* ------------------------------------------------------------------- nodes */

function Leaf({
  leaf,
  open,
  focused,
  onToggle,
  onFocus,
  onBlur,
}: {
  leaf: Leaf;
  open: boolean;
  focused: boolean;
  onToggle: () => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const started = leaf.current_level > 0;
  const hitX = leaf.side < 0 ? leaf.x - leaf.labelWidth : leaf.x - ARC_R - 4;

  return (
    <g
      onClick={onToggle}
      onKeyDown={(event) => {
        // role="button" promises Enter and Space; an SVG group does not
        // provide them on its own.
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={0}
      role="button"
      aria-expanded={open}
      aria-label={`${leaf.skill}: ${leaf.current_level} / ${leaf.required_level}`}
      className="cursor-pointer outline-none"
    >
      <rect
        x={hitX}
        y={leaf.y - 14}
        width={leaf.labelWidth + ARC_R + 4}
        height="28"
        rx="14"
        fill="transparent"
      />

      {/* The focus ring, drawn: an SVG group gets no visible outline. */}
      {focused && (
        <circle
          cx={leaf.x}
          cy={leaf.y}
          r={ARC_R + 5}
          fill="none"
          strokeWidth="2"
          strokeDasharray="3 3"
          className="stroke-brand-700"
        />
      )}

      {/* The level: a track, and the share of it reached. */}
      <circle
        cx={leaf.x}
        cy={leaf.y}
        r={ARC_R}
        fill="none"
        strokeWidth="2.5"
        className={leaf.verified ? "stroke-success" : "stroke-ink-200"}
      />
      {started && !leaf.verified && (
        <path
          transform={`translate(${leaf.x} ${leaf.y})`}
          d={arcPath(ARC_R, leaf.progress)}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="stroke-brand-700"
        />
      )}

      <circle
        cx={leaf.x}
        cy={leaf.y}
        r={open ? NODE_R + 2 : NODE_R}
        strokeWidth={started ? 0 : 1.5}
        className={started ? "fill-brand-fill" : "fill-surface stroke-ink-400"}
      />

      <text
        x={leaf.x + leaf.side * (ARC_R + 7)}
        y={leaf.y + 4}
        textAnchor={leaf.side < 0 ? "end" : "start"}
        className={
          started ? "fill-ink-800 text-[11px] font-medium" : "fill-ink-500 text-[11px]"
        }
      >
        {leaf.skill}
      </text>
    </g>
  );
}

/**
 * The selected skill, over the map.
 *
 * Everything on it is a stored fact about the requirement or about the
 * account: the level asked for, the level reached, whether it is required,
 * whether somebody else verified it. Nothing is inferred.
 */
function Detail({ skill, onClose }: { skill: Leaf; onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-1 sm:p-3">
      <div className="glass-raised pointer-events-auto w-full max-w-[17rem] rounded-(--radius-card) p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{skill.skill}</p>
            <p className="truncate text-[11px] text-ink-500">{skill.category}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="-mr-1 -mt-1 rounded-md p-1 text-ink-500 hover:bg-ink-100 hover:text-ink-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[11px]">
            <span className="text-ink-500">{t("atlas.level")}</span>
            <span className="font-semibold tabular-nums text-ink-800">
              {skill.current_level} / {skill.required_level}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-700"
              style={{ width: `${Math.round(skill.progress * 100)}%` }}
            />
          </div>
        </div>

        <ul className="mt-3 space-y-1.5 text-[11px]">
          <Row
            label={t("atlas.requirement")}
            value={t(`career.requirement_${skill.requirement}`, {
              defaultValue: skill.requirement,
            })}
          />
          <Row
            label={t("skills.verified")}
            value={skill.verified ? t("common.yes") : t("common.no")}
          />
        </ul>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-2">
      <span className="text-ink-500">{label}</span>
      <span className="min-w-0 truncate font-medium text-ink-800">{value}</span>
    </li>
  );
}
