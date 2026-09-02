import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "@/shared/api/client";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/shared/ui/ThemeSwitcher";
import type { Plan } from "@/shared/types/api";

import { Lattice, Portal } from "@/shared/ui/geometry";

import { StagePath } from "./StagePath";
import "@/shared/styles/deep.css";
import { Logo } from "@/shared/ui/Logo";

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

  return (
    <div className="min-h-screen bg-ink-50 text-ink-800">
      <SiteHeader />

      <main>
        <Hero />
        <JourneySection />
        <WhatIsIt />
        <ForStudents />
        <ForEmployers />
        <Learning />
        <Assessment />
        <Intelligence />
        <Pricing
          plans={plans.data ?? []}
          loading={plans.isLoading}
          audience={audience}
          onAudience={setAudience}
        />
        <Faq />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ------------------------------------------------------------------ chrome */

function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="deep sticky top-0 z-30 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo size={36} />
          <span className="hidden font-semibold text-ink-900 sm:block">
            {t("app.name")}
          </span>
        </Link>

        <div className="flex-1" />

        <ThemeSwitcher />
        <LanguageSwitcher />

        <Link
          to="/auth/login"
          className="rounded-(--radius-control) px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100"
        >
          {t("auth.login")}
        </Link>
        <Link
          to="/auth/register"
          className="rounded-(--radius-control) bg-brand-600 px-4 py-2 text-sm font-semibold text-on-colour hover:bg-brand-700"
        >
          {t("landing.cta.createAccount")}
        </Link>
      </div>
    </header>
  );
}

function SiteFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-200 bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <span className="font-semibold text-ink-900">{t("app.name")}</span>
          </div>
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
  tone = "page",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  tone?: "page" | "surface";
}) {
  return (
    <section
      id={id}
      className={
        tone === "surface"
          ? "border-y border-ink-200 bg-surface py-16 sm:py-20"
          : "py-16 sm:py-20"
      }
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-2 max-w-3xl font-display text-3xl font-semibold text-balance text-ink-900 sm:text-4xl">
          {title}
        </h2>
        {lead && <p className="mt-3 max-w-2xl text-lg text-ink-600">{lead}</p>}
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  );
}

/**
 * One of the three cards, with room for an illustration above it.
 *
 * The artwork is optional on purpose. It lives in `public/illustrations/` and
 * is dropped in by hand, so the card has to read correctly before the file
 * exists and keep reading correctly if one is ever removed — a broken-image
 * icon on the landing page would be worse than no picture at all. `onError`
 * is what makes that true rather than merely intended.
 */
function Feature({
  title,
  body,
  art,
}: {
  title: string;
  body: string;
  /** File name inside /illustrations, without a leading slash. */
  art?: string;
}) {
  const [artFailed, setArtFailed] = useState(false);

  return (
    <div className="overflow-hidden rounded-(--radius-card) border border-ink-200 bg-surface">
      {art && !artFailed && (
        <img
          src={`/illustrations/${art}`}
          alt=""
          loading="lazy"
          onError={() => setArtFailed(true)}
          className="aspect-[16/10] w-full bg-brand-50 object-cover"
        />
      )}
      <div className="p-5">
        <h3 className="font-semibold text-ink-900">{title}</h3>
        <p className="mt-1.5 text-sm text-ink-600">{body}</p>
      </div>
    </div>
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
        <h1
          className="grid whitespace-pre-line font-display text-4xl font-semibold leading-[1.08] text-balance sm:text-5xl"
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
      <div className="mt-4 flex items-center gap-2">
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
                ? "h-1.5 w-8 rounded-full transition-all"
                : "h-1.5 w-3 rounded-full transition-all"
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
      <img
        src="/illustrations/hero-road.webp"
        alt=""
        className="deep-art-dark pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-bottom"
      />
      <img
        src="/illustrations/hero-road-light.webp"
        alt=""
        className="deep-art-light pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-bottom"
      />
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

          <div className="mt-8 flex flex-wrap gap-3">
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
            <Link
              to="/student/career"
              className="rounded-full px-6 py-3 text-sm font-semibold transition-colors"
              style={{
                border: "1px solid color-mix(in oklab, var(--band-dim) 70%, transparent)",
                color: "var(--band-ink)",
              }}
            >
              {t("landing.hero.exploreCareers")}
            </Link>
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
              className="yc-card flex flex-col rounded-(--radius-card) border border-ink-200 bg-surface p-5"
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

/** Which picture belongs to which panel, and which side it sits on. */
/**
 * Why this is not a course marketplace, in three columns.
 *
 * A row rather than three alternating illustrated panels. The illustrations
 * were pattern work — beautiful, and saying nothing about the argument beside
 * them; three of them down the page turned a claim into a brochure. What is
 * left is the claim itself, set as a document: numbered, ruled, and read left
 * to right in one pass.
 *
 * The rules between columns are what make it read as official rather than as
 * a card grid. Cards with shadows are a product page; ruled columns are a
 * printed page, and this is a state youth programme describing how it works.
 *
 * Each column is headed by the same arch drawn with one more ring than the
 * column before it: one, two, three. That is this section's own sentence —
 * "each strengthens the next" — made visible, because three identical boxes
 * can only ever say "here are three things".
 *
 * This is deliberately not the pattern artwork that used to sit here. That was
 * ornament: handsome, and silent about the argument beside it. This is the
 * platform's real construction from `geometry.tsx`, a two-centred arch whose
 * apex falls at span·√3/2, and what carries the meaning is the count — which
 * a reader can check against the number next to it.
 */
function WhatIsIt() {
  const { t } = useTranslation();

  return (
    <Section
      tone="surface"
      eyebrow={t("landing.panels.eyebrow")}
      title={t("landing.panels.title")}
      lead={t("landing.panels.lead")}
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <article
            key={index}
            className="yc-card flex flex-col overflow-hidden rounded-(--radius-card) border border-ink-200 bg-surface"
            // The stagger is now only in time, not in position: the arches
            // still draw left to right, but the cards line up. A rising row
            // was a nice idea and a bad one — with three different content
            // lengths it read as three misaligned blocks rather than as a
            // progression.
            style={{ ["--yc-stagger" as string]: `${index * 220}ms` }}
          >
            {/* The header: a deep band carrying the numeral inside the arch. */}
            <div
              className="relative flex items-center justify-center px-6 py-8"
              style={{ background: "var(--color-deep)" }}
            >
              <Portal
                rings={index + 1}
                size={104}
                strokeWidth={2}
                // Amber on this ground measures 8.9:1, so the mark carries at
                // a two-pixel stroke without thickening it into a shape.
                className="yc-arch text-accent"
              />
              <span className="absolute bottom-[22%] font-display text-3xl leading-none tabular-nums text-white">
                {index + 1}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-6 lg:p-7">
              <h3 className="font-display text-xl font-semibold leading-snug text-ink-900">
                {t(`landing.panels.${index}.title`)}
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-[1.7] text-ink-600">
                {t(`landing.panels.${index}.body`)}
              </p>

              {/* Outcomes, each opened by a short amber rule. */}
              <ul className="mt-auto flex flex-col gap-2.5 pt-6 text-[0.9375rem] leading-snug text-ink-700">
                {[0, 1, 2].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-2.5 h-0.5 w-4 shrink-0 rounded-full"
                      style={{ background: "var(--color-accent-solid)" }}
                    />
                    {t(`landing.panels.${index}.points.${point}`)}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

function AudiencePanel({
  eyebrow,
  title,
  lead,
  points,
  cta,
  tone,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  points: string[];
  cta: string;
  tone: "page" | "surface";
}) {
  return (
    <Section tone={tone} eyebrow={eyebrow} title={title} lead={lead}>
      <div className="grid gap-8 lg:grid-cols-2">
        <ul className="flex flex-col gap-3">
          {points.map((point) => (
            <li key={point} className="flex gap-3">
              <span aria-hidden className="mt-0.5 text-brand-600">✓</span>
              <span className="text-ink-700">{point}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-start lg:justify-end">
          <Link
            to="/auth/register"
            className="rounded-(--radius-control) bg-brand-600 px-5 py-3 text-sm font-semibold text-on-colour hover:bg-brand-700"
          >
            {cta}
          </Link>
        </div>
      </div>
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
      points={t("landing.students.points", { returnObjects: true }) as string[]}
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
      points={t("landing.employers.points", { returnObjects: true }) as string[]}
      cta={t("landing.employers.cta")}
    />
  );
}

function Learning() {
  const { t } = useTranslation();
  return (
    <Section
      eyebrow={t("landing.learning.eyebrow")}
      title={t("landing.learning.title")}
      lead={t("landing.learning.lead")}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Feature title={t("landing.learning.one.title")} body={t("landing.learning.one.body")} />
        <Feature title={t("landing.learning.two.title")} body={t("landing.learning.two.body")} />
        <Feature title={t("landing.learning.three.title")} body={t("landing.learning.three.body")} />
      </div>
    </Section>
  );
}

function Assessment() {
  const { t } = useTranslation();

  /* Evidence weights are the actual constants the matching engine uses. Shown
     because "verified" meaning something specific is the product's core claim. */
  const EVIDENCE: [string, number][] = [
    ["self", 35],
    ["course", 65],
    ["experience", 70],
    ["mentor", 85],
    ["test", 90],
    ["employer", 100],
  ];

  /*
   * The one section on a dark ground, and the only full-bleed break in the
   * scroll.
   *
   * Every other section is an eyebrow, a title and a grid on the page colour.
   * Ten of those in a row is what made the page monotonous, and the answer is
   * not more ornament on each — it is one place where the page changes state.
   * This is the section that earns it: the published weights are the product's
   * hardest claim, and the numbers are what a sceptical reader came to check.
   */
  return (
    <section className="deep py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p
          className="text-xs font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--band-warm-ink)" }}
        >
          {t("landing.assessment.eyebrow")}
        </p>
        <h2 className="mt-2 max-w-3xl font-display text-3xl font-semibold text-balance sm:text-4xl">
          {t("landing.assessment.title")}
        </h2>
        <p className="mt-3 max-w-2xl text-lg" style={{ color: "var(--band-muted)" }}>
          {t("landing.assessment.lead")}
        </p>

        <ol className="mt-10 flex flex-col">
          {EVIDENCE.map(([source, weight]) => (
            <li
              key={source}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t py-4"
              style={{ borderColor: "color-mix(in oklab, var(--band-dim) 30%, transparent)" }}
            >
              {/* The figure first and large: on this ground the weights are the
                  thing being read, and a row that opens with its number is a
                  table of evidence rather than a list of features. */}
              <span
                className="w-16 shrink-0 font-display text-2xl tabular-nums leading-none"
                style={{ color: "var(--band-warm-ink)" }}
              >
                {(weight / 100).toFixed(2)}
              </span>
              <span className="min-w-40 flex-1 text-base font-semibold">
                {t(`landing.assessment.source.${source}`)}
              </span>
              <span
                aria-hidden
                className="h-1 w-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, var(--band-warm) ${weight}%, color-mix(in oklab, var(--band-dim) 28%, transparent) ${weight}%)`,
                }}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Intelligence() {
  const { t } = useTranslation();
  return (
    <Section
      eyebrow={t("landing.ai.eyebrow")}
      title={t("landing.ai.title")}
      lead={t("landing.ai.lead")}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Feature title={t("landing.ai.recommend.title")} body={t("landing.ai.recommend.body")} />
        <Feature title={t("landing.ai.matching.title")} body={t("landing.ai.matching.body")} />
      </div>

      <div className="mt-6 rounded-(--radius-card) border border-ink-200 bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          {t("landing.ai.explain.title")}
        </p>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ink-700">
          {(t("landing.ai.explain.reasons", { returnObjects: true }) as string[]).map(
            (reason) => (
              <li key={reason} className="flex gap-2">
                <span aria-hidden className="text-brand-600">·</span>
                <span>{reason}</span>
              </li>
            ),
          )}
        </ul>
      </div>
    </Section>
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
                ? "rounded-full bg-brand-600 px-4 py-1.5 text-sm font-semibold text-on-colour"
                : "rounded-full px-4 py-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900"
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
              className="mt-6 rounded-(--radius-control) bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-on-colour hover:bg-brand-700"
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
            className="group rounded-(--radius-card) border border-ink-200 bg-ink-50 p-4"
          >
            <summary className="cursor-pointer list-none font-semibold text-ink-900 marker:content-['']">
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
