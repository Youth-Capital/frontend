import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import { api } from "@/shared/api/client";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/shared/ui/ThemeSwitcher";
import type { Plan } from "@/shared/types/api";

import { Lattice } from "@/shared/ui/geometry";

import { StagePath } from "./StagePath";
import "@/shared/styles/deep.css";
import { Logo } from "@/shared/ui/Logo";

import { AudienceDeck, type DeckCard } from "./AudienceDeck";
import { EMPLOYER_DECK_ART, STUDENT_DECK_ART } from "./DeckArt";
import { SkipLink } from "@/shared/ui/SkipLink";

/*
 * The hit area around a pagination dot.
 *
 * A dot is 6px tall and should stay 6px: it is a position indicator, and a
 * 44px dot is a button. So the *target* grows instead of the drawing — 19px
 * above and below takes it to 44, and 6px to each side is exactly half the
 * 12px gap, which is as far as it can reach without taking presses meant for
 * the dot next to it. The gap was widened from 8px to 12px for that reason:
 * at 8px the narrow dot's target could only reach 20px across, and two
 * targets that overlap trade a small target for a wrong one.
 */
const DOT_HIT =
  "relative before:absolute before:-inset-x-1.5 before:-inset-y-[19px] before:content-[''] ";

/**
 * Public landing page.
 *
 * Everything factual here is pulled from the same API the product runs on —
 * the pricing table is the live plan catalogue, not a hand-written copy that
 * drifts the first time a price changes.
 */
export default function LandingPage() {
  // No `t` here: every section component translates its own copy.
  const [audience, setAudience] = useState<"STUDENT" | "EMPLOYER">("STUDENT");

  const plans = useQuery({
    queryKey: ["public-plans", audience],
    queryFn: async () => {
      const { data } = await api.get<Plan[]>(`/billing/plans/?role=${audience}`);
      return data;
    },
  });

  // Whether anything is on sale at all. While paid plans are switched off the
  // catalogue answers empty, and the section is left out rather than shown
  // with nothing in it. Asked without a role, so flipping the audience tabs
  // cannot make the whole section blink in and out.
  const anyPlans = useQuery({
    queryKey: ["public-plans", "any"],
    queryFn: async () => {
      const { data } = await api.get<Plan[]>("/billing/plans/");
      return data.length > 0;
    },
  });

  return (
    <div className="min-h-dvh text-ink-800">
      {/* First in the DOM, so it is the first thing Tab reaches. */}
      <SkipLink />

      <SiteHeader />

      <main id="main">
        <Hero />
        <JourneySection />
        <ForStudents />
        <ForEmployers />
        {anyPlans.data && (
          <Pricing
            plans={plans.data ?? []}
            loading={plans.isLoading}
            audience={audience}
            onAudience={setAudience}
          />
        )}
        <Faq />
        <ClosingCta />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ chrome */

/**
 * The mark and the name, as one control.
 *
 * It stays a real link to "/" so it behaves like one — middle-click, open in a
 * new tab, and the address the browser shows on hover. But on the landing
 * itself a link to "/" is a link to where you already are: the router sees no
 * route change and nothing happens, which is precisely the case somebody has
 * scrolled down and wants the top back. So on this page the click is handled
 * here instead.
 */
function BrandLink({ nameClass }: { nameClass: string }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  function toTop(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/") return; // somewhere else: let the router navigate

    event.preventDefault();
    window.scrollTo({
      top: 0,
      // Somebody who asked the system for less motion does not want the whole
      // page flying past them.
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  return (
    <Link to="/" onClick={toTop} className="flex min-h-11 min-w-11 items-center gap-2.5">
      <Logo size={36} />
      <span className={nameClass}>{t("app.name")}</span>
    </Link>
  );
}

function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="deep sticky top-0 z-30 backdrop-blur">
      {/*
       * Five controls do not fit across a phone.
       *
       * Measured at 320px: the mark, the theme toggle, three language codes,
       * "Войти" and "Создать аккаунт" come to about 370px of controls in a
       * 288px row. Nothing overflowed, because this header is `.deep` and
       * `.deep` clips — so the two buttons on the right were simply cut off
       * the screen, present in the markup and unreachable by hand.
       *
       * So the phone header carries the three things it needs: the mark, the
       * language (the first choice a trilingual audience makes), and the way
       * back in for someone who already has an account. Signing up is not
       * lost with the button — the hero's own call to action below points at
       * the same page, and it is the larger target of the two.
       */}
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <BrandLink nameClass="hidden font-semibold text-ink-900 sm:block" />

        <div className="flex-1" />

        <div className="hidden sm:block">
          <ThemeSwitcher />
        </div>
        <LanguageSwitcher />

        <Link
          to="/auth/login"
          className="shrink-0 rounded-(--radius-control) px-3 py-3 text-sm font-semibold text-ink-700 hover:bg-ink-100"
        >
          {t("auth.login")}
        </Link>
        <Link
          to="/auth/register"
          className="hidden shrink-0 rounded-full bg-brand-fill px-4 py-2.5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-fill-hover coarse:py-3 sm:inline-block"
        >
          {t("landing.cta.createAccount")}
        </Link>
      </div>
    </header>
  );
}

/**
 * The last thing on the page before the footer.
 *
 * The page used to end on the FAQ: the visitor finished reading the answers to
 * their objections and then met a footer, which is a link list, not an
 * invitation. Somebody convinced on the last question had to scroll back up to
 * act on it.
 *
 * It is a deep band on purpose. The hero is the only other one, so the page
 * opens and closes on the same ground and the promise is made twice in the
 * same voice — and after a surface-toned FAQ the change of ground is what
 * makes this register as a separate moment rather than one more section.
 *
 * One action. Nothing else on the screen.
 */
function ClosingCta() {
  const { t } = useTranslation();

  return (
    <section className="deep relative overflow-hidden">
      <Lattice
        className="pointer-events-none absolute inset-0 hidden h-full w-full opacity-[0.07] sm:block"
      />

      <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <h2
          className="font-display text-3xl font-semibold text-balance sm:text-4xl"
          style={{ color: "var(--band-ink)" }}
        >
          {t("landing.close.title")}
        </h2>
        <p
          className="mx-auto mt-4 max-w-xl text-pretty sm:text-lg"
          style={{ color: "var(--band-muted)" }}
        >
          {t("landing.close.lead")}
        </p>
        <Link
          to="/auth/register"
          className="mt-8 inline-block rounded-full px-7 py-3.5 text-sm font-semibold transition-[filter] hover:brightness-95"
          style={{
            background: "var(--color-brand-500)",
            color: "#FFFFFF",
            boxShadow:
              "0 0 26px color-mix(in oklab, var(--color-brand-400) 55%, transparent)",
          }}
        >
          {t("landing.cta.createAccount")}
        </Link>
      </div>
    </section>
  );
}

function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="glass-bar border-x-0 border-b-0">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          {/* The same control. The bottom of the page is where the way back up
              is worth the most. */}
          <BrandLink nameClass="font-semibold text-ink-900" />
          <p className="mt-3 max-w-sm text-sm text-ink-600">
            {t("landing.footer.blurb")}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {t("landing.footer.forStudents")}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink-600">
            <li><Link to="/auth/register" className="hover:text-brand-600">{t("landing.cta.createAccount")}</Link></li>
            <li><Link to="/auth/login" className="hover:text-brand-600">{t("auth.login")}</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {t("landing.footer.forEmployers")}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink-600">
            <li><Link to="/auth/register" className="hover:text-brand-600">{t("landing.employers.cta")}</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-200">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-ink-500 sm:px-6">
          © {year} {t("app.name")}
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------- primitives */

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  action,
  tone = "page",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  /** Sits to the right of the heading on wide screens, under it on narrow. */
  action?: ReactNode;
  tone?: "page" | "surface";
}) {
  return (
    <section
      id={id}
      /* scroll-mt keeps an anchored section clear of the sticky header, which
         would otherwise cover its own heading on arrival. */
      className={
        tone === "surface"
          ? "scroll-mt-24 border-y border-ink-200 bg-surface py-16 sm:py-20"
          : "scroll-mt-24 py-16 sm:py-20"
      }
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
                {eyebrow}
              </p>
            )}
            <h2 className="mt-2 max-w-3xl font-display text-3xl font-semibold text-balance text-ink-900 sm:text-4xl">
              {title}
            </h2>
            {lead && (
              <p className="mt-3 max-w-2xl text-lg text-ink-600">{lead}</p>
            )}
          </div>
          {action}
        </div>
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- sections */

/**
 * The headline states the same journey twice, from two angles: first as a
 * description of the path, then as an invitation to start it. Both end on the
 * same word, so what changes is the framing, not the promise.
 *
 * It advances when the reader scrolls past the fold — the gesture everyone
 * already makes — and on a tap for anyone who wants to see it now. The two
 * phrases are stacked in one grid cell so the taller of them fixes the height
 * and nothing below the headline shifts when they swap.
 */
function RotatingHeadline() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const zone = useRef(0);

  const phrases = [t("landing.hero.title"), t("landing.hero.titleAlt")];

  useEffect(() => {
    let frame = 0;

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next = window.scrollY > 140 ? 1 : 0;
        // Edge-triggered, not level-triggered: a tap may set the phrase freely,
        // and scrolling only overrides it when the fold is actually crossed.
        // Reading scrollY on every event would undo a tap made at the top.
        if (next !== zone.current) {
          zone.current = next;
          setIndex(next);
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const advance = () => setIndex((current) => (current + 1) % phrases.length);

  return (
    <div className="mt-3">
      <div onClick={advance} className="cursor-pointer select-none">
        {/*
          Four lines are reserved whether or not the language needs them.

          This is what was moving the hero. The English headline sets in two
          lines and the Russian one in four, so the section was ~140px taller
          in Russian — and everything below it, including the road behind the
          text, sat 140px lower. Switching language looked like the photograph
          sliding down.

          The reserve is in `em`, so it follows the type size across the
          breakpoint instead of being a pixel guess: 4 lines at the 1.08 line
          height set below. English now carries two lines of air under the
          headline, which is the price of the section being the same height in
          every language.

          A language that needs a fifth line would move things again. Uzbek and
          Russian both fit in four at the sizes shipped here; raise this if a
          longer headline is ever written.
        */}
        <h1
          className="grid min-h-[4.32em] whitespace-pre-line font-display text-4xl font-semibold leading-[1.08] text-balance sm:text-5xl"
          style={{ textShadow: "0 0 34px color-mix(in oklab, var(--color-brand-400) 55%, transparent)" }}
        >
          {phrases.map((phrase, position) => (
            <span
              key={phrase}
              // Same grid cell → the phrases overlap instead of stacking, and
              // the block keeps the height of the longer one.
              style={{ gridArea: "1 / 1" }}
              aria-hidden={position !== index}
              className={
                position === index
                  ? "translate-y-0 opacity-100 transition duration-500"
                  : "pointer-events-none -translate-y-2 opacity-0 transition duration-500"
              }
            >
              {phrase}
            </span>
          ))}
        </h1>
      </div>

      {/* The affordance. Also the keyboard route — a clickable <h1> is not one. */}
      <div className="mt-4 flex items-center gap-3">
        {phrases.map((phrase, position) => (
          <button
            key={phrase}
            type="button"
            onClick={() => setIndex(position)}
            aria-label={phrase}
            aria-pressed={position === index}
            style={{
              background:
                position === index
                  ? "var(--band-accent)"
                  : "color-mix(in oklab, var(--band-dim) 60%, transparent)",
            }}
            className={
              position === index
                ? DOT_HIT + "h-1.5 w-8 rounded-full transition-all"
                : DOT_HIT + "h-1.5 w-3 rounded-full transition-all"
            }
          />
        ))}
        <span className="ml-1 text-xs" style={{ color: "var(--band-dim)" }}>
          {t("landing.hero.swap")}
        </span>
      </div>
    </div>
  );
}

/**
 * The dark opening.
 *
 * A pale hero and a pale page make the first screen look like the second one.
 * The deep block is the product's cover — the same surface the dashboard band
 * uses, so the promise made here and the thing you get after signing in are
 * visibly one design.
 *
 * The chain underneath is not decoration: education → skill → profession →
 * work → income → capital is the sentence the whole platform is built on, and
 * it is the same six steps the dashboard tracks you through.
 */
/** The five stages, in the order the product moves people through them. */
const STAGES = ["discover", "learn", "build", "experience", "opportunities"];

/**
 * The opening.
 *
 * Copy on the left, the ecosystem on the right — an asymmetric pair rather
 * than a centred headline over a picture, so the eye is given somewhere to go
 * after the first sentence. The illustration is the argument the words make:
 * five areas, one centre, connected.
 */
/**
 * The opening.
 *
 * A generated ribbon and constellation carry the atmosphere; everything that
 * has to be read is drawn. The artwork covers the section and a scrim holds
 * the left side opaque, so the copy sits on flat ground rather than on
 * whatever the picture happens to be doing there.
 */
function Hero() {
  const { t } = useTranslation();

  return (
    <section className="deep">
      {/*
        The art is sized by the viewport's width, not by the section's height.

        It used to be stretched across `inset-0`, so its box was the section's
        box — and the section's height is set by the text inside it. Switching
        language changes how many lines the headline takes, the section grows
        or shrinks by a line, and `object-cover` re-crops to the new box: the
        photograph visibly slides while only the words were supposed to change.

        The wrapper carries the file's own aspect ratio (1800×1029), so its
        height follows the width — which no translation can alter — and it is
        pinned to the bottom, where the road is. `min-h-full` is the floor: on
        a narrow screen the section is taller than that ratio allows, and there
        the art goes back to filling it rather than leaving a gap. So it is
        fixed wherever it can be and behaves as before where it must.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-20 aspect-[1800/1029] min-h-full w-full"
      >
        <img
          src="/illustrations/hero-road.webp"
          alt=""
          width={1800}
          height={1029}
          fetchPriority="high"
          className="deep-art-dark h-full w-full object-cover object-bottom"
        />
        <img
          src="/illustrations/hero-road-light.webp"
          alt=""
          width={1800}
          height={1029}
          fetchPriority="high"
          className="deep-art-light h-full w-full object-cover object-bottom"
        />
      </div>
      <div aria-hidden className="deep-scrim pointer-events-none absolute inset-0 -z-10" />
      <Lattice className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full opacity-[0.09] sm:block" />

      {/*
        The seam between the hero and the page below it.
        
        The hero keeps its dark surface in both themes — it is a brand ground,
        like a cover. In the light theme that meant a deep violet block ending
        abruptly against a near-white section: a hard line across the page and
        a jolt for the eye. This fades the hero into whatever colour the page
        is, so the two meet instead of colliding, and it works in both themes
        without knowing which one is on: the target is the page token itself.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-52"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in oklab, var(--color-ink-50) 30%, transparent) 42%, color-mix(in oklab, var(--color-ink-50) 78%, transparent) 74%, var(--color-ink-50) 100%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-xl">
          <p
            className="text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--band-dim)" }}
          >
            {t("landing.hero.eyebrow")}
          </p>

          <RotatingHeadline />

          <p
            className="mt-5 max-w-md text-base leading-relaxed sm:text-lg"
            style={{ color: "var(--band-muted)" }}
          >
            {t("landing.hero.lead")}
          </p>

          {/*
            One action, one quiet way to keep reading.

            There were two buttons of equal weight here, and the second one
            pointed at /student/career — a route behind RequireRole. Every
            visitor to this page is signed out by definition, so the most
            prominent secondary control on the site bounced people to a login
            form they had no reason to fill in yet. It now goes to the section
            that answers the question it was really asking.
          */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              to="/auth/register"
              className="rounded-full px-6 py-3 text-sm font-semibold transition-[filter] hover:brightness-95"
              style={{
                background: "var(--color-brand-500)",
                color: "#FFFFFF",
                boxShadow: "0 0 26px color-mix(in oklab, var(--color-brand-400) 55%, transparent)",
              }}
            >
              {t("landing.hero.startJourney")}
            </Link>
            <a
              href="#journey"
              className="group -my-3 inline-flex items-center gap-2 py-3 text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: "var(--band-ink)" }}
            >
              {t("landing.hero.howItWorks")}
              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-y-0.5"
              >
                ↓
              </span>
            </a>
          </div>
        </div>

        <div className="mt-10">
          <StagePath />
        </div>
      </div>
    </section>
  );
}

/**
 * The same five stages again, this time with room to explain them.
 *
 * Laid out as one horizontal run rather than five equal cards: the claim is
 * that the stages follow each other, and a grid of identical boxes says the
 * opposite. The numbers and the rule carry the order.
 */
function JourneySection() {
  const { t } = useTranslation();

  return (
    <Section
      id="journey"
      eyebrow={t("landing.journey.eyebrow")}
      title={t("landing.journey.title")}
      lead={t("landing.journey.lead")}
    >
      {/*
        The rule above each stage fills a fifth further than the one before it.
        By the fifth column it is full.

        That is the section's own sentence — "five stages, each one opens the
        next" — drawn rather than decorated: scanning left to right you watch
        the warm bar accumulate. A flat line under five numbered circles said
        only "these are five things", which is what made it dull.

        Amber carries it because amber is the one warm colour in the system,
        and here it is a bar rather than type: a length is the message, so it
        answers to 3:1 against the page and uses the solved token, not the
        brand amber that measures 1.60:1 on a pale ground.
      */}
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STAGES.map((key, index) => {
          const filled = ((index + 1) / STAGES.length) * 100;
          return (
            <li
              key={key}
              className="card yc-card flex flex-col p-5"
            >
              {/* The bar grows to its value on arrival rather than appearing
                  at it, so the accumulation across the row is something you
                  watch happen once. */}
              <span
                aria-hidden
                className="h-1 w-full overflow-hidden rounded-full"
                style={{
                  background: "color-mix(in oklab, var(--color-ink-300) 55%, transparent)",
                }}
              >
                <span
                  className="yc-fill block h-full rounded-full"
                  style={{
                    background: "var(--color-accent-solid)",
                    animationDelay: `${index * 110}ms`,
                    ["--fill" as string]: `${filled}%`,
                  }}
                />
              </span>

              <span className="mt-4 font-display text-2xl leading-none tabular-nums text-brand-600">
                {String(index + 1).padStart(2, "0")}
              </span>

              <h3 className="mt-3 text-sm font-semibold uppercase tracking-wide text-ink-900">
                {t(`landing.stage.${key}.title`)}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-brand-600">
                {t(`landing.stage.${key}.caption`)}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                {t(`landing.stage.${key}.body`)}
              </p>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

function AudiencePanel({
  eyebrow,
  title,
  lead,
  cards,
  art,
  cta,
  tone,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  cards: DeckCard[];
  art?: ReactNode[];
  cta: string;
  tone: "page" | "surface";
}) {
  return (
    <Section
      tone={tone}
      eyebrow={eyebrow}
      title={title}
      lead={lead}
      /* The call to action moved up beside the heading. It used to sit alone
         in a second column that was otherwise empty, which spent half the
         section's width on one button. */
      action={
        <Link
          to="/auth/register"
          className="inline-block shrink-0 rounded-full bg-brand-fill px-6 py-3 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-fill-hover"
        >
          {cta}
        </Link>
      }
    >
      <AudienceDeck cards={cards} art={art} />
    </Section>
  );
}

function ForStudents() {
  const { t } = useTranslation();
  return (
    <AudiencePanel
      tone="surface"
      eyebrow={t("landing.students.eyebrow")}
      title={t("landing.students.title")}
      lead={t("landing.students.lead")}
      cards={t("landing.students.cards", { returnObjects: true }) as DeckCard[]}
      art={STUDENT_DECK_ART}
      cta={t("landing.cta.createAccount")}
    />
  );
}

function ForEmployers() {
  const { t } = useTranslation();
  return (
    <AudiencePanel
      tone="page"
      eyebrow={t("landing.employers.eyebrow")}
      title={t("landing.employers.title")}
      lead={t("landing.employers.lead")}
      cards={t("landing.employers.cards", { returnObjects: true }) as DeckCard[]}
      art={EMPLOYER_DECK_ART}
      cta={t("landing.employers.cta")}
    />
  );
}

function Pricing({
  plans,
  loading,
  audience,
  onAudience,
}: {
  plans: Plan[];
  loading: boolean;
  audience: "STUDENT" | "EMPLOYER";
  onAudience: (next: "STUDENT" | "EMPLOYER") => void;
}) {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? "uz") as "uz" | "ru" | "en";

  return (
    <Section
      id="pricing"
      eyebrow={t("landing.pricing.eyebrow")}
      title={t("landing.pricing.title")}
      lead={t("landing.pricing.lead")}
    >
      <div
        className="inline-flex rounded-full border border-ink-200 p-0.5"
        role="group"
        aria-label={t("landing.pricing.audience")}
      >
        {(["STUDENT", "EMPLOYER"] as const).map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => onAudience(role)}
            aria-pressed={audience === role}
            className={
              audience === role
                ? "rounded-full bg-brand-fill px-4 py-1.5 text-sm font-semibold text-on-colour coarse:py-3"
                : "rounded-full px-4 py-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900 coarse:py-3"
            }
          >
            {t(role === "STUDENT" ? "auth.roleStudent" : "auth.roleEmployer")}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-64 animate-pulse rounded-(--radius-card) bg-ink-100" />
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={
              plan.tier === "PREMIUM" || plan.tier === "PRO"
                ? "flex flex-col rounded-(--radius-card) border-2 border-brand-600 bg-surface p-6"
                : "flex flex-col rounded-(--radius-card) border border-ink-200 bg-surface p-6"
            }
          >
            <h3 className="font-display text-xl font-semibold text-ink-900">
              {plan.name}
            </h3>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-ink-900">
              {plan.is_free ? t("billing.free") : plan.price_display}
              {!plan.is_free && (
                <span className="ml-1 text-sm font-normal text-ink-500">
                  / {t(`billing.interval.${plan.interval}`)}
                </span>
              )}
            </p>
            <p className="mt-2 text-sm text-ink-600">{plan.description}</p>

            <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-sm text-ink-700">
              {plan.highlights.map((highlight) => (
                <li key={highlight.en} className="flex gap-2">
                  <span aria-hidden className="text-brand-600">✓</span>
                  <span>{highlight[language] || highlight.uz}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/auth/register"
              className="mt-6 rounded-full bg-brand-fill px-5 py-3 text-center text-sm font-semibold text-on-brand transition-colors hover:bg-brand-fill-hover"
            >
              {t("landing.cta.createAccount")}
            </Link>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Faq() {
  const { t } = useTranslation();
  const items = t("landing.faq.items", { returnObjects: true }) as {
    q: string;
    a: string;
  }[];

  return (
    <Section
      tone="surface"
      eyebrow={t("landing.faq.eyebrow")}
      title={t("landing.faq.title")}
    >
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <details
            key={item.q}
            className="group rounded-(--radius-card) border border-ink-200/70 bg-ink-100/55 p-4"
          >
            <summary className="cursor-pointer list-none py-2.5 font-semibold text-ink-900 marker:content-['']">
              <span className="flex items-center justify-between gap-4">
                {item.q}
                <span
                  aria-hidden
                  className="text-ink-400 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </span>
            </summary>
            <p className="mt-2 text-sm text-ink-600">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
