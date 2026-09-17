/**
 * Theme palettes — solved by script, not hand-picked.
 *
 * Built from the five-colour palette the owner chose:
 *
 *   #FFD6FF pink lace · #E7C6FF mauve · #C8B6FF periwinkle
 *   #B8C0FF blue-purple · #BBD0FF light blue
 *
 * They are one hue fan (300° → 221.5°) at full saturation and near-equal
 * lightness. Measured as text on white they run 1.29–1.81:1, so not one of
 * them can carry a letter: they are fills — tiles, chips, meters, the aurora
 * itself. Every text weight here was solved instead, by binary search down
 * the lightness axis at fixed hue.
 *
 * The ground they are solved against is NOT the page. The interface is
 * frosted glass, and a translucent panel has no colour of its own — text on
 * it sits on the panel composited over the aurora behind it. Solved against
 * the page alone, ink-500 measures 5.23:1 there and 4.18:1 on glass over the
 * periwinkle, which is where it is most often read. So each weight is solved
 * against the worst composite — #EDE8FF light, #362244 dark — and then clears
 * its target on all three grounds: page, opaque card, and glass.
 *
 * Targets: secondary text (ink-500) ≥ 4.5:1, decorative grey (ink-400) ≥ 3:1,
 * every capital axis ≥ 4.5:1, on all three grounds, in both themes.
 *
 * ink-50 is the page background and ink-200 is the border colour on purpose —
 * that is what lets existing `bg-ink-50` / `border-ink-200` markup follow the
 * theme without being rewritten.
 */

export type ThemeName = "light" | "dark";

export interface Palette {
  name: ThemeName;
  label: string;
  brand: Record<number, string>;
  ink: Record<number, string>;
  accent: string;
  page: string;
  card: string;
  border: string;
  mode: "light" | "dark";
  /** Text for saturated surfaces. Never assume white or the page colour. */
  onColour: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /**
   * The worst-case ground a frosted panel makes over the aurora — the colour
   * every text weight above was solved against. Canvas-drawn things (the
   * capital chart, Recharts) cannot read a CSS variable, and they sit on
   * glass like everything else, so they measure against this rather than
   * against `card`.
   */
  glass: string;
  /** The aurora's five stops, in paint order. Fills only. */
  aurora: string[];
  /** Capital axis colours keyed by dimension slug. */
  axes: Record<string, string>;
  /** Ordered categorical scale for charts. */
  chart: string[];
}

const LIGHT_AXES = {
  KNOWLEDGE: "#7155C6",
  PROFESSIONAL: "#8E46C2",
  DIGITAL_AI: "#A938A8",
  SOCIAL: "#B23C77",
  ENTREPRENEURIAL: "#995833",
  FINANCIAL: "#467427",
  PERSONAL_ETHICAL: "#28764F",
  HEALTH: "#277376",
  CIVIC: "#525FC5",
};

const DARK_AXES = {
  KNOWLEDGE: "#9A86D9",
  PROFESSIONAL: "#B17DD6",
  DIGITAL_AI: "#D16CD1",
  SOCIAL: "#D374A3",
  ENTREPRENEURIAL: "#CA8156",
  FINANCIAL: "#60A333",
  PERSONAL_ETHICAL: "#34A66D",
  HEALTH: "#34A1A4",
  CIVIC: "#838DD8",
};

/**
 * The nine axes start on her fan and continue around the wheel.
 *
 * Three of them are the palette itself — periwinkle, mauve, pink lace — and
 * the fourth, CIVIC, is its blue end. The remaining five have to leave the
 * fan: nine categories inside an 80° arc would be nine shades of violet, and
 * a chart whose series cannot be told apart is not a chart. Each is solved to
 * the same 4.5:1 on the glass composite, so they are equal in weight even
 * though they are not equal in hue.
 */
export const PALETTES: Record<ThemeName, Palette> = {
  light: {
    name: "light",
    label: "Light",
    brand: {
      50: "#F2EDFF",
      100: "#E4DBFF",
      200: "#C8B6FF", // the source periwinkle, unchanged
      300: "#AD93FB",
      400: "#8A6AE9",
      500: "#7A5CD6",
      600: "#7052C9",
      700: "#684AC3",
      800: "#4F3795",
      900: "#382966",
    },
    ink: {
      50: "#FAF8FF",
      100: "#EDE8FA",
      200: "#DDD6F4",
      300: "#C7BFDF",
      400: "#888396",
      500: "#6B667B",
      600: "#575366",
      700: "#433E50",
      800: "#322E3D",
      900: "#24212D",
    },
    accent: "#FFD6FF",
    page: "#FAF8FF",
    card: "#FFFFFF",
    border: "#DDD6F4",
    mode: "light",
    onColour: "#FBF8FF",
    success: "#23774D",
    warning: "#886220",
    danger: "#BC3B2C",
    info: "#515FC8",
    glass: "#EDE8FF",
    aurora: ["#FFD6FF", "#E7C6FF", "#C8B6FF", "#B8C0FF", "#BBD0FF"],
    axes: LIGHT_AXES,
    chart: Object.values(LIGHT_AXES),
  },
  dark: {
    name: "dark",
    label: "Dark",
    brand: {
      50: "#151025",
      100: "#1F1639",
      200: "#2D1F59",
      300: "#3E2880",
      400: "#502EB8",
      500: "#9B84E2",
      600: "#B2A1E5",
      700: "#C3B6E8",
      800: "#D0C8EB",
      900: "#DCD7EE",
    },
    ink: {
      50: "#181327",
      100: "#28223C",
      200: "#3B3255",
      300: "#584F76",
      400: "#786F96",
      500: "#958FAA",
      600: "#ADA9BB",
      700: "#CAC8D2",
      800: "#E1DFE4",
      900: "#EDEDEF",
    },
    /* On a dark ground the pink lace needs no adjustment: 14.05:1 on the
       page, 11.10:1 on glass. It is the fill and the ink at once here. */
    accent: "#FFD6FF",
    page: "#181327",
    card: "#29233B",
    border: "#3B3255",
    mode: "dark",
    onColour: "#140F24",
    success: "#30A66B",
    warning: "#C28720",
    danger: "#E56F61",
    info: "#808CE4",
    glass: "#362244",
    /* The same five hues, deepened rather than swapped — a dark theme that
       kept the pastels would be five bright lamps behind frosted panels. */
    aurora: ["#652065", "#482065", "#312065", "#202865", "#203565"],
    axes: DARK_AXES,
    chart: Object.values(DARK_AXES),
  },
};

export const DEFAULT_THEME: ThemeName = "light";

export const THEME_NAMES = Object.keys(PALETTES) as ThemeName[];
