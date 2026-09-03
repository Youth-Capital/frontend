/**
 * The mark: three round-topped arches on one baseline, each taller than the last.
 *
 * Built to the approved board (`design/logo/2-rising.png`), measured off it
 * rather than reinterpreted. Two earlier deviations are the reason this file
 * was rewritten: the arches had been drawn with the site's pointed
 * two-centred profile, and their widths grew as fast as their heights. Both
 * were defensible on their own and both made the mark stop looking like the
 * thing that was signed off.
 *
 * What the board actually does:
 *
 *   - the top of each arch is a plain semicircle, radius = half the width;
 *   - widths barely grow — 1 : 1.08 : 1.32 — so the rise reads as height,
 *     not as three shapes fanning out;
 *   - heights step 1 : 1.72 : 2.38;
 *   - the gaps are tight, about a fifth of an arch's width;
 *   - one baseline runs under all three at the same stroke weight;
 *   - the first arch is filled, the two behind it are open.
 *
 * They stand on one line — everybody starts from the same ground — and they
 * rise. One span crossed, two still ahead.
 *
 * The whole mark is one colour. The board painted the leading arch amber and
 * that shipped for a while; it is now the mark's own colour, filled. The
 * difference between crossed and ahead is carried by fill against outline —
 * by form — and form needs no contrast solving, so the mark reads the same on
 * every ground it is dropped on: the role tiles in the sidebar, the dim band
 * on the auth panel, the brand-100 avatar in the chat. A second hue would have
 * had to be measured against each of those separately.
 */

const BOX = 100;

/** The shared ground, and the weight everything is drawn at. */
const BASE_Y = 88;
const STROKE = 6;

/**
 * Centre, half-width and the height of the top above the baseline.
 *
 * Widths 22 / 24 / 29 with 5 between them, heights 32 / 55 / 76: the board's
 * own ratios, scaled into the box with room for the stroke on every side.
 */
const ARCHES = [
  { cx: 18.5, half: 11, height: 32 },
  { cx: 46.5, half: 12, height: 55 },
  { cx: 78, half: 14.5, height: 76 },
] as const;

/**
 * Legs up from the baseline, a semicircle over the top, then back down.
 *
 * Closed, so the leading arch can be filled — the fill is what survives at
 * 18px, where an outline of this weight starts to close up.
 */
function archPath(cx: number, half: number, height: number) {
  //: The semicircle's centre sits one radius below the top of the arch.
  const springing = BASE_Y - height + half;

  return (
    `M ${cx - half} ${BASE_Y} ` +
    `V ${springing} ` +
    `A ${half} ${half} 0 0 1 ${cx + half} ${springing} ` +
    `V ${BASE_Y} Z`
  );
}

export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
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
        {/* The ground, run between the outermost legs so the caps line up. */}
        <path
          d={`M ${ARCHES[0].cx - ARCHES[0].half} ${BASE_Y} H ${
            ARCHES[2].cx + ARCHES[2].half
          }`}
        />

        {/* Crossed. */}
        <path d={archPath(first.cx, first.half, first.height)} fill="currentColor" />

        {/* Still ahead. */}
        {rest.map((arch) => (
          <path key={arch.cx} d={archPath(arch.cx, arch.half, arch.height)} />
        ))}
      </g>
    </svg>
  );
}

/**
 * The mark in its tile, as it appears in a header.
 *
 * The tile is the board's brand violet, written as a literal rather than taken
 * from `brand-600`: that ramp inverts under `[data-theme="dark"]` and the tile
 * would turn pale lilac while the mark stayed white, taking the whole thing to
 * 2.34:1 — under the 3:1 a mark answers to. A brand ground is not a step on a
 * ramp; it holds its value the way a cover does.
 *
 * White on that ground measures 6.38:1, the same in both themes.
 */
const TILE_BG = "#6C4AB6";
const TILE_INK = "#FFFFFF";

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
      <LogoMark size={Math.round(size * 0.72)} />
    </span>
  );
}
