import { useTranslation } from "react-i18next";

import { Tile } from "@/shared/ui";
import type { CompanyState, StreakState } from "@/shared/types/api";

/**
 * The reason to come back tomorrow.
 *
 * Deliberately quiet. Research on gamification is consistent that it backfires
 * when the game is louder than the learning — so no points, no leagues, no
 * confetti. Seven dots, a number, and one honest line about other people.
 */
export function StreakCard({
  streak,
  company,
}: {
  streak: StreakState;
  company: CompanyState;
}) {
  const { t } = useTranslation();

  const active = streak.current_days > 0;
  const line = company.peers ?? company.hired ?? company.recent_test_takers;

  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Flame lit={streak.done_today} />

        <div>
          <p className="font-display text-2xl font-semibold tabular-nums text-ink-900">
            {active
              ? t("streak.days", { count: streak.current_days })
              : t("streak.start")}
          </p>
          <p className="text-sm text-ink-500">
            {streak.done_today
              ? t("streak.doneToday")
              : active
                ? t("streak.keepAlive")
                : t("streak.oneAction")}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-2 sm:items-end">
        <WeekDots streak={streak} />
        {line && (
          <p className="text-xs text-ink-500">
            {company.peers
              ? t("company.peers", {
                  count: company.peers.count,
                  profession: company.peers.profession,
                })
              : company.hired
                ? t("company.hired", { count: company.hired.count })
                : t("company.recentTests", {
                    count: company.recent_test_takers!.count,
                  })}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Seven dots for the run so far, capped at a week.
 *
 * Not a calendar: an accurate per-day history needs a table of active dates,
 * and showing a fake one would be a lie about which days someone worked. This
 * says "this many days in a row", which is exactly what is known.
 */
function WeekDots({ streak }: { streak: StreakState }) {
  const filled = Math.min(streak.current_days, 7);
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: 7 }, (_, index) => (
        <span
          key={index}
          className={
            index < filled
              ? "h-2 w-2 rounded-full bg-brand-fill"
              : "h-2 w-2 rounded-full bg-ink-200"
          }
        />
      ))}
      {streak.current_days > 7 && (
        <span className="ml-1 text-xs tabular-nums text-ink-500">
          +{streak.current_days - 7}
        </span>
      )}
    </div>
  );
}

/**
 * The flame, lit or not.
 *
 * Lit is a palette tile: the pink lace is a fill, and the tile is the one
 * element in the system that lets it appear at full strength while the icon on
 * it comes from the ink ramp. It used to be drawn *in* the pink — a 1.21:1
 * stroke, which is a flame you cannot see. Unlit keeps the tile's geometry and
 * changes only its colour, because which of the two it is is the information.
 */
function Flame({ lit }: { lit: boolean }) {
  if (lit) {
    return (
      <Tile hue="pink" size="md">
        <FlameGlyph />
      </Tile>
    );
  }

  return (
    <span
      aria-hidden
      className="flex h-11 w-11 items-center justify-center rounded-(--radius-tile) bg-ink-100 text-ink-400"
    >
      <FlameGlyph />
    </span>
  );
}

function FlameGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2c1.5 3.5.5 5.5-1 7-1.8 1.8-3 3.4-3 5.8A4.2 4.2 0 0 0 12 19a4.2 4.2 0 0 0 4-4.2c0-1.6-.7-2.9-1.6-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
    </svg>
  );
}
