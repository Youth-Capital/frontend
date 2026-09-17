import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Lattice } from "@/shared/ui/geometry";

import "@/shared/styles/deep.css";
import { LogoMark } from "@/shared/ui/Logo";

/**
 * The left half of the sign-in screen: a bridge, and what it crosses.
 *
 * The bridge is the metaphor the product actually needs. A portal says "an
 * entrance"; a bridge says there is a gap between studying and working and
 * something has to carry you over it — which is the whole claim being made
 * here. The strip along the bottom names the two banks and the crossing, so
 * the picture is read the way it is meant rather than left as atmosphere.
 *
 * The artwork keeps to the right and fades into the panel colour on the left.
 * Where a card does reach over the picture it carries its own ground: the
 * bridge runs to pure white at the horizon, and measured against that the
 * muted body text only clears 4.5:1 once the card is at least 90% of the band
 * colour. They are set at 92%, which holds 4.65:1 at the very brightest pixel
 * and better than 6:1 everywhere else — so no card depends on the image
 * happening to be dark beneath it.
 */

/*
 * The lights along the deck live in the artwork, not in the markup.
 *
 * Floating them as elements was tried and abandoned: the picture is cropped
 * differently at every panel width, so icons positioned by percentage drift
 * off the bridge and end up scattered over the sky — the same "pasted on"
 * fault as before, only harder to see coming. What answers to the pointer
 * here is what is genuinely anchored to the layout: these rows, and the three
 * stages along the bottom.
 */
const STEPS = [
  { key: "career.step.current", icon: <TargetIcon /> },
  { key: "career.step.missing", icon: <PuzzleIcon /> },
  { key: "career.step.learn", icon: <BookIcon /> },
  { key: "career.step.verify", icon: <CheckDocIcon /> },
  { key: "career.step.practice", icon: <CaseIcon /> },
  { key: "career.step.apply", icon: <PersonIcon /> },
];

export function AuthPanel({ registering }: { registering: boolean }) {
  const { t } = useTranslation();

  return (
    <aside className="deep hidden overflow-hidden px-8 py-8 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col xl:px-10">
      <img
        src="/illustrations/auth-bridge.webp"
        alt=""
        className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-bottom"
      />
      {/*
        The scrim runs from the top-left corner down to the far bank: solid
        under the copy, clear over the span. It is a gradient rather than a
        panel so there is no edge anywhere — the words sit in the same
        environment as the bridge, not in a box on top of it.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(152deg, var(--band) 0%, var(--band) 30%, color-mix(in oklab, var(--band) 58%, transparent) 54%, transparent 82%)",
        }}
      />
      <Lattice className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.1]" />


      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklab, var(--band-dim) 34%, transparent)" }}
          >
            <LogoMark size={26} />
          </span>
          <p className="font-semibold leading-tight">{t("app.name")}</p>
        </div>

        <p
          className="hidden max-w-44 rounded-2xl px-3.5 py-2.5 text-xs leading-snug xl:block"
          style={{
            background: "color-mix(in oklab, var(--band) 92%, transparent)",
            border: "1px solid color-mix(in oklab, var(--band-dim) 40%, transparent)",
            color: "var(--band-muted)",
          }}
        >
          <SparkIcon />
          <span className="ml-1.5 align-middle">{t("auth.portalCaption")}</span>
        </p>
      </header>

      <div className="relative mt-auto max-w-[17.5rem] xl:max-w-[19rem]">
        <Headline text={t(registering ? "auth.panelRegisterTitle" : "auth.panelLoginTitle")} />
        <p className="mt-2.5 text-[13px] leading-snug" style={{ color: "var(--band-muted)" }}>
          {t(registering ? "auth.panelRegisterLead" : "auth.panelLoginLead")}
        </p>

        <ol className="mt-5 flex flex-col gap-1">
          {STEPS.map((step, index) => (
            <li
              key={step.key}
              className="group flex cursor-default items-center gap-2.5 rounded-lg px-2 py-1.5 transition-[transform,border-color] duration-300 hover:translate-x-1"
              style={{
                background: "color-mix(in oklab, var(--band) 92%, transparent)",
                border: "1px solid color-mix(in oklab, var(--band-dim) 18%, transparent)",
              }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums transition-shadow duration-300 group-hover:shadow-[0_0_14px_var(--band-accent)]"
                style={{ background: "var(--band-accent)", color: "var(--band-on-accent)" }}
              >
                {index + 1}
              </span>
              <span
                className="shrink-0 transition-colors duration-300 group-hover:text-[var(--band-ink)]"
                style={{ color: "var(--band-muted)" }}
              >
                {step.icon}
              </span>
              <span className="truncate text-[13px]">{t(step.key)}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* The two banks and the crossing, named. */}
      <div
        className="mt-auto flex items-start gap-3 rounded-2xl px-4 py-3.5"
        style={{
          background: "color-mix(in oklab, var(--band) 92%, transparent)",
          border: "1px solid color-mix(in oklab, var(--band-dim) 32%, transparent)",
        }}
      >
        <Arc icon={<CapIcon />} title={t("auth.arcStudy.title")} body={t("auth.arcStudy.body")} />
        <Connector />
        <Arc icon={<BridgeIcon />} title={t("auth.arcBridge.title")} body={t("auth.arcBridge.body")} highlight />
        <Connector />
        <Arc icon={<CaseIcon />} title={t("auth.arcCareer.title")} body={t("auth.arcCareer.body")} />
      </div>
    </aside>
  );
}

/**
 * The headline, with its last word carried in lavender.
 *
 * Split on the final word rather than on a hard-coded string, so it works in
 * all three languages without a second translation key for the same sentence.
 */
function Headline({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop() ?? "";

  return (
    <h1 className="font-display text-[1.75rem] font-semibold leading-[1.1] xl:text-3xl">
      {words.join(" ")}{" "}
      <span style={{ color: "var(--band-muted)" }}>{last}</span>
    </h1>
  );
}

function Arc({
  icon,
  title,
  body,
  highlight = false,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  highlight?: boolean;
}) {
  return (
    <div className="group flex min-w-0 flex-1 cursor-default flex-col gap-1.5">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full transition-[transform,box-shadow] duration-300 group-hover:scale-110"
        style={
          highlight
            ? {
                background: "var(--band-accent)",
                color: "var(--band-on-accent)",
                boxShadow: "0 0 18px color-mix(in oklab, var(--band-accent) 45%, transparent)",
              }
            : {
                background: "color-mix(in oklab, var(--band-dim) 30%, transparent)",
                color: "var(--band-ink)",
              }
        }
      >
        {icon}
      </span>
      <p className="truncate text-xs font-semibold">{title}</p>
      <p className="text-[11px] leading-snug" style={{ color: "var(--band-muted)" }}>
        {body}
      </p>
    </div>
  );
}

/** A dotted run between two stages: the eye is meant to travel, not stop. */
function Connector() {
  return (
    <span aria-hidden className="mt-4 hidden shrink-0 items-center gap-1 xl:flex">
      <span
        className="h-px w-6"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--band-dim) 0 2px, transparent 2px 5px)",
        }}
      />
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 12h13M13 7l5 5-5 5" stroke="var(--band-dim)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ glyphs */

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

function TargetIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8" {...stroke} />
      <circle cx="12" cy="12" r="3" {...stroke} />
    </svg>
  );
}

function PuzzleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M10 4h4v3a2 2 0 1 0 3 3h3v4h-3a2 2 0 1 0-3 3v3h-4v-3a2 2 0 1 0-3-3H4v-4h3a2 2 0 1 0 3-3V4Z"
        {...stroke}
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5v-14Z" {...stroke} />
      <path d="M12 4v14" {...stroke} />
    </svg>
  );
}

function CheckDocIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 3h8l4 4v14H6V3Z" {...stroke} />
      <path d="M9 13l2 2 4-4" {...stroke} />
    </svg>
  );
}

function CaseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="7" width="18" height="13" rx="2" {...stroke} />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" {...stroke} />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="8" r="3.5" {...stroke} />
      <path d="M5 20a7 7 0 0 1 14 0" {...stroke} />
    </svg>
  );
}

function CapIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 4 2 9l10 5 10-5-10-5Z" {...stroke} />
      <path d="M6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" {...stroke} />
    </svg>
  );
}

/** The crossing itself: a deck on arches. */
function BridgeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path d="M2 12h20" {...stroke} />
      <path d="M4 12v7M20 12v7" {...stroke} />
      <path d="M4 12a8 8 0 0 1 16 0" {...stroke} />
      <path d="M9 19v-3.5M15 19v-3.5" {...stroke} />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden className="inline align-middle">
      <path
        d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"
        fill="currentColor"
      />
    </svg>
  );
}
