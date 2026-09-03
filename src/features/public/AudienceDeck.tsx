import { useState } from "react";

import "@/shared/styles/deck.css";

export interface DeckCard {
  title: string;
  detail: string;
}

/**
 * A hand of flashcards. Click one and it turns over.
 *
 * This replaced a two-column block whose right half held nothing but a button
 * floating in half a screen of empty space, and whose left half was six lines
 * each opened by a tick. Six ticks is a specification, not an argument: the
 * front of a card now carries the promise in two words and the back carries
 * what the product actually does about it, which is the part worth reading and
 * the part there was previously no room for.
 *
 * Each card is a real `<button>`. That is not a detail — it is what makes the
 * deck operable at all without a mouse: focus, the Enter and Space contract,
 * and a place for `aria-expanded` to say whether this card is currently turned
 * over. The side facing away is `aria-hidden`, or a screen reader would read
 * both faces of every card and the whole thing would double.
 *
 * One card is open at a time. Two open cards in a fan overlap each other's
 * text, and the point of turning one over is to read it.
 */
export function AudienceDeck({ cards }: { cards: DeckCard[] }) {
  const [open, setOpen] = useState<number | null>(null);

  /*
   * A plain container rather than a <ul>. The fan needs each button to be the
   * flex item that carries the transform, which from inside an <li> means
   * either `display: contents` on the item — which drops the list role in some
   * screen readers — or matching state through `:has()`. Six buttons in a row
   * are already six buttons; the list wrapper was adding nothing but that
   * problem.
   */
  return (
    <div className="yc-deck">
      {cards.map((card, index) => {
        const isOpen = open === index;
        //: The first card is the entry point, and it is filled to say so.
        const isLead = index === 0;

        /*
         * 17rem tall, and the height is set by the back rather than the front.
         *
         * The face needs room for two words; the back needs room for a whole
         * sentence at roughly 25 characters a line once the padding is taken
         * off a 13rem card. At the 11rem this started as, the longest detail
         * ran past the bottom edge — and a card you have to scroll is not a
         * card. Both faces share the height because they are the same card.
         */
        const faceBase = "yc-deck-face min-h-68 border transition-colors";
        const faceTone = isLead
          ? "border-transparent bg-brand-600 text-on-colour"
          : "border-ink-200 bg-surface";

        return (
          <button
            key={card.title}
            type="button"
            aria-expanded={isOpen}
            onClick={() => setOpen(isOpen ? null : index)}
            className="yc-deck-card rounded-(--radius-card)"
            style={{ ["--i" as string]: index }}
          >
            <span className="yc-deck-inner block">
              <span
                className={`${faceBase} ${faceTone} justify-end gap-2`}
                aria-hidden={isOpen}
              >
                <span
                  className={`font-display text-sm tabular-nums ${
                    isLead ? "text-on-colour/70" : "text-accent-ink"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={`text-base font-semibold leading-snug ${
                    isLead ? "" : "text-ink-900"
                  }`}
                >
                  {card.title}
                </span>
              </span>

              <span
                className={`yc-deck-back ${faceBase} justify-start gap-3 border-ink-200 bg-surface`}
                aria-hidden={!isOpen}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-500">
                  {card.title}
                </span>
                <span className="text-sm leading-relaxed text-ink-700">
                  {card.detail}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
