import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import type { StudentDashboard } from "@/shared/types/api";

import "@/shared/styles/deep.css";

/**
 * Where you are in the whole thing, across the top of the dashboard.
 *
 * This replaced a greeting and a percentage. A percentage needs interpreting —
 * 32% of what, and what do I do about it — while a named stage answers both at
 * once: you are at "verified", so the next thing is evidence.
 *
 * The five stages are read from the account, not from a score. Each is a fact
 * someone can check about themselves, which is the point: a stage a learner
 * cannot explain to themselves is worse than no stage at all.
 */

interface Stage {
  key: string;
  reached: (data: StudentDashboard) => boolean;
}

const STAGES: Stage[] = [
  { key: "discovered", reached: (d) => d.intake_completed || d.stats.profile_completion >= 50 },
  { key: "learning", reached: (d) => d.stats.courses_enrolled > 0 },
  { key: "building", reached: (d) => d.stats.courses_completed > 0 || (d.plan?.tasks_done ?? 0) > 0 },
  { key: "verified", reached: (d) => d.stats.skills_verified > 0 || d.stats.tests_passed > 0 },
  { key: "ready", reached: (d) => d.stats.matching_vacancies > 0 },
];

export function JourneyBand({ data }: { data: StudentDashboard }) {
  const { t } = useTranslation();

  const reached = STAGES.map((stage) => stage.reached(data));
  // The current stage is the first one not yet reached — or the last, once
  // everything is done. Counting reached stages instead would jump ahead when
  // someone verifies a skill before finishing a course.
  const firstOpen = reached.indexOf(false);
  const currentIndex = firstOpen === -1 ? STAGES.length - 1 : firstOpen;

  return (
    <section className="deep journey-band px-5 py-7 sm:px-8 sm:py-9">
      {/*
        Two columns on a wide screen: who you are on the left, where you are on
        the right. Centred, the greeting and the rail competed for the same
        middle; side by side each gets a job, and the rail gets the width it
        needs to carry five labelled stages.
      */}
      <div className="grid gap-7 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-10">
        <div className="flex flex-col items-center gap-1 text-center lg:items-start lg:text-left">
        <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
          {data.greeting_name ? (
            <Greeting
              line={t("dashboard.greeting", { name: data.greeting_name })}
              name={data.greeting_name}
            />
          ) : (
            t("dashboard.greetingAnon")
          )}
        </h1>
        <p className="text-sm" style={{ color: "var(--band-muted)" }}>
          {data.target_profession ? (
            <>
              {t("dashboard.targetProfession")}:{" "}
              <Link
                to="/student/career"
                className="font-medium underline-offset-2 hover:underline"
                style={{ color: "var(--band-accent)" }}
              >
                {data.target_profession.name}
              </Link>
            </>
          ) : (
            <>
              {t("dashboard.noTarget")}{" "}
              <Link
                to="/student/career"
                className="font-medium underline-offset-2 hover:underline"
                style={{ color: "var(--band-accent)" }}
              >
                {t("dashboard.chooseTarget")}
              </Link>
            </>
          )}
        </p>
        {data.youth_id && (
          <span
            className="mt-1 rounded-full px-2.5 py-0.5 font-mono text-[11px]"
            style={{
              color: "var(--band-muted)",
              background: "color-mix(in oklab, var(--band-dim) 28%, transparent)",
            }}
          >
            {data.youth_id}
          </span>
        )}
        </div>

        <Journey reached={reached} currentIndex={currentIndex} />
      </div>
    </section>
  );
}

/**
 * The greeting with the name lit.
 *
 * Split on the name rather than kept as two keys: the sentence around it
 * differs per language and only the translator should decide where the name
 * sits in it. If the name is not found in the rendered line — a translation
 * that dropped the placeholder — the whole line renders plainly rather than
 * losing the greeting.
 */
function Greeting({ line, name }: { line: string; name: string }) {
  const at = line.indexOf(name);
  if (at === -1) return <>{line}</>;

  return (
    <>
      {line.slice(0, at)}
      <span style={{ color: "var(--band-warm-ink)" }}>{name}</span>
      {line.slice(at + name.length)}
    </>
  );
}

function Journey({
  reached,
  currentIndex,
}: {
  reached: boolean[];
  currentIndex: number;
}) {
  const { t } = useTranslation();
  // The rail fills only as far as the run of stages reached without a gap.
  //
  // Counting reached stages instead overstated it: someone can verify a skill
  // before finishing a course, so stages 1, 2, 4 and 5 are reached while 3 is
  // not — and a rail drawn to the fourth node claimed a path straight through
  // the stage they are actually standing on. The nodes still each show their
  // own state; only the line between them is held back.
  // Read from the states rather than from currentIndex: that one collapses
  // "the last stage is current" and "every stage is done" into the same
  // number, and the second case has to fill the whole rail.
  const firstOpen = reached.indexOf(false);
  const contiguous = firstOpen === -1 ? reached.length : firstOpen;
  const filled = (Math.max(contiguous - 1, 0) / (STAGES.length - 1)) * 100;
  // Each stage owns an equal column and its node sits in the middle, so the
  // rail has to start and end at those centres. Spanning the full width drew
  // track past the first and last stage, as if the journey continued.
  const inset = `${50 / STAGES.length}%`;

  /*
   * Five stages, and each label is a single long word: "Подтверждено",
   * "Tasdiqlangan". Five equal columns across a 390px phone give each about
   * 68px, and a word that needs 85px cannot wrap — so on a phone the labels
   * ran into each other and "Практика" sat on top of "Подтверждено".
   *
   * The rail is one continuous line through five centres, so breaking it into
   * two rows on narrow screens would break the one thing the band is for. It
   * keeps a width where the words fit and scrolls inside its own box instead,
   * the same bargain the skills map makes. The nodes cut off at the edge are
   * what tell you there is more to the right.
   *
   * The floor holds at every width, not just on phones, because "narrow" here
   * is not the same as "small screen": from the large breakpoint the band
   * becomes two columns and the stages get the 1.2fr share of it, which on a
   * 1024px iPad measured 355px — narrower than the same row on a 390px phone,
   * and the width at which "Подтверждено" last collided with "Готов к работе".
   */
  return (
    <div className="-mx-5 overflow-x-auto overscroll-x-contain px-5 sm:mx-0 sm:px-0">
      <div className="relative w-full min-w-[27rem]">
      {/* The track: walked, then not walked. The second half is dotted rather
          than merely dimmer — the difference between the two is not one of
          importance, it is that one has happened and the other has not. */}
      <div className="absolute top-5 -z-10 h-0.5" style={{ left: inset, right: inset }}>
        <div className="journey-rail-todo h-full w-full" />
        <div
          className="journey-rail-done absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
          style={{ width: `${filled}%` }}
        />
      </div>

      <ol className="flex items-start justify-between gap-1">
        {STAGES.map((stage, index) => {
          const state = reached[index] ? "done" : index === currentIndex ? "current" : "todo";
          return (
            <li
              key={stage.key}
              className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
            >
              <span
                data-state={state}
                className="journey-node flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
              >
                {state === "done" ? <Tick /> : String(index + 1).padStart(2, "0")}
              </span>

              <span
                className="text-[11px] font-semibold leading-tight"
                style={{
                  color:
                    state === "todo"
                      ? "var(--band-dim)"
                      : state === "current"
                        ? "var(--band-warm-ink)"
                        : "var(--band-ink)",
                }}
              >
                {t(`atlas.stage.${stage.key}`)}
              </span>

              {/* The word under the stage is what the board added and what the
                  rail alone could not say: a node's ring tells you where you
                  are only if you already know how to read it. */}
              <span
                className="text-[10px] leading-tight"
                style={{
                  color:
                    state === "current" ? "var(--band-warm-ink)" : "var(--band-dim)",
                }}
              >
                {t(`atlas.state.${state}`)}
              </span>
            </li>
          );
        })}
      </ol>
      </div>
    </div>
  );
}

function Tick() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
