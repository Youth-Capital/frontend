import { useTranslation } from "react-i18next";

/**
 * The five stages, lit on one line.
 *
 * This is the third attempt at this row, and the first two failed the same
 * way: floated over the artwork, the labels measured 1.9:1 against the lit
 * part of the picture and the white icons 1.0 — white on white. Positioning
 * them into a dark patch only works at the width you happened to check,
 * because the picture crops differently at every size.
 *
 * So the row brings its own darkness with it. A soft band sits behind the
 * whole strip and fades out top and bottom, leaving no edge, and each node is
 * a filled disc rather than an outline. The contrast is then a property of
 * the markup: whatever the road is doing underneath, the ground beneath the
 * type is known.
 */

const STAGES = [
  { key: "discover", icon: <CompassIcon /> },
  { key: "learn", icon: <BookIcon /> },
  { key: "build", icon: <ToolsIcon /> },
  { key: "experience", icon: <SparkIcon /> },
  { key: "opportunities", icon: <DoorIcon /> },
];

export function StagePath() {
  const { t } = useTranslation();

  return (
    <div className="relative w-full max-w-2xl py-6">
      {/* The band that makes the ground knowable. Fades at both ends so it
          reads as light falling on the road, not as a panel laid over it. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-[-9rem] inset-y-[-3rem] -z-10"
        style={{
          // The gradient has to reach nothing well inside its own box. The
          // first attempt still carried opacity at the edges, and the element
          // bounds cut it off — drawing exactly the rectangle this technique
          // exists to avoid.
          background:
            "radial-gradient(70% 68% at 50% 50%, color-mix(in oklab, var(--band) 96%, transparent) 0%, color-mix(in oklab, var(--band) 88%, transparent) 46%, color-mix(in oklab, var(--band) 40%, transparent) 70%, transparent 88%)",
        }}
      />

      <ol className="relative flex items-start justify-between gap-1">
        {/* The lit line joining them, held back from the outer two so it does
            not run off into nothing. */}
        <span
          aria-hidden
          className="absolute top-6 h-px"
          style={{
            left: `${50 / STAGES.length}%`,
            right: `${50 / STAGES.length}%`,
            background:
              "linear-gradient(90deg, transparent, var(--band-muted) 10%, var(--band-ink) 50%, var(--band-muted) 90%, transparent)",
            boxShadow: "0 0 14px color-mix(in oklab, var(--band-muted) 70%, transparent)",
          }}
        />

        {STAGES.map((stage) => (
          <li
            key={stage.key}
            className="group flex min-w-0 flex-1 cursor-default flex-col items-center gap-2.5 text-center"
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full transition-[transform,box-shadow] duration-300 group-hover:scale-110"
              style={{
                // Opaque, not translucent: the disc is the icon's ground.
                background: "var(--band)",
                border: "1px solid color-mix(in oklab, var(--band-muted) 60%, transparent)",
                color: "var(--band-ink)",
                boxShadow:
                  "0 0 20px color-mix(in oklab, var(--band-muted) 45%, transparent), inset 0 0 12px color-mix(in oklab, var(--band-dim) 25%, transparent)",
              }}
            >
              {stage.icon}
            </span>

            <span className="text-[11px] font-semibold uppercase tracking-[0.09em] leading-tight">
              {t(`landing.stage.${stage.key}.title`)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ glyphs */

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

/** Discover: finding a direction. */
function CompassIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9" {...stroke} />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2Z" {...stroke} />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5v-14Z" {...stroke} />
      <path d="M8 8h7M8 11.5h5" {...stroke} />
    </svg>
  );
}

/** Build skills: something made, not something read. */
function ToolsIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M14.5 5.5a3.5 3.5 0 0 0 4.6 4.6L21 12l-9 9-3-3 9-9-1.9-1.9a3.5 3.5 0 0 0-1.6-1.6Z"
        {...stroke}
      />
      <path d="M6 18l-2 2" {...stroke} />
    </svg>
  );
}

/** Experience: proof that something happened. */
function SparkIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3l2 6.2 6.2 2-6.2 2-2 6.2-2-6.2L3.8 11.2l6.2-2L12 3Z" {...stroke} />
    </svg>
  );
}

/** Opportunity: an opening. */
function DoorIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden>
      <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" {...stroke} />
      <path d="M4 21h16" {...stroke} />
      <circle cx="14.5" cy="12.5" r="1" fill="currentColor" />
    </svg>
  );
}
