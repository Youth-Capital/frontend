import { useTranslation } from "react-i18next";

/**
 * The first focusable thing on the page.
 *
 * Every layout here opens with a header: a menu button, a theme toggle, a
 * language switcher, notifications, a profile menu. Somebody on a keyboard had
 * to tab past all of it on every single page before reaching the thing they
 * came for, and in the app shell the sidebar's ten navigation links came next.
 *
 * Hidden until focused, which is why it costs nothing visually and everything
 * to leave out. It is a plain anchor to the `<main>` landmark — no script.
 */
export function SkipLink({ targetId = "main" }: { targetId?: string }) {
  const { t } = useTranslation();

  return (
    <a
      href={`#${targetId}`}
      className="sr-only rounded-full bg-brand-fill px-4 py-2 text-sm font-semibold text-on-brand focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-4 focus-visible:z-50"
    >
      {t("common.skipToContent")}
    </a>
  );
}
