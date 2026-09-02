/**
 * The mark: three pointed arches on one baseline, each taller than the last.
 *
 * The previous mark was a single bridge — one deck, one arch, two piers. The
 * metaphor was right and the drawing was wrong: at the 23px the sidebar gives
 * it, four separate strokes closed up and the whole thing read as a letter A.
 * A mark that has to be explained at its most common size is not working.
 *
 * Three arches say the same thing the bridge was trying to say, and say it at
 * 18px. They stand on one baseline — everybody starts from the same ground —
 * and they rise. The first is solid, the two behind it are open: one span
 * crossed, two still ahead.
 *
 * Both dimensions grow, span as well as height. That is not decoration: three
 * shapes of equal width at increasing heights is a bar chart, and this is not
 * an analytics product.
 *
 * The arch profile is the site's own construction (see `geometry.tsx`):
 * two-centred, each side an arc whose radius equals the full span with its
 * centre at the opposite springing point, so the apex lands at half·√3 above
 * the springing rather than wherever a curve handle was dragged to. A round
 * top would be anybody's icon.
 */

const BOX = 100;

/** The shared ground, and the strokes that stand on it. */
const BASE_Y = 88;
const STROKE = 8;

/**
 * One arch per element: half-span, and the height of its apex above the box's
 * top edge. The legs make up whatever the arch itself does not reach, which is
 * why the apex is given rather than derived — the rise is the design decision;
 * the curve is the construction.
 */
const ARCHES = [
  { cx: 13, half: 7.5, apexY: 58 },
  { cx: 44, half: 10.5, apexY: 39 },
  { cx: 81, half: 13.5, apexY: 20 },
] as const;

/** Where the arch springs from, so that its apex lands where we asked. */
function springingY(half: number, apexY: number) {
  return apexY + half * Math.sqrt(3);
}

/**
 * Legs up from the baseline, then the pointed arch, then back down. Closed, so
 * the leading shape can be filled — the fill is what survives at 18px.
 */
function archPath(cx: number, half: number, apexY: number) {
  const y = springingY(half, apexY).toFixed(2);
  const r = half * 2;
  return (
    `M ${cx - half} ${BASE_Y} V ${y} ` +
    `A ${r} ${r} 0 0 1 ${cx} ${apexY} ` +
    `A ${r} ${r} 0 0 1 ${cx + half} ${y} ` +
    `V ${BASE_Y} Z`
  );
}

export function LogoMark({
  size = 32,
  accent,
  className,
}: {
  size?: number;
  /**
   * Colour of the leading arch. Defaults to the mark's own colour, because the
   * mark is dropped on grounds this component cannot see — role tiles in the
   * sidebar, a dim band on the auth panel, a brand-100 avatar in the chat. A
   * second hue would have to be solved against every one of them. Only the
   * lockup below, which owns its background, passes anything here.
   */
  accent?: string;
  className?: string;
}) {
  const [first, ...rest] = ARCHES;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${BOX} ${BOX}`}
      fill="none"
      aria-hidden
      className={className}
    >
      <g
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* The ground, run between the outermost legs so the caps align. */}
        <path
          d={`M ${ARCHES[0].cx - ARCHES[0].half} ${BASE_Y} H ${
            ARCHES[2].cx + ARCHES[2].half
          }`}
        />

        {/* Crossed: filled, and filled is what stays visible when the strokes
            of the other two start to close up. */}
        <path
          d={archPath(first.cx, first.half, first.apexY)}
          fill={accent ?? "currentColor"}
          stroke={accent ?? "currentColor"}
        />

        {/* Still ahead: open. */}
        {rest.map((arch) => (
          <path key={arch.cx} d={archPath(arch.cx, arch.half, arch.apexY)} />
        ))}
      </g>
    </svg>
  );
}

/**
 * The mark in its tile, as it appears in a header.
 *
 * The tile is `--color-deep`, which is the one violet that holds its value in
 * both themes. `brand-600` does not: the ramp inverts under `[data-theme]` and
 * the tile turns pale lilac, which would leave an amber arch at 1.37:1 on it —
 * the leading arch, the one carrying the meaning, would be the first thing to
 * disappear. On `--color-deep` the numbers hold in both themes: white 10.5:1,
 * amber 6.98:1. Both are literals for the same reason the ground is.
 */
const TILE_BG = "var(--color-deep)";
const TILE_INK = "#F1F0F3";
const TILE_ACCENT = "#FFB86B";

export function Logo({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={[
        "flex shrink-0 items-center justify-center rounded-xl",
        className ?? "",
      ].join(" ")}
      style={{ width: size, height: size, background: TILE_BG, color: TILE_INK }}
    >
      <LogoMark size={Math.round(size * 0.72)} accent={TILE_ACCENT} />
    </span>
  );
}
