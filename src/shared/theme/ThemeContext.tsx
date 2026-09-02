import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_THEME,
  PALETTES,
  THEME_NAMES,
  type Palette,
  type ThemeName,
} from "./palettes";

const STORAGE_KEY = "yk_theme";

/** What the viewer's OS is set to right now. */
function systemTheme(): ThemeName {
  if (typeof window === "undefined" || !window.matchMedia) return DEFAULT_THEME;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStored(): ThemeName | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && THEME_NAMES.includes(stored as ThemeName)
      ? (stored as ThemeName)
      : null;
  } catch {
    // Private windows and blocked site data both throw on access rather than
    // returning null, and neither is a reason to fail to render.
    return null;
  }
}

interface ThemeState {
  theme: ThemeName;
  palette: Palette;
  setTheme: (theme: ThemeName) => void;
  toggle: () => void;
  /** True while the theme is following the OS rather than an explicit choice. */
  followsSystem: boolean;
  available: ThemeName[];
}

const ThemeContext = createContext<ThemeState | null>(null);

/**
 * Runtime theming.
 *
 * Tailwind emits its colour tokens as CSS variables and its utilities read them
 * through `var()`, so setting `data-theme` on <html> re-colours every utility in
 * the product at once. Components that hand colours to a canvas — the capital
 * chart, Recharts — cannot read CSS variables, so they take the resolved
 * palette object from `useTheme()` instead.
 *
 * Until someone picks a side the theme follows the operating system, and keeps
 * following it if the OS switches at sunset. Choosing explicitly stops that:
 * an explicit choice must not be overridden by the machine.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<ThemeName | null>(readStored);
  const [system, setSystem] = useState<ThemeName>(systemTheme);

  const theme = chosen ?? system;

  // Keep tracking the OS while no explicit choice has been made.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) =>
      setSystem(event.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Native form controls, scrollbars and the like follow this.
    document.documentElement.style.colorScheme = theme;

    // Keeps the browser chrome (mobile address bar) in step with the page.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", PALETTES[theme].page);
  }, [theme]);

  const setTheme = useCallback((next: ThemeName) => {
    setChosen(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference is lost on reload, which is survivable; failing here is not.
    }
  }, []);

  const toggle = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  );

  const value = useMemo<ThemeState>(
    () => ({
      theme,
      palette: PALETTES[theme],
      setTheme,
      toggle,
      followsSystem: chosen === null,
      available: THEME_NAMES,
    }),
    [theme, chosen, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error("useTheme must be used inside <ThemeProvider>.");
  }
  return context;
}

/** Colour for one capital axis, falling back to whatever the API supplied. */
export function useAxisColor() {
  const { palette } = useTheme();
  return (slug: string, fallback?: string | null) =>
    palette.axes[slug] ?? fallback ?? palette.ink[500];
}
