import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { SkillGapEntry } from "@/shared/types/api";

import "@/shared/styles/deep.css";

/**
 * The skills map: profession at the centre, categories around it, skills
 * around those.
 *
 * The three levels are not decoration — they are how the requirement is
 * actually organised, and grouping by category is what lets someone see "my
 * gap is all in one area" rather than reading eight labels one at a time.
 *
 * Distance from the hub carries the gap. A skill sitting close to its category
 * is at the level the profession asks for; one pushed out to the rim has not
 * been started. That way the picture is readable at a glance and true at the
 * same time, instead of being a pretty arrangement of equal dots.
 */

export interface MapSkill extends SkillGapEntry {
  state: "met" | "partial" | "missing";
}

const CENTRE = { x: 470, y: 300 };
const HUB_RADIUS = { x: 250, y: 165 };
const LEAF = { near: 62, far: 128 };

export function SkillsMap({
  profession,
  readiness,
  skills,
}: {
  profession: string;
  readiness: number;
  skills: MapSkill[];
}) {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);

  const { hubs, leaves } = layout(skills);
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

      <div className="relative">
        <svg
          viewBox="0 0 940 600"
          className="mx-auto mt-2 block w-full max-w-4xl"
          role="img"
          aria-label={t("atlas.mapTitle")}
        >
          {/* Hub spokes first, so every node paints over its own thread. */}
          {hubs.map((hub) => (
            <path
              key={`spoke-${hub.category}`}
              d={curve(CENTRE.x, CENTRE.y, hub.x, hub.y)}
              fill="none"
              strokeWidth="2"
              className="stroke-brand-300"
            />
          ))}
          {leaves.map((leaf) => (
            <path
              key={`thread-${leaf.skill_id}`}
              d={curve(leaf.hubX, leaf.hubY, leaf.x, leaf.y)}
              fill="none"
              strokeWidth={leaf.state === "missing" ? 1 : 1.6}
              className={leaf.state === "missing" ? "stroke-ink-200" : "stroke-brand-300"}
            />
          ))}

          <circle cx={CENTRE.x} cy={CENTRE.y} r="52" className="fill-brand-600" />
          <text
            x={CENTRE.x}
            y={CENTRE.y - 7}
            textAnchor="middle"
            className="fill-on-colour text-xl font-semibold tabular-nums"
          >
            {readiness}%
          </text>
          <text
            x={CENTRE.x}
            y={CENTRE.y + 14}
            textAnchor="middle"
            className="fill-on-colour text-[9px] uppercase tracking-wide opacity-80"
          >
            {t("atlas.readiness")}
          </text>

          {hubs.map((hub) => (
            <g key={hub.category}>
              <circle cx={hub.x} cy={hub.y} r="30" className="fill-brand-100" />
              <text
                x={hub.x}
                y={hub.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-brand-800 text-[9px] font-semibold"
              >
                {short(hub.category)}
              </text>
            </g>
          ))}

          {leaves.map((leaf) => (
            <Leaf
              key={leaf.skill_id}
              leaf={leaf}
              open={leaf.skill_id === openId}
              onOpen={() => setOpenId(leaf.skill_id === openId ? null : leaf.skill_id)}
            />
          ))}
        </svg>

        {open && <Detail skill={open} onClose={() => setOpenId(null)} />}
      </div>

      {!open && (
        <p className="mx-auto max-w-md text-center text-xs text-ink-500">
          {t("atlas.towards", { profession })} · {t("atlas.tapNode")}
        </p>
      )}
    </div>
  );
}

function Legend() {
  const { t } = useTranslation();
  const items = [
    { key: "met", mark: "h-2.5 w-2.5 rounded-full bg-accent" },
    { key: "partial", mark: "h-2.5 w-2.5 rounded-full bg-brand-500" },
    { key: "missing", mark: "h-2.5 w-2.5 rounded-full border-2 border-ink-300 bg-surface" },
    { key: "verified", mark: "h-2.5 w-2.5 rounded-full border-2 border-success" },
  ];

  return (
    <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5 text-[11px] text-ink-600">
          <span className={item.mark} />
          {t(`atlas.legend.${item.key}`)}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ layout */

interface Hub {
  category: string;
  x: number;
  y: number;
}

interface Leaf extends MapSkill {
  x: number;
  y: number;
  hubX: number;
  hubY: number;
  onLeft: boolean;
}

/**
 * Categories get a slice of the circle proportional to how many skills they
 * hold, so a category with six is not squeezed into the same arc as one with
 * a single skill. A lone category sits at the top rather than on the centre.
 */
function layout(skills: MapSkill[]): { hubs: Hub[]; leaves: Leaf[] } {
  const groups = new Map<string, MapSkill[]>();
  for (const skill of skills) {
    const list = groups.get(skill.category) ?? [];
    list.push(skill);
    groups.set(skill.category, list);
  }

  const total = skills.length || 1;
  const hubs: Hub[] = [];
  const leaves: Leaf[] = [];
  let consumed = 0;

  for (const [category, members] of groups) {
    const share = members.length / total;
    const mid = (consumed + share / 2) * Math.PI * 2 - Math.PI / 2;
    consumed += share;

    const hub: Hub = {
      category,
      x: CENTRE.x + Math.cos(mid) * HUB_RADIUS.x,
      y: CENTRE.y + Math.sin(mid) * HUB_RADIUS.y,
    };
    hubs.push(hub);

    // Fan the members around their hub, pointing away from the centre.
    const spread = Math.min(share * Math.PI * 2, Math.PI * 1.5);
    members.forEach((skill, index) => {
      const offset =
        members.length === 1
          ? 0
          : (index / (members.length - 1) - 0.5) * spread;
      const angle = mid + offset;
      const closeness =
        skill.required_level > 0
          ? Math.min(skill.current_level / skill.required_level, 1)
          : 1;
      const distance = LEAF.far - (LEAF.far - LEAF.near) * closeness;

      leaves.push({
        ...skill,
        hubX: hub.x,
        hubY: hub.y,
        x: hub.x + Math.cos(angle) * distance * 1.25,
        y: hub.y + Math.sin(angle) * distance,
        onLeft: Math.cos(angle) < 0,
      });
    });
  }

  return { hubs, leaves };
}

/** A soft bend, so the map reads as threads rather than a starburst. */
function curve(x1: number, y1: number, x2: number, y2: number): string {
  const cx = (x1 + x2) / 2 + (y2 - y1) * 0.14;
  const cy = (y1 + y2) / 2 - (x2 - x1) * 0.14;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

function short(category: string): string {
  return category.length > 12 ? `${category.slice(0, 11)}…` : category;
}

/* ------------------------------------------------------------------- nodes */

function Leaf({
  leaf,
  open,
  onOpen,
}: {
  leaf: Leaf;
  open: boolean;
  onOpen: () => void;
}) {
  const size = leaf.state === "missing" ? 7 : 9;
  // A 7px circle is a poor target, and the gap between it and its label was
  // dead space. One transparent box over the node and its text makes the whole
  // chip clickable — which is what it looks like anyway.
  const labelWidth = leaf.skill.length * 6.2 + size * 2 + 14;
  const hitX = leaf.onLeft ? leaf.x - labelWidth + size + 4 : leaf.x - size - 4;

  return (
    <g onClick={onOpen} tabIndex={0} role="button" className="cursor-pointer outline-none">
      <rect
        x={hitX}
        y={leaf.y - 12}
        width={labelWidth}
        height="24"
        rx="12"
        fill="transparent"
      />
      {/* The ring is verification: someone else produced the evidence. */}
      {leaf.verified && (
        <circle
          cx={leaf.x}
          cy={leaf.y}
          r={size + 5}
          fill="none"
          strokeWidth="2"
          className="stroke-success"
        />
      )}
      <circle
        cx={leaf.x}
        cy={leaf.y}
        r={open ? size + 3 : size}
        strokeWidth="2"
        className={
          leaf.state === "missing"
            ? "fill-surface stroke-ink-300"
            : leaf.state === "met"
              ? "fill-accent stroke-accent"
              : "fill-brand-500 stroke-brand-500"
        }
      />
      <text
        x={leaf.x + (leaf.onLeft ? -(size + 7) : size + 7)}
        y={leaf.y + 4}
        textAnchor={leaf.onLeft ? "end" : "start"}
        className={
          leaf.state === "missing"
            ? "fill-ink-500 text-[11px]"
            : "fill-ink-800 text-[11px] font-medium"
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
 * account: the level asked for, the level reached, whether somebody else
 * verified it. Nothing is inferred.
 */
function Detail({ skill, onClose }: { skill: Leaf; onClose: () => void }) {
  const { t } = useTranslation();
  const progress =
    skill.required_level > 0
      ? Math.min((skill.current_level / skill.required_level) * 100, 100)
      : 100;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-1 sm:p-3">
      <div className="pointer-events-auto w-full max-w-[17rem] rounded-(--radius-card) border border-ink-200 bg-surface p-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">{skill.skill}</p>
            <p className="truncate text-[11px] text-ink-500">{skill.category}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="-mr-1 -mt-1 rounded-md p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
              className={
                skill.state === "met"
                  ? "h-full rounded-full bg-accent"
                  : "h-full rounded-full bg-brand-500"
              }
              style={{ width: `${progress}%` }}
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
          <Row label={t("atlas.status")} value={t(`atlas.legend.${skill.state}`)} />
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
