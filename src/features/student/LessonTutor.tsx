import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "@/shared/api/client";

interface AskResponse {
  available: boolean;
  answer: string;
  reason?: string;
  grounded_on?: string[];
  escalate_to?: string;
}

interface Turn {
  question: string;
  reply?: AskResponse;
}

/**
 * "I didn't follow that bit" — asked and answered without leaving the lesson.
 *
 * It sits under the notes because the two are the same movement: the learner
 * has stopped mid-lesson and wants to put something down or clear something
 * up. Sending them to the general assistant to do the second one loses the
 * lesson they were in, which is the only context that makes the question
 * answerable.
 *
 * The reply is grounded in the course's own text — the server will not answer
 * from anywhere else, and hands back which parts of the lesson it read. Those
 * are shown, because an answer a learner cannot check is an answer they have
 * to take on faith, and this one is about what their course taught them.
 *
 * The three unavailable cases are shown as themselves, never as an empty
 * panel: nothing written down to answer from, no model configured, and a
 * question the safety filter stopped.
 */
export function LessonTutor({ lessonId }: { lessonId: string }) {
  const { t } = useTranslation();
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post<AskResponse>(
        `/learning/lessons/${lessonId}/ask/`,
        { question: text },
      );
      return data;
    },
    onSuccess: (reply) => {
      setTurns((all) =>
        all.map((turn, index) =>
          index === all.length - 1 ? { ...turn, reply } : turn,
        ),
      );
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    },
  });

  function send(event: React.FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || ask.isPending) return;
    setTurns((all) => [...all, { question: text }]);
    setQuestion("");
    ask.mutate(text);
  }

  return (
    <section className="glass-raised mt-4 rounded-(--radius-card) p-4">
      <h3 className="text-sm font-semibold text-ink-900">
        {t("courses.tutorTitle")}
      </h3>
      <p className="mt-1 text-xs text-ink-500">{t("courses.tutorHint")}</p>

      {turns.length > 0 && (
        <ol className="mt-3 flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
          {turns.map((turn, index) => (
            <li key={index} className="flex flex-col gap-1.5">
              <p className="self-end rounded-(--radius-control) bg-brand-fill px-3 py-1.5 text-xs text-on-brand">
                {turn.question}
              </p>

              {turn.reply ? (
                <Reply reply={turn.reply} />
              ) : (
                <p className="text-xs text-ink-500" aria-live="polite">
                  {t("courses.tutorThinking")}
                </p>
              )}
            </li>
          ))}
          <div ref={endRef} />
        </ol>
      )}

      {ask.isError && (
        <p role="alert" className="mt-3 text-xs text-danger">
          {t("courses.tutorFailed")}
        </p>
      )}

      <form onSubmit={send} className="mt-3 flex flex-col gap-2">
        <label htmlFor={`tutor-${lessonId}`} className="sr-only">
          {t("courses.tutorTitle")}
        </label>
        <textarea
          id={`tutor-${lessonId}`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={2}
          maxLength={500}
          placeholder={t("courses.tutorPlaceholder")}
          className="w-full resize-y rounded-(--radius-control) border border-ink-300 bg-surface px-3 py-2 text-base text-ink-800 placeholder:text-ink-400 sm:text-sm"
        />
        <button
          type="submit"
          disabled={!question.trim() || ask.isPending}
          className="self-end rounded-(--radius-control) bg-brand-fill px-4 py-2 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-fill-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("courses.tutorAsk")}
        </button>
      </form>
    </section>
  );
}

function Reply({ reply }: { reply: AskResponse }) {
  const { t } = useTranslation();

  if (!reply.available) {
    /* Each refusal says which one it is, and the fallback is NOT "no model".
       That is what this branch got wrong first time round: every reason it did
       not recognise — including a provider call that failed — was reported as
       "the model is not connected", so a bug in our own request sent the owner
       to check an API key that was fine. A cause you have not accounted for is
       an error, not a diagnosis. */
    const key =
      reply.reason === "no_source_text"
        ? "courses.tutorNoSource"
        : reply.reason === "no_provider"
          ? "courses.tutorNoModel"
          : reply.reason === "blocked"
            ? null
            : "courses.tutorFailed";

    return (
      <p className="rounded-(--radius-control) border border-dashed border-ink-300 px-3 py-2 text-xs text-ink-600">
        {key ? t(key) : reply.answer}
      </p>
    );
  }

  return (
    <div className="rounded-(--radius-control) border border-ink-200 bg-surface px-3 py-2">
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-700">
        {reply.answer}
      </p>
      {reply.grounded_on && reply.grounded_on.length > 0 && (
        <p className="mt-2 text-[11px] text-ink-500">
          {t("courses.tutorGroundedOn", {
            sources: reply.grounded_on.join(", "),
          })}
        </p>
      )}
    </div>
  );
}
