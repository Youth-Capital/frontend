import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { api, toApiError } from "@/shared/api/client";
import { LessonVideo } from "@/features/student/LessonVideo";
import {
  Button,
  Card,
  CardHeader,
  CardSkeleton,
  Input,
  Textarea,
  Tile,
  type TileHue,
} from "@/shared/ui";
import type { CourseMaterial, MaterialKind, Paginated } from "@/shared/types/api";

/**
 * What comes with a course, or with one lesson inside it.
 *
 * One form, three placements: the course's own reading list, a lesson's
 * materials, and the course that does not exist yet. The first two POST as you
 * go; the third stages what you add and sends it the moment the course has an
 * id. Building three components would have meant three validators, three
 * upload paths and three places to fix the next bug.
 *
 * Five kinds, and the difference is not cosmetic:
 *
 *   VIDEO  a YouTube or Vimeo link, embedded in the lesson. The server checks
 *          it and builds the embed address itself; the author's raw link never
 *          reaches an iframe. A link it cannot embed is refused rather than
 *          quietly stored as an ordinary link, because an author who picked
 *          "video" is expecting a player.
 *   IMAGE  a diagram or screenshot, shown inline. Not offered as a download:
 *          a picture you have to download to look at is one most learners
 *          will not look at.
 *   FILE   a PDF, offered as a download.
 *   LINK   somewhere else to go.
 *   BOOK   a link with an honest label. The platform does not host the book,
 *          and a download button beside it would be a promise nobody can keep.
 */

/** The palette hue each kind wears, so a list of materials reads by shape. */
export const KIND_HUE: Record<MaterialKind, TileHue> = {
  VIDEO: "pink",
  IMAGE: "sky",
  FILE: "peri",
  LINK: "blue",
  BOOK: "mauve",
};

export const KIND_ICON: Record<MaterialKind, ReactNode> = {
  VIDEO: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
    </svg>
  ),
  IMAGE: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
      <path d="M4 17l4.5-4.5 3.5 3.5 3-3L20 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  FILE: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4zM14 3v4h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  LINK: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.1 0l2.9-2.9a5 5 0 0 0-7.1-7.1L11.5 4.5M14 11a5 5 0 0 0-7.1 0L4 13.9a5 5 0 0 0 7.1 7.1l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  BOOK: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19V6a2 2 0 0 1 2-2h12v15M6 19h12M6 19a2 2 0 0 0 2 2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/** Order matters: the kind each placement usually wants comes first. */
const LESSON_KINDS: MaterialKind[] = ["VIDEO", "IMAGE", "FILE", "LINK", "BOOK"];
const COURSE_KINDS: MaterialKind[] = ["VIDEO", "FILE", "IMAGE", "LINK", "BOOK"];

const ACCEPT: Partial<Record<MaterialKind, string>> = {
  FILE: ".pdf",
  IMAGE: ".jpg,.jpeg,.png,.webp",
  BOOK: ".pdf,.epub",
};

/**
 * What each kind is made of.
 *
 * BOOK is the only "both", and that is the point of it. It began as a link
 * only, which is right for a citation — "Clean Code, chapter 3" — and simply
 * wrong for an author who has the PDF on their desktop and no way to attach
 * it. So the file comes first and the link stays as the honest fallback for a
 * book nobody can upload.
 */
const KIND_INPUT: Record<MaterialKind, "file" | "url" | "both"> = {
  VIDEO: "url",
  IMAGE: "file",
  FILE: "file",
  BOOK: "both",
  LINK: "url",
};

export function carriesFile(kind: MaterialKind) {
  return KIND_INPUT[kind] !== "url";
}

/** A filename without its extension, used when several files arrive at once. */
function titleFromFile(file: File): string {
  const dot = file.name.lastIndexOf(".");
  return (dot > 0 ? file.name.slice(0, dot) : file.name).trim() || file.name;
}

/**
 * A material typed in but not yet sent, because there is nothing to send it to.
 *
 * `file` is held in memory and `previewUrl` is an object URL for showing it —
 * both belong to the browser tab and neither survives a reload, which is why
 * the staging list is deliberately short-lived: it exists between "I am
 * writing a course" and "the course has an id", and no longer.
 */
export interface DraftMaterial {
  key: string;
  kind: MaterialKind;
  title: string;
  description: string;
  url: string;
  file: File | null;
  previewUrl: string | null;
}

/**
 * A courtesy check on a video link, before the server sees it.
 *
 * NOT a security boundary, and deliberately not a port of the server's code.
 * apps/learning/video.py stays the authority: it extracts the id, checks it
 * character by character, and builds the embed address itself. This only
 * spares an author from filling in four fields, pressing the button, and
 * finding out then that they pasted a channel page instead of a video.
 *
 * It is allowed to be wrong in the permissive direction — a link this accepts
 * and the server rejects produces the server's own message, which is the one
 * worth reading anyway. It must never be wrong in the other direction, which
 * is why it is only ever used to show a hint, never to build a src.
 */
export function looksEmbeddable(raw: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const YT_ID = /^[A-Za-z0-9_-]{11}$/;

  if (host === "youtu.be") return YT_ID.test(parsed.pathname.slice(1));
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (parsed.pathname === "/watch") {
      return YT_ID.test(parsed.searchParams.get("v") ?? "");
    }
    return /^\/(embed|v|shorts|live)\/[A-Za-z0-9_-]{11}/.test(parsed.pathname);
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    return /\/\d{6,12}/.test(parsed.pathname);
  }
  return false;
}

/**
 * The first message the server attached to one of these fields.
 *
 * `details` is Record<string, unknown> because DRF puts a different shape
 * under every key — a list of strings for a field error, a nested object for a
 * nested serializer. Narrowing here rather than casting at the call site keeps
 * the one assumption we are making (field errors are lists of strings) in a
 * place where it can be seen.
 */
export function firstDetail(
  details: Record<string, unknown>,
  ...fields: string[]
): string | undefined {
  for (const field of fields) {
    const value = details?.[field];
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    if (typeof value === "string") return value;
  }
  return undefined;
}

/**
 * The server's own sentence, when it has one.
 *
 * "Paste a YouTube or Vimeo link" tells the author what to do next; the
 * generic "the material could not be added" tells them only that something
 * went wrong, leaving them to guess which of four fields was the problem.
 */
export function materialErrorText(
  err: unknown,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const apiError = toApiError(err);
  return (
    firstDetail(apiError.details, "url", "file", "title") ??
    t(`errors.${apiError.code}`, { defaultValue: t("courses.materialFailed") })
  );
}

/** One material, sent. Multipart only when it actually carries bytes. */
export async function postMaterial(
  draft: Omit<DraftMaterial, "key" | "previewUrl">,
  courseId: string,
  lessonId?: string,
) {
  // By whether there IS a file, not by the kind — a BOOK is either.
  if (draft.file) {
    const body = new FormData();
    body.append("course", courseId);
    if (lessonId) body.append("lesson", lessonId);
    body.append("kind", draft.kind);
    body.append("title", draft.title);
    if (draft.description) body.append("description", draft.description);
    body.append("file", draft.file);
    await api.post("/learning/materials/", body);
    return;
  }
  await api.post("/learning/materials/", {
    course: courseId,
    ...(lessonId ? { lesson: lessonId } : {}),
    kind: draft.kind,
    title: draft.title,
    description: draft.description,
    url: draft.url,
  });
}

/* ------------------------------------------------------------------- form */

/**
 * The four fields every material is made of, whatever happens to it next.
 *
 * Hands its parent a draft and clears itself. What the parent does with it —
 * POST it now, or hold it until the course exists — is the parent's business,
 * and is the only thing that differs between the three placements.
 */
function MaterialForm({
  idScope,
  kinds,
  busy,
  error,
  submitLabel,
  onSubmit,
  onKindChange,
}: {
  idScope: string;
  kinds: MaterialKind[];
  busy: boolean;
  error: string;
  submitLabel: string;
  /** An array, because one file picker can hand back six files. */
  onSubmit: (drafts: Omit<DraftMaterial, "key" | "previewUrl">[]) => void;
  onKindChange: () => void;
}) {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<MaterialKind>(kinds[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [touchedUrl, setTouchedUrl] = useState(false);
  const [chosen, setChosen] = useState<File[]>([]);

  const input = KIND_INPUT[kind];
  const takesFile = input !== "url";
  const takesUrl = input !== "file";

  /*
   * A file supplies its own name, so the title box is only required when
   * there is no file to take one from. Insisting on it would make attaching
   * twelve images a matter of typing twelve titles, which is the kind of
   * friction that stops people attaching anything.
   */
  const titleRequired = chosen.length === 0;
  const ready =
    chosen.length > 0
      ? true
      : Boolean(title.trim()) && (takesUrl ? Boolean(url.trim()) : false);

  // Only after the field has been left, so the warning does not appear while
  // someone is still halfway through typing the address.
  const badVideo =
    kind === "VIDEO" && touchedUrl && url.trim() !== "" && !looksEmbeddable(url);

  const reset = () => {
    setTitle("");
    setDescription("");
    setUrl("");
    setTouchedUrl(false);
    setChosen([]);
    if (fileInput.current) fileInput.current.value = "";
  };

  const submit = () => {
    const base = { kind, description: description.trim() };

    if (chosen.length > 0) {
      /*
       * One material per file. With a single file the typed title wins if
       * there is one; with several it cannot — six files cannot share a name
       * and still be told apart in the list — so each takes its own filename.
       */
      const typed = title.trim();
      onSubmit(
        chosen.map((file) => ({
          ...base,
          title: chosen.length === 1 && typed ? typed : titleFromFile(file),
          url: "",
          file,
        })),
      );
    } else {
      onSubmit([{ ...base, title: title.trim(), url: url.trim(), file: null }]);
    }
    reset();
  };

  return (
    <div className="flex flex-col gap-4">
      {/*
        All five kinds on screen at once.

        This was a dropdown, and a dropdown showing one of five options is
        what made the block read as "choose a single thing" — the other four
        were a click away and out of sight. Laid out, it is obvious that a
        course can have a video and a set of slides and a book, and the list
        above is where they accumulate.
      */}
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="mb-2 text-sm font-medium text-ink-700">
          {t("courses.materialKind")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {kinds.map((value) => {
            const active = value === kind;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setKind(value);
                  setTouchedUrl(false);
                  setChosen([]);
                  if (fileInput.current) fileInput.current.value = "";
                  onKindChange();
                }}
                className={
                  active
                    ? "flex items-center gap-2 rounded-full border border-brand-edge bg-brand-fill px-3 py-1.5 text-sm font-medium text-on-brand"
                    : "glass flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-400"
                }
              >
                <Tile hue={KIND_HUE[value]} size="xs">
                  {KIND_ICON[value]}
                </Tile>
                {t(`courses.material_${value}`)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {takesFile && (
        <div>
          <label
            htmlFor={`material-file-${idScope}`}
            className="mb-1 block text-sm font-medium text-ink-700"
          >
            {t(
              kind === "IMAGE"
                ? "courses.materialImage"
                : kind === "BOOK"
                  ? "courses.materialBookFile"
                  : "courses.materialFile",
            )}
          </label>
          <input
            id={`material-file-${idScope}`}
            ref={fileInput}
            type="file"
            multiple
            accept={ACCEPT[kind]}
            onChange={(event) =>
              setChosen(Array.from(event.target.files ?? []))
            }
            className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-full file:border file:border-brand-edge file:bg-brand-fill file:px-3 file:py-1.5 file:text-on-brand"
          />
          <p className="mt-1 text-xs text-ink-500">
            {t(
              kind === "IMAGE"
                ? "courses.materialImageHint"
                : kind === "BOOK"
                  ? "courses.materialBookFileHint"
                  : "courses.materialFileHint",
            )}
          </p>
          {chosen.length > 1 && (
            <p className="mt-1 text-xs font-medium text-accent-ink">
              {t("courses.filesChosen", { count: chosen.length })}
            </p>
          )}
        </div>
      )}

      {takesUrl && (
        <Input
          id={`material-url-${idScope}`}
          label={t(
            kind === "VIDEO"
              ? "courses.materialVideoUrl"
              : kind === "BOOK"
                ? "courses.materialBookLink"
                : "courses.materialUrl",
          )}
          hint={
            kind === "VIDEO"
              ? t("courses.materialVideoHint")
              : kind === "BOOK"
                ? t("courses.materialBookHint")
                : undefined
          }
          error={badVideo ? t("courses.material_video_not_embeddable") : undefined}
          value={url}
          /* A book with a file does not need a link as well, and offering an
             enabled box for one invites filling in both. */
          disabled={kind === "BOOK" && chosen.length > 0}
          onBlur={() => setTouchedUrl(true)}
          onChange={(event) => setUrl(event.target.value)}
        />
      )}

      <Input
        id={`material-title-${idScope}`}
        label={t("courses.materialTitle")}
        hint={
          takesFile && !titleRequired ? t("courses.titleFromFileHint") : undefined
        }
        required={titleRequired}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <Textarea
        id={`material-description-${idScope}`}
        label={t("courses.materialDescription")}
        hint={t("courses.materialDescriptionHint")}
        rows={2}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={!ready || busy} loading={busy}>
          {chosen.length > 1
            ? t("courses.addMaterials", { count: chosen.length })
            : submitLabel}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- live editor */

export function MaterialsEditor({
  courseId,
  lessonId,
}: {
  courseId: string;
  /** Omit for the course-wide reading list. */
  lessonId?: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const scoped = Boolean(lessonId);
  const [error, setError] = useState("");
  const queryKey = ["course-materials", courseId, lessonId ?? "all"];

  const materials = useQuery({
    queryKey,
    queryFn: async () => {
      const scope = lessonId ? `&lesson=${lessonId}` : "";
      const { data } = await api.get<Paginated<CourseMaterial>>(
        `/learning/materials/?course=${courseId}${scope}&page_size=100`,
      );
      return data.results;
    },
  });

  const refresh = () => void queryClient.invalidateQueries({ queryKey });

  const add = useMutation({
    /*
     * Sequential, not concurrent. `order` follows insertion, so twelve images
     * dropped at once should end up in the order they were picked — and a
     * failure half way through should leave a prefix attached and stop, not
     * an arbitrary subset with no way to tell which.
     */
    mutationFn: async (drafts: Omit<DraftMaterial, "key" | "previewUrl">[]) => {
      for (const draft of drafts) {
        await postMaterial(draft, courseId, lessonId);
      }
    },
    onSuccess: () => {
      setError("");
      refresh();
    },
    onError: (err) => {
      setError(materialErrorText(err, t));
      // Some of a batch may have landed before the failure; show what did.
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/learning/materials/${id}/`);
    },
    onSuccess: refresh,
  });

  return (
    <Card>
      <CardHeader
        title={t(scoped ? "courses.lessonMaterials" : "courses.materials")}
        subtitle={t(scoped ? "courses.lessonMaterialsHint" : "courses.materialsHint")}
      />

      {materials.isLoading && <CardSkeleton rows={2} />}

      {materials.data?.length === 0 && (
        <p className="mb-4 text-sm text-ink-500">{t("courses.noMaterialsYet")}</p>
      )}

      {(materials.data?.length ?? 0) > 0 && (
        <ul className="mb-5 flex flex-col gap-2">
          {materials.data?.map((item) => (
            <MaterialRow
              key={item.id}
              material={item}
              onRemove={() => remove.mutate(item.id)}
              removing={remove.isPending && remove.variables === item.id}
            />
          ))}
        </ul>
      )}

      <MaterialForm
        idScope={lessonId ?? courseId}
        kinds={scoped ? LESSON_KINDS : COURSE_KINDS}
        busy={add.isPending}
        error={error}
        submitLabel={t("courses.addMaterial")}
        onSubmit={(drafts) => add.mutate(drafts)}
        onKindChange={() => setError("")}
      />
    </Card>
  );
}

/* ----------------------------------------------------------- staged editor */

/**
 * The same form, for a course that does not exist yet.
 *
 * A material needs a course id, and until the course is created there is not
 * one. The alternative — quietly creating a draft course the moment somebody
 * types a title — would put rows in the database that nobody asked for, and
 * leave an empty draft behind every time an author opened this page and
 * changed their mind. So what is added here is held in the tab and sent the
 * instant the course has an id.
 *
 * The list does not survive a reload, and the subtitle says so: these are
 * files and text in browser memory, not a saved draft, and implying otherwise
 * is the kind of promise that loses somebody an afternoon.
 */
export function StagedMaterialsEditor({
  staged,
  onStage,
  onUnstage,
  error,
  onRetry,
  retrying,
}: {
  staged: DraftMaterial[];
  onStage: (draft: Omit<DraftMaterial, "key" | "previewUrl">) => void;
  onUnstage: (key: string) => void;
  /** Set when the course was created but a material would not go up. */
  error?: string;
  /**
   * Present once the course exists and some of these did not make it.
   *
   * Without it the leftovers would be stranded: the course is saved, the page
   * has moved on to the real editor, and the files are still sitting in the
   * tab with nothing able to send them.
   */
  onRetry?: () => void;
  retrying?: boolean;
}) {
  const { t } = useTranslation();
  const leftover = Boolean(onRetry);

  return (
    <Card>
      <CardHeader
        title={t("courses.materials")}
        subtitle={t(
          leftover ? "courses.materialsNotSentHint" : "courses.stagedMaterialsHint",
        )}
        action={
          onRetry && (
            <Button size="sm" onClick={onRetry} loading={retrying}>
              {t("courses.retryMaterials")}
            </Button>
          )
        }
      />

      {staged.length === 0 ? (
        <p className="mb-4 text-sm text-ink-500">{t("courses.noMaterialsYet")}</p>
      ) : (
        <ul className="mb-5 flex flex-col gap-2">
          {staged.map((draft) => (
            <StagedRow
              key={draft.key}
              draft={draft}
              onRemove={() => onUnstage(draft.key)}
            />
          ))}
        </ul>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      {/* Once the course exists, new material goes straight to the live editor
          below — a second form adding to a pile of leftovers would be two
          places to add the same thing. */}
      {!leftover && (
        <MaterialForm
          idScope="new-course"
          kinds={COURSE_KINDS}
          busy={false}
          error=""
          submitLabel={t("courses.addMaterial")}
          onSubmit={(drafts) => drafts.forEach(onStage)}
          onKindChange={() => {}}
        />
      )}
    </Card>
  );
}

/* --------------------------------------------------------------------- rows */

/**
 * One attached material.
 *
 * A video and an image get shown, not just listed. An author who pastes the
 * wrong YouTube link should find that out here, from the frame in front of
 * them, rather than from a learner three weeks later — which is the same
 * reason the lesson's own video is previewed in the editor above.
 */
function MaterialRow({
  material,
  onRemove,
  removing,
}: {
  material: CourseMaterial;
  onRemove: () => void;
  removing: boolean;
}) {
  const href = material.file_url ?? material.url;

  return (
    <li className="glass rounded-(--radius-control) p-3">
      <RowHead
        kind={material.kind}
        title={material.title}
        href={href}
        size={material.file_size}
        description={material.description}
        onRemove={onRemove}
        removing={removing}
      />

      {material.kind === "VIDEO" && material.video && (
        <div className="mt-3">
          <LessonVideo video={material.video} />
        </div>
      )}

      {material.kind === "IMAGE" && material.file_url && (
        <img
          src={material.file_url}
          /* The title is the caption an author wrote for this picture, so it
             is also the best alt text available without asking twice. */
          alt={material.title}
          loading="lazy"
          className="mt-3 max-h-64 w-full rounded-(--radius-control) object-contain"
        />
      )}
    </li>
  );
}

/** One material waiting for the course to exist. */
function StagedRow({
  draft,
  onRemove,
}: {
  draft: DraftMaterial;
  onRemove: () => void;
}) {
  const { t } = useTranslation();

  return (
    <li className="glass rounded-(--radius-control) p-3">
      <RowHead
        kind={draft.kind}
        title={draft.title}
        href={null}
        size={draft.file?.size ?? null}
        description={draft.description}
        onRemove={onRemove}
        removing={false}
        note={t("courses.pendingMaterial")}
      />

      {/* An image can be previewed from the file itself. A video cannot: the
          embed address is built by the server from an id it has checked, and
          building one here would be exactly the hole that check exists to
          close. So it stays a row until the course is created. */}
      {draft.kind === "IMAGE" && draft.previewUrl && (
        <img
          src={draft.previewUrl}
          alt={draft.title}
          className="mt-3 max-h-48 w-full rounded-(--radius-control) object-contain"
        />
      )}
    </li>
  );
}

function RowHead({
  kind,
  title,
  href,
  size,
  description,
  onRemove,
  removing,
  note,
}: {
  kind: MaterialKind;
  title: string;
  href: string | null;
  size: number | null;
  description: string;
  onRemove: () => void;
  removing: boolean;
  note?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-3">
      <Tile hue={KIND_HUE[kind]} size="sm">
        {KIND_ICON[kind]}
      </Tile>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {t(`courses.material_${kind}`)}
          </span>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="min-w-0 truncate text-sm font-medium text-brand-700 hover:underline"
            >
              {title}
            </a>
          ) : (
            <span className="min-w-0 truncate text-sm font-medium text-ink-800">
              {title}
            </span>
          )}
          {size != null && (
            <span className="text-xs tabular-nums text-ink-400">
              {Math.max(1, Math.round(size / 1024))} KB
            </span>
          )}
          {note && (
            <span className="text-xs font-medium text-accent-ink">{note}</span>
          )}
        </div>
        {description && <p className="mt-0.5 text-xs text-ink-500">{description}</p>}
      </div>

      <Button variant="ghost" size="sm" onClick={onRemove} loading={removing}>
        {t("common.delete")}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------- the staging */

/**
 * The staging list, as a hook, so the page that owns it does not also have to
 * own object-URL bookkeeping.
 *
 * An object URL keeps its File alive until it is revoked, so a handful of
 * forgotten ones is a handful of forgotten uploads sitting in memory for the
 * life of the tab. Each is revoked when its draft is removed, when it has been
 * sent, and when the page unmounts.
 */
export function useStagedMaterials() {
  const [staged, setStaged] = useState<DraftMaterial[]>([]);
  const nextKey = useRef(0);
  /*
   * A mirror of the list, for the two places that must not re-run per change:
   * the unmount cleanup (revoking on every change would kill the URL of a
   * draft still on screen) and `flush` (which must not be rebuilt on every
   * keystroke). Written in an effect rather than during render — React 19
   * renders twice in StrictMode, and a render is not the place for a side
   * effect even an idempotent one.
   */
  const latest = useRef<DraftMaterial[]>([]);
  useEffect(() => {
    latest.current = staged;
  }, [staged]);

  useEffect(
    () => () => {
      for (const draft of latest.current) {
        if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
      }
    },
    [],
  );

  const stage = (draft: Omit<DraftMaterial, "key" | "previewUrl">) => {
    nextKey.current += 1;
    setStaged((list) => [
      ...list,
      {
        ...draft,
        key: `draft-${nextKey.current}`,
        previewUrl:
          draft.kind === "IMAGE" && draft.file
            ? URL.createObjectURL(draft.file)
            : null,
      },
    ]);
  };

  const unstage = (key: string) =>
    setStaged((list) => {
      const going = list.find((draft) => draft.key === key);
      if (going?.previewUrl) URL.revokeObjectURL(going.previewUrl);
      return list.filter((draft) => draft.key !== key);
    });

  /**
   * Send everything staged, in the order it was added, and keep whatever
   * would not go.
   *
   * Sequential rather than concurrent on purpose: `order` follows insertion,
   * and a failure part-way through should leave a prefix uploaded and the rest
   * still in hand, not an arbitrary subset. Returns the first error unformatted
   * so the caller can run it through `materialErrorText` with its own `t` —
   * the server's sentence is the one worth showing.
   */
  const flush = async (courseId: string): Promise<unknown | null> => {
    const failed: DraftMaterial[] = [];
    let firstError: unknown = null;

    for (const draft of latest.current) {
      try {
        await postMaterial(draft, courseId);
        if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
      } catch (err) {
        failed.push(draft);
        if (firstError === null) firstError = err;
      }
    }

    setStaged(failed);
    latest.current = failed;
    return firstError;
  };

  return { staged, stage, unstage, flush };
}
