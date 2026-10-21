import type { ReactNode } from "react";

/**
 * The pictures on the landing's two flashcard decks — students and employers.
 *
 * Drawn as inline SVG rather than shipped as images, for three reasons: every
 * colour below is a theme token, so each drawing follows light and dark on its
 * own; they stay sharp at any width the deck lays a card out at; and six of
 * them weigh less than one photograph.
 *
 * Style follows the hero: luminous violet line work with one warm accent per
 * card, on the card's own ground. Three colour roles, all set in deck.css and
 * measured there:
 *
 *   --art-line  the drawing itself     5.6:1 light · 6.5:1 dark · 7.0:1 on card 01
 *   --art-hot   one accent per card    3.7:1 light · 11.7:1 dark · 3.0:1 on card 01
 *   --art-soft  fills and halos        the line at low alpha — never on its own
 *
 * Each card also has one small movement, played when the card is hovered or
 * focused: the needle finds the arch, the bridge finishes, the tick draws, the
 * best candidate's bar grows, the invitation goes out. The
 * point is a reason to touch the next card too. The classes are named for the
 * part that moves, and the motion lives in deck.css, where the global
 * reduced-motion rule turns it off for anyone who asked.
 *
 * Decorative: the card's own text says everything, so every drawing is
 * aria-hidden and has no title.
 */

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 160 112"
      className="yc-deck-art"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="var(--art-line)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** A few points of light, the way the hero scatters them. */
function Sparks({ points }: { points: [number, number, number][] }) {
  return (
    <g className="art-sparks" stroke="none" fill="var(--art-line)">
      {points.map(([x, y, r], index) => (
        <circle key={index} cx={x} cy={y} r={r} opacity={0.5} />
      ))}
    </g>
  );
}

/** 01 — Choosing a profession: a compass whose needle points down a lit path to an arch. */
function Compass() {
  return (
    <Frame>
      {/* The path, dashed until it reaches the arch it leads to. */}
      <path d="M76 50 C92 38 104 30 120 34" strokeDasharray="3 6" opacity={0.7} />
      {/* The arch: the platform's own mark, the way through. */}
      <path d="M118 58 V40 a10 10 0 0 1 20 0 V58" fill="var(--art-soft)" />
      <path d="M112 58 H144" />
      <circle cx="52" cy="62" r="30" fill="var(--art-soft)" />
      <circle cx="52" cy="62" r="23" opacity={0.45} />
      <path d="M52 32 V37 M52 87 V92 M22 62 H27 M77 62 H82" />
      <g className="art-needle">
        <path d="M52 44 L58 62 H46 Z" fill="var(--art-hot)" stroke="var(--art-hot)" />
        <path d="M52 80 L58 62 H46 Z" />
      </g>
      <circle cx="52" cy="62" r="2.5" fill="var(--art-line)" />
      <Sparks points={[[100, 18, 1.6], [146, 24, 1.2], [132, 70, 1.4], [16, 24, 1.2]]} />
    </Frame>
  );
}

/** 02 — The skill gap: two cliffs, a bridge half built between them. */
function Gap() {
  return (
    <Frame>
      {/* Where you are: skills you already hold, filled. */}
      <path d="M8 104 V70 H54 L60 104" fill="var(--art-soft)" />
      <circle cx="18" cy="58" r="4" fill="var(--art-line)" />
      <circle cx="30" cy="58" r="4" fill="var(--art-line)" />
      <circle cx="42" cy="58" r="4" fill="var(--art-line)" />
      {/* Where the profession is, with its flag. */}
      <path d="M152 104 V70 H106 L100 104" fill="var(--art-soft)" />
      <path d="M134 70 V38" />
      <path d="M134 38 L150 44 L134 50 Z" fill="var(--art-hot)" stroke="var(--art-hot)" />
      {/* The rope, then the planks: three laid, two still to come. */}
      <path d="M54 62 Q80 78 106 62" opacity={0.6} />
      <path d="M57 70 h6 M67 72 h6 M77 73 h6" strokeWidth={3} />
      <g className="art-planks">
        <path d="M87 72 h6 M97 70 h6" strokeWidth={3} />
      </g>
      <path
        className="art-planks-ghost"
        d="M87 72 h6 M97 70 h6"
        strokeWidth={3}
        strokeDasharray="1 3"
        opacity={0.5}
      />
      <Sparks points={[[80, 26, 1.6], [64, 40, 1.2], [104, 30, 1.2], [20, 30, 1.4]]} />
    </Frame>
  );
}

/** 03 — Courses and tests: an open book, and the tick a test adds to it. */
function Book() {
  return (
    <Frame>
      <path
        d="M80 54 C66 46 46 46 30 52 V96 C46 90 66 90 80 98 C94 90 114 90 130 96 V52 C114 46 94 46 80 54 Z"
        fill="var(--art-soft)"
      />
      <path d="M80 54 V98" />
      <path d="M40 62 C50 58 60 58 70 62 M40 71 C50 67 60 67 70 71 M40 80 C48 77 56 77 62 79" opacity={0.6} />
      <path d="M90 62 C100 58 110 58 120 62 M90 71 C100 67 110 67 120 71" opacity={0.6} />
      <g className="art-badge">
        <circle cx="118" cy="32" r="16" fill="var(--art-hot)" stroke="var(--art-hot)" />
        <path
          className="art-tick"
          d="M110 32 L116 38 L127 26"
          stroke="var(--art-on-hot)"
          strokeWidth={3}
          pathLength={1}
        />
      </g>
      <Sparks points={[[26, 30, 1.4], [48, 22, 1.2], [146, 58, 1.4], [92, 20, 1.2]]} />
    </Frame>
  );
}

/** 04 — CV and portfolio: a résumé lifting out of its folder. */
function Resume() {
  return (
    <Frame>
      <path d="M72 46 H96 L104 54 H146 V100 H72 Z" fill="var(--art-soft)" />
      <path d="M72 62 H146" opacity={0.5} />
      <g className="art-doc">
        <rect x="26" y="22" width="60" height="78" rx="7" fill="var(--color-surface)" transform="rotate(-6 56 61)" />
        <g transform="rotate(-6 56 61)">
          <circle cx="42" cy="38" r="7" />
          <path d="M54 35 H76 M54 42 H70" />
          <path d="M36 58 H76 M36 66 H76 M36 74 H66 M36 84 H72" opacity={0.6} />
        </g>
        {/* Verified: the one thing on this résumé nobody typed by hand. */}
        <circle cx="84" cy="24" r="6" fill="var(--art-hot)" stroke="var(--art-hot)" />
      </g>
      <Sparks points={[[112, 26, 1.6], [138, 34, 1.2], [18, 94, 1.2], [100, 14, 1.2]]} />
    </Frame>
  );
}

/** 05 — Matching vacancies: a match ring around you, joined to the job it fits. */
function Match() {
  return (
    <Frame>
      <circle cx="46" cy="58" r="28" opacity={0.25} />
      <circle
        className="art-ring"
        cx="46"
        cy="58"
        r="28"
        stroke="var(--art-hot)"
        strokeWidth={4}
        pathLength={100}
        transform="rotate(-90 46 58)"
      />
      <circle cx="46" cy="51" r="7" fill="var(--art-soft)" />
      <path d="M33 72 C35 63 57 63 59 72" />
      <path d="M78 58 H96" strokeDasharray="2 5" />
      <path d="M92 53 L98 58 L92 63" />
      <rect x="102" y="32" width="46" height="52" rx="8" fill="var(--art-soft)" />
      <rect x="114" y="52" width="22" height="16" rx="3" />
      <path d="M120 52 V48 H130 V52 M114 59 H136" />
      <path d="M112 76 H138" opacity={0.5} />
      <Sparks points={[[88, 24, 1.6], [150, 20, 1.2], [18, 22, 1.2], [96, 96, 1.4]]} />
    </Frame>
  );
}

/** 06 — The AI assistant: a conversation, and the spark that answers it. */
function Assistant() {
  return (
    <Frame>
      <path
        d="M30 34 H108 a10 10 0 0 1 10 10 V72 a10 10 0 0 1 -10 10 H60 L46 94 V82 H30 a10 10 0 0 1 -10 -10 V44 a10 10 0 0 1 10 -10 Z"
        fill="var(--art-soft)"
      />
      <g stroke="none" fill="var(--art-line)">
        <circle className="art-dot art-dot-1" cx="50" cy="58" r="4.5" />
        <circle className="art-dot art-dot-2" cx="69" cy="58" r="4.5" />
        <circle className="art-dot art-dot-3" cx="88" cy="58" r="4.5" />
      </g>
      <path d="M104 92 H138 a8 8 0 0 0 8 -8 V78" opacity={0.5} />
      <path
        className="art-spark"
        d="M132 14 C134 25 136 27 147 29 C136 31 134 33 132 44 C130 33 128 31 117 29 C128 27 130 25 132 14 Z"
        fill="var(--art-hot)"
        stroke="var(--art-hot)"
      />
      <Sparks points={[[150, 50, 1.4], [112, 18, 1.2], [14, 22, 1.4], [150, 100, 1.2]]} />
    </Frame>
  );
}

/* ------------------------------------------------------------ employers --- */

/** 01 — Vacancies and matching: one vacancy, candidates ranked beneath it. */
function Ranking() {
  return (
    <Frame>
      <rect x="14" y="30" width="46" height="52" rx="8" fill="var(--art-soft)" />
      <rect x="26" y="50" width="22" height="16" rx="3" />
      <path d="M32 50 V46 H42 V50 M26 57 H48" />
      <path d="M64 56 H74" strokeDasharray="2 4" />
      {/* Ranked by verified skills: the best fit first, and marked. */}
      <circle cx="88" cy="36" r="7" fill="var(--art-hot)" stroke="var(--art-hot)" />
      <circle cx="88" cy="58" r="7" fill="var(--art-soft)" />
      <circle cx="88" cy="80" r="7" fill="var(--art-soft)" />
      <g className="art-rank" strokeWidth={5}>
        <path d="M102 36 H146" stroke="var(--art-hot)" />
        <path d="M102 58 H134" />
        <path d="M102 80 H122" opacity={0.6} />
      </g>
      <Sparks points={[[24, 18, 1.4], [70, 18, 1.2], [150, 98, 1.4], [40, 98, 1.2]]} />
    </Frame>
  );
}

/** 02 — Precise filters: many go into the funnel, the one that fits comes out. */
function Funnel() {
  return (
    <Frame>
      <g stroke="none" fill="var(--art-line)" opacity={0.55}>
        <circle cx="50" cy="16" r="4" />
        <circle cx="66" cy="11" r="4" />
        <circle cx="82" cy="17" r="4" />
        <circle cx="98" cy="12" r="4" />
        <circle cx="112" cy="18" r="4" />
      </g>
      <path d="M36 28 H124 L92 62 V86 L68 96 V62 Z" fill="var(--art-soft)" />
      <path d="M52 40 H108" opacity={0.5} />
      <circle
        className="art-drop"
        cx="80"
        cy="104"
        r="5"
        fill="var(--art-hot)"
        stroke="var(--art-hot)"
      />
      {/* The criteria: two sliders, set. */}
      <path d="M132 58 H152 M132 76 H152" opacity={0.5} />
      <circle cx="146" cy="58" r="3.5" fill="var(--art-line)" />
      <circle cx="138" cy="76" r="3.5" fill="var(--art-line)" />
      <Sparks points={[[20, 30, 1.4], [26, 80, 1.2], [140, 20, 1.4], [120, 100, 1.2]]} />
    </Frame>
  );
}

/** 03 — Own tests and courses: a test sheet, two answers marked, the third on its way. */
function TestSheet() {
  return (
    <Frame>
      <rect x="30" y="22" width="66" height="82" rx="8" fill="var(--art-soft)" />
      <rect x="50" y="16" width="26" height="12" rx="4" fill="var(--color-surface)" />
      <rect x="40" y="40" width="11" height="11" rx="3" />
      <rect x="40" y="60" width="11" height="11" rx="3" />
      <rect x="40" y="80" width="11" height="11" rx="3" />
      <path d="M42 45 L45 48 L50 41 M42 65 L45 68 L50 61" />
      <path
        className="art-tick-late"
        d="M42 85 L45 88 L50 81"
        stroke="var(--art-hot)"
        strokeWidth={2.5}
        pathLength={1}
      />
      <path d="M58 46 H86 M58 66 H80 M58 86 H84" opacity={0.6} />
      <g className="art-pencil">
        <path d="M112 94 L108 104 L118 98 L146 52 L140 48 Z" fill="var(--art-soft)" />
        <path d="M136 55 L142 59" />
      </g>
      <Sparks points={[[112, 22, 1.6], [138, 30, 1.2], [18, 60, 1.2], [104, 70, 1.2]]} />
    </Frame>
  );
}

/** 04 — Candidate analytics: a chart, and the trend it shows. */
function Chart() {
  return (
    <Frame>
      <path d="M26 98 H142 M26 98 V22" opacity={0.6} />
      <g className="art-bars" fill="var(--art-soft)">
        <rect x="38" y="66" width="16" height="32" rx="3" />
        <rect x="62" y="50" width="16" height="48" rx="3" />
        <rect x="86" y="58" width="16" height="40" rx="3" />
        <rect x="110" y="36" width="16" height="62" rx="3" />
      </g>
      <path d="M46 56 L70 40 L94 48 L118 26" stroke="var(--art-hot)" />
      <circle cx="118" cy="26" r="4.5" fill="var(--art-hot)" stroke="var(--art-hot)" />
      <Sparks points={[[140, 14, 1.4], [44, 20, 1.2], [150, 60, 1.2], [80, 16, 1.4]]} />
    </Frame>
  );
}

/** 05 — Managing responses: the interview day, and the invitation going out. */
function Calendar() {
  return (
    <Frame>
      <rect x="22" y="30" width="78" height="68" rx="8" fill="var(--art-soft)" />
      <path d="M22 46 H100" />
      <path d="M40 24 V36 M82 24 V36" strokeWidth={3} />
      <g stroke="none" fill="var(--art-line)" opacity={0.55}>
        {[36, 52, 68, 84].map((x) =>
          [60, 74, 88].map((y) =>
            x === 68 && y === 74 ? null : <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" />,
          ),
        )}
      </g>
      {/* The day that was agreed. */}
      <circle cx="68" cy="74" r="7" fill="var(--art-hot)" stroke="var(--art-hot)" />
      <g className="art-envelope">
        <rect x="92" y="58" width="54" height="36" rx="5" fill="var(--color-surface)" />
        <path d="M94 62 L119 80 L144 62" />
      </g>
      <Sparks points={[[118, 24, 1.6], [146, 38, 1.2], [14, 18, 1.2], [60, 106, 1.2]]} />
    </Frame>
  );
}

/** In the order of `landing.employers.cards`. */
export const EMPLOYER_DECK_ART: ReactNode[] = [
  <Ranking key="ranking" />,
  <Funnel key="funnel" />,
  <TestSheet key="test-sheet" />,
  <Chart key="chart" />,
  <Calendar key="calendar" />,
];

/** In the order of `landing.students.cards`. */
export const STUDENT_DECK_ART: ReactNode[] = [
  <Compass key="compass" />,
  <Gap key="gap" />,
  <Book key="book" />,
  <Resume key="resume" />,
  <Match key="match" />,
  <Assistant key="assistant" />,
];
