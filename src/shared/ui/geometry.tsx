/**
 * The signature geometry: girih, reinterpreted.
 *
 * Central Asian tilework is not ornament laid on a surface — it is a
 * construction. Every rosette in Samarkand and Bukhara comes out of a regular
 * star polygon, and that is the part worth borrowing: a system, not a motif.
 * So none of these shapes are drawn by hand. The star is a real {8/3} — eight
 * points on a circle, each joined to the one three steps round — and the arch
 * is a real two-centred pointed arch. Hand-drawn versions of both read as
 * decoration; the constructed ones read as a language, which is the whole
 * reason for using them.
 *
 * Nothing here is folkloric and nothing depicts a building. The inheritance is
 * geometric only: the same rules, drawn thin, cropped, and left unfinished.
 *
 * Everything strokes in `currentColor` and carries no fill, so a caller sets
 * one colour and the figure follows the theme with it.
 */

/** Vertices of a {points/step} star polygon, as an SVG points list. */
function starPoints(
  points: number,
  step: number,
  radius: number,
  phase = Math.PI / 8,
): string {
  const order: number[] = [];
  const seen = new Set<number>();
  let index = 0;
  while (!seen.has(index)) {
    seen.add(index);
    order.push(index);
    index = (index + step) % points;
  }
  return order
    .map((i) => {
      const angle = phase + (i * 2 * Math.PI) / points;
      return `${(radius * Math.cos(angle)).toFixed(2)},${(radius * Math.sin(angle)).toFixed(2)}`;
    })
    .join(" ");
}

/**
 * The rosette.
 *
 * Three concentric registers, the way a real panel is built: the {8/3} star,
 * the octagon that circumscribes it, and the small octagon at the radius where
 * the star's own straps cross — r·(√2−1), which falls out of the construction
 * rather than being chosen.
 */
export function Girih({
  size = 320,
  className,
  strokeWidth = 1,
}: {
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const r = 100;
  const inner = r * (Math.SQRT2 - 1);

  return (
    <svg
      width={size}
      height={size}
      viewBox="-110 -110 220 220"
      fill="none"
      aria-hidden
      className={className}
    >
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round">
        <polygon points={starPoints(8, 3, r)} opacity="0.85" />
        <polygon points={starPoints(8, 1, r)} opacity="0.35" />
        <polygon points={starPoints(8, 1, inner, 0)} opacity="0.55" />
        <circle r={r} opacity="0.18" />
        <circle r={inner} opacity="0.25" />
      </g>
    </svg>
  );
}

/**
 * The portal — an opening, which is what an opportunity is.
 *
 * A two-centred pointed arch: each side is an arc whose radius equals the full
 * span and whose centre sits at the opposite springing point. That is the
 * construction, so the apex lands where the two circles cross rather than
 * wherever a curve handle was dragged to.
 *
 * `span` here is the HALF-span — the path runs from -span to +span — so the
 * apex sits at span·√3. The viewBox used to be sized from span·√3/2, which is
 * the apex height for a *full* span of that width, and the top 44% of the
 * outer arch was clipped off in every drawing. It read as two curves hanging
 * in a corner, which is exactly what it was.
 */
export function Portal({
  size = 260,
  rings = 3,
  className,
  strokeWidth = 1,
}: {
  size?: number;
  /** Nested arches, each stepped inward. */
  rings?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const span = 100;
  //: The apex of the outermost ring, which is what the box has to contain.
  const height = span * Math.sqrt(3);

  return (
    <svg
      width={size}
      height={(size * (height + 20)) / (span * 2)}
      viewBox={`-${span + 6} -${height + 10} ${span * 2 + 12} ${height + 20}`}
      fill="none"
      aria-hidden
      className={className}
    >
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
        {Array.from({ length: rings }, (_, ring) => {
          const scale = 1 - ring * (0.9 / rings);
          const half = span * scale;
          const apex = -(half * Math.sqrt(3));
          return (
            <path
              key={ring}
              d={`M ${-half} 0 A ${half * 2} ${half * 2} 0 0 1 0 ${apex.toFixed(2)} A ${half * 2} ${half * 2} 0 0 1 ${half} 0`}
              opacity={(0.8 - ring * 0.22).toFixed(2)}
            />
          );
        })}
      </g>
    </svg>
  );
}


/**
 * A field of octagons, fading out.
 *
 * Texture rather than subject: it gives a large empty area something to be
 * made of, which is what keeps negative space from reading as an unfinished
 * page. Rendered once and tiled by the browser.
 */
export function Lattice({ className }: { className?: string }) {
  const cell = 72;
  const r = cell * 0.3;

  return (
    <svg className={className} aria-hidden>
      <defs>
        <pattern id="yk-lattice" width={cell} height={cell} patternUnits="userSpaceOnUse">
          <g stroke="currentColor" strokeWidth="0.7" fill="none">
            <polygon
              points={starPoints(8, 1, r)}
              transform={`translate(${cell / 2} ${cell / 2})`}
            />
            <polygon
              points={starPoints(8, 1, r)}
              transform={`translate(0 0)`}
            />
            <polygon
              points={starPoints(8, 1, r)}
              transform={`translate(${cell} ${cell})`}
            />
          </g>
        </pattern>
        <linearGradient id="yk-lattice-fade" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="55%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <mask id="yk-lattice-mask">
          <rect width="100%" height="100%" fill="url(#yk-lattice-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#yk-lattice)" mask="url(#yk-lattice-mask)" />
    </svg>
  );
}

/**
 * The ecosystem: potential at the centre, five stages around it.
 *
 * Drawn rather than generated. The five areas carry names that have to be
 * translated and read by a screen reader, and an image model turns type into
 * decoration that only looks like language. Everything here is real text on a
 * real path, in three languages, at any size.
 *
 * The stages sit on an ellipse, 72° apart starting at the top, because five
 * equal parts of a whole is what the product actually claims — not a row of
 * boxes, and not a hierarchy. Each label anchors away from the centre, so the
 * left-hand ones do not run back across the drawing.
 */
export function Ecosystem({
  stages,
  className,
}: {
  stages: { key: string; title: string; caption: string }[];
  className?: string;
}) {
  const RX = 300;
  const RY = 186;
  const width = 900;
  const height = 520;
  const cx = width / 2;
  const cy = height / 2;

  const placed = stages.map((stage, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / stages.length;
    const x = cx + RX * Math.cos(angle);
    const y = cy + RY * Math.sin(angle);
    const dx = Math.cos(angle);
    return {
      ...stage,
      x,
      y,
      anchor: (Math.abs(dx) < 0.2 ? "middle" : dx > 0 ? "start" : "end") as "middle" | "start" | "end",
      // Push the text clear of its own node, in the direction it sits.
      tx: x + (Math.abs(dx) < 0.2 ? 0 : dx > 0 ? 26 : -26),
      ty: y + (Math.abs(dx) < 0.2 ? (Math.sin(angle) < 0 ? -30 : 40) : 0),
    };
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      fill="none"
      role="img"
      aria-label={stages.map((stage) => stage.title).join(", ")}
    >
      <defs>
        {/* The glow the brief asks for, kept as one soft pass rather than a
            stack of blurs — anything heavier turns into a haze at this size. */}
        <filter id="yk-eco-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {placed.map((stage) => (
        <line
          key={`link-${stage.key}`}
          x1={cx}
          y1={cy}
          x2={stage.x}
          y2={stage.y}
          stroke="currentColor"
          strokeWidth="1.2"
          opacity="0.34"
        />
      ))}

      {/* The centre: potential itself, drawn as the rosette the whole visual
          language is built on. */}
      <g transform={`translate(${cx} ${cy}) scale(0.62)`} opacity="0.9">
        <polygon points={starPoints(8, 3, 100)} stroke="currentColor" strokeWidth="1.6" opacity="0.9" />
        <polygon points={starPoints(8, 1, 100)} stroke="currentColor" strokeWidth="1.1" opacity="0.4" />
        <circle r={100 * (Math.SQRT2 - 1)} stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      </g>
      <circle cx={cx} cy={cy} r="5" fill="currentColor" filter="url(#yk-eco-glow)" />

      {placed.map((stage) => (
        <g key={stage.key}>
          <circle
            cx={stage.x}
            cy={stage.y}
            r="15"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.35"
          />
          <circle
            cx={stage.x}
            cy={stage.y}
            r="7"
            fill="currentColor"
            filter="url(#yk-eco-glow)"
          />
          <text
            x={stage.tx}
            y={stage.ty}
            textAnchor={stage.anchor}
            fill="currentColor"
            className="text-[12px] font-semibold uppercase tracking-[0.12em]"
          >
            {stage.title}
          </text>
          <text
            x={stage.tx}
            y={stage.ty + 17}
            textAnchor={stage.anchor}
            fill="currentColor"
            opacity="0.62"
            className="text-[11px]"
          >
            {stage.caption}
          </text>
        </g>
      ))}
    </svg>
  );
}
