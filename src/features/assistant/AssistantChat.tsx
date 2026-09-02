import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AnswerReceipts } from "./AnswerReceipts";
import { api } from "@/shared/api/client";
import { useAuth } from "@/shared/auth/AuthContext";
import { useApiError } from "@/shared/hooks/useApiError";
import { formatDate } from "@/shared/lib/format";
import { Button, CardSkeleton, Textarea } from "@/shared/ui";
import type { ChatMessage, ChatResponse, ChatState } from "@/shared/types/api";
import { LogoMark } from "@/shared/ui/Logo";

/** Questions worth offering: each maps to something the assistant can actually read. */
const STARTERS: Record<string, string[]> = {
  STUDENT: ["MATCH_EXPLAIN", "MATCH_METHOD", "GAP", "SKILL_EXPLAIN", "NEXT_STEP"],
  EMPLOYER: ["CANDIDATE_EXPLAIN", "MATCH_METHOD", "VACANCY_STATS"],
};

/**
 * The conversation.
 *
 * Past conversations live in threads rather than one endless log, so a
 * question asked last week is still findable beside the answer it got. The
 * list of them is only shown when there is room for it — in the narrow panel
 * it would crowd out the thing you opened the panel to read.
 *
 * Every reply is rendered from an answer code plus the facts the server read,
 * never from free text a model produced. That is why each answer can show its
 * receipts: the numbers underneath are the same rows the screens display.
 */
export function AssistantChat({
  compact = false,
  showHistory = false,
}: {
  compact?: boolean;
  showHistory?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const chat = useQuery({
    queryKey: ["chat", threadId],
    queryFn: async () => {
      const query = threadId ? `?thread=${threadId}` : "";
      const { data } = await api.get<ChatState>(`/ai/chat/${query}`);
      return data;
    },
  });

  const send = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post<ChatResponse>("/ai/chat/", {
        text,
        thread: threadId ?? undefined,
      });
      return data;
    },
    onMutate: (text) => {
      // Show the question immediately; waiting for the round trip to echo it
      // back makes the assistant feel like it did not hear you.
      queryClient.setQueryData<ChatState>(["chat", threadId], (current) =>
        current
          ? {
              ...current,
              messages: [
                ...current.messages,
                {
                  id: `pending-${Date.now()}`,
                  thread: current.thread,
                  author: "USER",
                  text,
                  code: "",
                  intent: "",
                  grounding: {},
                  sources: [],
                  suggestions: [],
                  blocked: false,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : current,
      );
    },
    onSuccess: (data) => {
      setError("");
      // A first message creates the thread server-side; adopt its id so the
      // next question continues the same conversation.
      if (!threadId) setThreadId(data.thread);
      void queryClient.invalidateQueries({ queryKey: ["chat"] });
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (caught) => {
      setError(describeError(caught));
      void queryClient.invalidateQueries({ queryKey: ["chat"] });
    },
  });

  const startNew = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ChatState>("/ai/chat/", { action: "new" });
      return data;
    },
    onSuccess: (data) => {
      setThreadId(data.thread);
      void queryClient.invalidateQueries({ queryKey: ["chat"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/ai/chat/?thread=${id}`);
    },
    onSuccess: () => {
      setThreadId(null);
      void queryClient.invalidateQueries({ queryKey: ["chat"] });
    },
  });

  const messages = chat.data?.messages ?? [];
  const threads = chat.data?.threads ?? [];
  const activeThread = threadId ?? chat.data?.thread ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || send.isPending) return;
    send.mutate(trimmed);
    setDraft("");
  };

  const starters = STARTERS[user?.role ?? "STUDENT"] ?? [];

  const conversation = (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        className={
          compact
            ? "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
            : "flex flex-col gap-3"
        }
      >
        {chat.isLoading && <CardSkeleton rows={3} />}

        {!chat.isLoading && messages.length === 0 && (
          <div className="rounded-(--radius-card) border border-ink-200 bg-ink-50 p-4">
            <p className="font-semibold text-ink-900">{t("chat.emptyTitle")}</p>
            <p className="mt-1 text-sm text-ink-600">{t("chat.emptyBody")}</p>
          </div>
        )}

        {messages.map((message) => (
          <Turn key={message.id} message={message} onAsk={ask} />
        ))}

        <div ref={endRef} />
      </div>

      {/* Only on an empty conversation. They exist to answer "what can I even
          ask", and once a question has been asked that is answered — after
          which a fixed row of the same five chips is just furniture between
          the reader and the input. Contextual follow-ups still appear under
          each answer, where they relate to what was just said. */}
      {starters.length > 0 && messages.length === 0 && (
        <div className="flex flex-wrap gap-1.5">
          {starters.map((intent) => (
            <button
              key={intent}
              type="button"
              onClick={() => ask(t(`chat.starter.${intent}`))}
              disabled={send.isPending}
              className="rounded-full border border-ink-300 px-3 py-1.5 text-xs text-ink-700 hover:border-brand-600 hover:text-brand-700 disabled:opacity-50"
            >
              {t(`chat.starter.${intent}`)}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-(--radius-control) bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(draft);
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1">
          <Textarea
            id="assistant-chat-input"
            label=""
            rows={compact ? 2 : 3}
            value={draft}
            placeholder={t("chat.placeholder")}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter breaks the line — the convention
              // every messenger already taught people.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask(draft);
              }
            }}
          />
        </div>
        <Button type="submit" disabled={send.isPending || !draft.trim()}>
          {t("chat.send")}
        </Button>
      </form>
    </div>
  );

  if (!showHistory) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {conversation}
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => startNew.mutate()}
            disabled={startNew.isPending}
            className="self-start text-xs text-ink-400 hover:text-ink-700"
          >
            {t("chat.newChat")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <aside className="flex w-56 shrink-0 flex-col gap-2 border-r border-ink-200 pr-3">
        <button
          type="button"
          onClick={() => startNew.mutate()}
          disabled={startNew.isPending}
          className="rounded-(--radius-control) border border-ink-300 px-3 py-2 text-sm font-medium text-ink-800 hover:border-brand-600 hover:text-brand-700"
        >
          + {t("chat.newChat")}
        </button>

        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
          {t("chat.history")}
        </p>

        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {threads.length === 0 && (
            <p className="text-xs text-ink-400">{t("chat.noHistory")}</p>
          )}

          {threads.map((thread) => {
            const active = thread.id === activeThread;
            return (
              <div
                key={thread.id}
                className={
                  active
                    ? "group flex items-start gap-1 rounded-(--radius-control) bg-brand-50 px-2 py-1.5"
                    : "group flex items-start gap-1 rounded-(--radius-control) px-2 py-1.5 hover:bg-ink-100"
                }
              >
                <button
                  type="button"
                  onClick={() => setThreadId(thread.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span
                    className={
                      active
                        ? "line-clamp-2 text-xs font-semibold text-brand-700"
                        : "line-clamp-2 text-xs text-ink-700"
                    }
                  >
                    {thread.title || t("chat.untitled")}
                  </span>
                  {thread.last_message_at && (
                    <span className="text-[10px] text-ink-400">
                      {formatDate(thread.last_message_at, i18n.resolvedLanguage)}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(thread.id)}
                  aria-label={t("chat.deleteThread")}
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <span className="text-ink-400 hover:text-danger">✕</span>
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {conversation}
    </div>
  );
}

/* ------------------------------------------------------------------ turns */

function Turn({
  message,
  onAsk,
}: {
  message: ChatMessage;
  onAsk: (text: string) => void;
}) {
  const { t } = useTranslation();

  if (message.author === "USER") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-(--radius-card) rounded-br-sm bg-brand-600 px-4 py-2.5 text-on-colour">
          {message.text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"
      >
        <LogoMark size={18} />
      </span>

      <div className="max-w-[85%] rounded-(--radius-card) rounded-tl-sm border border-ink-200 bg-surface px-4 py-3">
        {/* A configured model phrases the same facts; without one the
            template sentence is used. Either way the receipts below are the
            rows the answer was built from. */}
        <p className="whitespace-pre-wrap text-ink-800">
          {message.text ||
            t(`chat.answer.${message.code}`, {
              defaultValue: t("chat.answer.unknown"),
              ...flatten(message.grounding),
            })}
        </p>

        <AnswerReceipts message={message} />

        {message.suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.suggestions.map((intent) => (
              <button
                key={intent}
                type="button"
                onClick={() => onAsk(t(`chat.starter.${intent}`))}
                className="rounded-full border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:border-brand-600 hover:text-brand-700"
              >
                {t(`chat.starter.${intent}`)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Only scalars can be interpolated into a sentence; objects go to the receipts. */
function flatten(grounding: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(grounding ?? {})) {
    if (typeof value === "string" || typeof value === "number") out[key] = value;
  }
  return out;
}
