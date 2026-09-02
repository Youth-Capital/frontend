import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { LessonVideo as Video } from "@/shared/types/api";

/**
 * The lesson's video, played in place.
 *
 * It used to be a play button that opened YouTube in a new tab, which is a
 * lesson that sends you somewhere else to take it — and the somewhere else is
 * full of other videos.
 *
 * The frame is only ever given `embed_url`, which the server built from an id
 * it checked. The raw `url` the author typed is never put in a `src`: that
 * field is user input, and an iframe pointed at user input renders an
 * arbitrary page inside the platform, under our domain, to a reader who may
 * be fifteen.
 *
 * Nothing loads until it is asked for. A facade holds the space, and the
 * iframe is created on click — so opening a lesson does not fetch a player
 * from another company, and reading the text costs nothing to a student on a
 * phone plan.
 */
export function LessonVideo({ video }: { video: Video }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);

  if (!video.embed_url) {
    // Not something we will frame: a plain, honest link out.
    return (
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer noopener"
        className="deep mx-auto mb-4 flex aspect-video w-full max-w-[106vh] flex-col items-center justify-center gap-3 rounded-(--radius-card)"
      >
        <PlayBadge />
        <span className="text-sm" style={{ color: "var(--band-muted)" }}>
          {t("courses.openVideo")}
        </span>
      </a>
    );
  }

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={t("courses.playVideo")}
        // Bounded by width, not height. A 16:9 box across a full desktop
        // column is most of the viewport, and an empty coloured slab that
        // size pushes the lesson itself off the screen — but capping the
        // height would leave the width alone and break the ratio, so the
        // limit goes on the width: 60vh of height is 106vh of width.
        className="deep group mx-auto mb-4 flex aspect-video w-full max-w-[106vh] flex-col items-center justify-center gap-3 rounded-(--radius-card)"
      >
        <PlayBadge />
        <span className="text-sm" style={{ color: "var(--band-muted)" }}>
          {t("courses.playVideo")}
        </span>
      </button>
    );
  }

  return (
    <div className="mx-auto mb-4 aspect-video w-full max-w-[106vh] overflow-hidden rounded-(--radius-card) bg-ink-900">
      <iframe
        src={`${video.embed_url}${video.embed_url.includes("?") ? "&" : "?"}autoplay=1`}
        title={t("courses.videoTitle")}
        className="h-full w-full"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        // The player has no business reaching into the page around it.
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        allowFullScreen
      />
    </div>
  );
}

function PlayBadge() {
  return (
    <span
      className="flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
      style={{ background: "var(--band-accent)", color: "var(--band-on-accent)" }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );
}
