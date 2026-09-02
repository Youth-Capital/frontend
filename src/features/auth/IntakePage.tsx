import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { api } from "@/shared/api/client";
import { useApiError } from "@/shared/hooks/useApiError";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/shared/ui/ThemeSwitcher";
import { Button, FullPageSpinner, Input, Textarea } from "@/shared/ui";
import type { IntakeState, IntakeQuestion, SkillOption } from "@/shared/types/api";
import { Logo, LogoMark } from "@/shared/ui/Logo";

/**
 * The intake interview.
 *
 * Presented as a conversation, driven entirely by the server: the client never
 * decides what comes next, so closing the tab and coming back resumes on the
 * same question rather than restarting.
 */
export default function IntakePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const describeError = useApiError();

  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const intake = useQuery({
    queryKey: ["intake"],
    queryFn: async () => {
      const { data } = await api.get<IntakeState>("/ai/intake/");
      return data;
    },
  });

  const send = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await api.post<IntakeState>("/ai/intake/", body);
      return data;
    },
    onSuccess: (data) => {
      setError("");
      queryClient.setQueryData(["intake"], data);
      if (data.status === "COMPLETED") {
        void queryClient.invalidateQueries();
        navigate("/student/dashboard", { replace: true });
      }
    },
    onError: (caught) => setError(describeError(caught)),
  });

  const question = intake.data?.question ?? null;

  // Keep the newest question in view as the conversation grows.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [question?.id]);

  if (intake.isLoading) return <FullPageSpinner />;

  const answered = intake.data?.answered ?? 0;
  const total = intake.data?.total ?? 1;
  const percent = Math.round((answered / Math.max(1, total)) * 100);

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="border-b border-ink-200 bg-surface">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Logo size={36} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink-900">{t("intake.title")}</p>
            <p className="text-xs text-ink-500">
              {t("intake.progress", { answered, total })}
            </p>
          </div>
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
        <div className="h-1 bg-ink-100">
          <div
            className="h-full bg-brand-600 transition-[width] duration-500"
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <Bubble>{t("intake.greeting")}</Bubble>

        {question ? (
          <>
            <Bubble>
              <p className="font-semibold text-ink-900">{t(question.label_key)}</p>
              {question.hint_key && (
                <p className="mt-1 text-sm text-ink-600">{t(question.hint_key)}</p>
              )}
            </Bubble>

            {error && (
              <p role="alert" className="mt-3 rounded-(--radius-control) bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="mt-4">
              <AnswerControl
                key={question.id}
                question={question}
                busy={send.isPending}
                onAnswer={(value) =>
                  send.mutate({ action: "answer", question: question.id, value })
                }
                onSkip={() => send.mutate({ action: "skip", question: question.id })}
              />
            </div>
          </>
        ) : (
          <>
            <Bubble>
              <p className="font-semibold text-ink-900">{t("intake.doneTitle")}</p>
              <p className="mt-1 text-sm text-ink-600">{t("intake.doneBody")}</p>
            </Bubble>
            <div className="mt-4">
              <Button
                onClick={() => send.mutate({ action: "complete" })}
                loading={send.isPending}
              >
                {t("intake.finish")}
              </Button>
            </div>
          </>
        )}

        <div ref={endRef} />
      </main>
    </div>
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700"
      >
        <LogoMark size={18} />
      </span>
      <div className="rounded-(--radius-card) rounded-tl-sm border border-ink-200 bg-surface px-4 py-3 text-ink-800">
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- answers */

function AnswerControl({
  question,
  busy,
  onAnswer,
  onSkip,
}: {
  question: IntakeQuestion;
  busy: boolean;
  onAnswer: (value: unknown) => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();

  switch (question.kind) {
    case "TEXT":
      return <TextAnswer question={question} busy={busy} onAnswer={onAnswer} onSkip={onSkip} />;
    case "SINGLE":
      return (
        <div className="flex flex-wrap gap-2">
          {question.choices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              disabled={busy}
              onClick={() => onAnswer(choice.value)}
              className="rounded-(--radius-control) border border-ink-300 bg-surface px-4 py-2.5 text-sm font-medium text-ink-800 hover:border-brand-600 hover:text-brand-700 disabled:opacity-50"
            >
              {choice.label ?? t(choice.label_key)}
            </button>
          ))}
          {!question.required && (
            <button
              type="button"
              onClick={onSkip}
              disabled={busy}
              className="rounded-(--radius-control) px-4 py-2.5 text-sm text-ink-500 hover:text-ink-800"
            >
              {t("intake.skip")}
            </button>
          )}
        </div>
      );
    case "MULTI":
      return <MultiAnswer question={question} busy={busy} onAnswer={onAnswer} onSkip={onSkip} />;
    case "SKILLS":
      return <SkillsAnswer busy={busy} onAnswer={onAnswer} onSkip={onSkip} />;
    default:
      return null;
  }
}

function TextAnswer({
  question,
  busy,
  onAnswer,
  onSkip,
}: {
  question: IntakeQuestion;
  busy: boolean;
  onAnswer: (value: unknown) => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const long = question.id === "about";

  return (
    <div className="flex flex-col gap-3">
      {long ? (
        <Textarea
          id={question.id}
          label=""
          rows={4}
          value={value}
          placeholder={question.placeholder_key ? t(question.placeholder_key) : ""}
          onChange={(event) => setValue(event.target.value)}
        />
      ) : (
        <Input
          id={question.id}
          label=""
          value={value}
          placeholder={question.placeholder_key ? t(question.placeholder_key) : ""}
          onChange={(event) => setValue(event.target.value)}
        />
      )}
      <div className="flex gap-2">
        <Button
          onClick={() => onAnswer(value)}
          disabled={busy || (question.required && !value.trim())}
        >
          {t("intake.send")}
        </Button>
        {!question.required && (
          <Button variant="ghost" onClick={onSkip} disabled={busy}>
            {t("intake.skip")}
          </Button>
        )}
      </div>
    </div>
  );
}

function MultiAnswer({
  question,
  busy,
  onAnswer,
  onSkip,
}: {
  question: IntakeQuestion;
  busy: boolean;
  onAnswer: (value: unknown) => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (value: string) =>
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {question.choices.map((choice) => {
          const on = selected.includes(choice.value);
          return (
            <button
              key={choice.value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(choice.value)}
              className={
                on
                  ? "rounded-(--radius-control) border-2 border-brand-600 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700"
                  : "rounded-(--radius-control) border border-ink-300 bg-surface px-4 py-2.5 text-sm text-ink-800 hover:border-brand-600"
              }
            >
              {choice.label ?? t(choice.label_key)}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => onAnswer(selected)}
          disabled={busy || (question.required && selected.length === 0)}
        >
          {t("intake.send")}
        </Button>
        {!question.required && (
          <Button variant="ghost" onClick={onSkip} disabled={busy}>
            {t("intake.skip")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Skill picker with a self-assessed level. The level is a claim, and the UI says so. */
function SkillsAnswer({
  busy,
  onAnswer,
  onSkip,
}: {
  busy: boolean;
  onAnswer: (value: unknown) => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{ skill: string; name: string; level: number }[]>([]);

  const results = useQuery({
    queryKey: ["intake-skills", query],
    queryFn: async () => {
      const { data } = await api.get<{ results: SkillOption[] }>(
        `/taxonomy/skills/?search=${encodeURIComponent(query)}&page_size=8`,
      );
      return data.results;
    },
    enabled: query.trim().length >= 2,
  });

  const add = (skill: SkillOption) => {
    if (picked.some((item) => item.skill === skill.id)) return;
    setPicked((current) => [...current, { skill: skill.id, name: skill.name, level: 40 }]);
    setQuery("");
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        id="intake-skill-search"
        label=""
        value={query}
        placeholder={t("intake.searchSkill")}
        onChange={(event) => setQuery(event.target.value)}
      />

      {results.data && results.data.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {results.data.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => add(skill)}
              className="rounded-full border border-ink-300 bg-surface px-3 py-1.5 text-sm text-ink-700 hover:border-brand-600 hover:text-brand-700"
            >
              + {skill.name}
            </button>
          ))}
        </div>
      )}

      {picked.length > 0 && (
        <ul className="flex flex-col gap-2 rounded-(--radius-card) border border-ink-200 bg-surface p-3">
          {picked.map((item, index) => (
            <li key={item.skill} className="flex items-center gap-3">
              <span className="w-40 shrink-0 truncate text-sm text-ink-800">{item.name}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={item.level}
                aria-label={`${item.name} ${t("intake.level")}`}
                className="flex-1 accent-brand-600"
                onChange={(event) =>
                  setPicked((current) =>
                    current.map((row, position) =>
                      position === index
                        ? { ...row, level: Number(event.target.value) }
                        : row,
                    ),
                  )
                }
              />
              <span className="w-10 text-right text-sm tabular-nums text-ink-600">
                {item.level}
              </span>
              <button
                type="button"
                aria-label={t("common.delete")}
                onClick={() =>
                  setPicked((current) => current.filter((_, position) => position !== index))
                }
                className="text-ink-400 hover:text-danger"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-ink-500">{t("intake.skillsDisclaimer")}</p>

      <div className="flex gap-2">
        <Button onClick={() => onAnswer(picked.map(({ skill, level }) => ({ skill, level })))} disabled={busy}>
          {t("intake.send")}
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={busy}>
          {t("intake.skip")}
        </Button>
      </div>
    </div>
  );
}
