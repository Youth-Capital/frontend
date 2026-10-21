import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Start a new page at the top of it.
 *
 * The browser only resets the scroll position when it loads a document, and a
 * single-page application never loads a second one. So following a link from
 * the foot of a long page — "My data" at the bottom of the profile, say —
 * rendered the new page with the window still scrolled to where the old one
 * ended, and the reader arrived at the middle of something they had not read
 * the start of.
 *
 * Three deliberate exceptions:
 *
 * * **Back and forward.** A POP navigation is somebody returning to where they
 *   were, and the browser restores that position by itself. Scrolling to the
 *   top here would throw away the one thing they wanted.
 * * **Anchors.** A URL carrying a hash is asking for a place inside the page,
 *   not the top of it.
 * * **The query string.** Only the path is watched, so changing a filter or a
 *   tab — which rewrites the search params and not the route — leaves the
 *   reader where they were looking.
 *
 * The jump is instant rather than smooth: the stylesheet sets
 * `scroll-behavior: smooth` for in-page anchors, and inherited here it would
 * animate a long page's worth of scrolling on every navigation while the new
 * page is already on screen.
 *
 * `useLayoutEffect` so it happens before the browser paints, otherwise the
 * previous scroll position is visible for a frame as a flicker.
 */
export function useScrollToTop(): void {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === "POP" || hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash, navigationType]);
}
