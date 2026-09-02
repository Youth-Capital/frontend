import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { api } from "@/shared/api/client";
import type { CourseNote, Paginated } from "@/shared/types/api";

/**
 * Reading and writing study notes.
 *
 * One place for the query key so every screen that shows notes — the panel
 * inside a course and the "My notes" page — refreshes together after an edit.
 * A note saved in the panel and stale on the page would look like data loss.
 */

export interface NoteFilters {
  course?: string;
  lesson?: string;
  search?: string;
}

const ROOT = "/learning/my/notes/";

export const notesKey = (filters: NoteFilters = {}) =>
  ["notes", filters.course ?? "", filters.lesson ?? "", filters.search ?? ""] as const;

export function useNotes(filters: NoteFilters = {}, enabled = true) {
  return useQuery({
    queryKey: notesKey(filters),
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: "100" });
      if (filters.course) params.set("course", filters.course);
      if (filters.lesson) params.set("lesson", filters.lesson);
      if (filters.search) params.set("search", filters.search);
      const { data } = await api.get<Paginated<CourseNote>>(
        `${ROOT}?${params.toString()}`,
      );
      return data.results;
    },
    enabled,
  });
}

export interface NoteDraft {
  id?: string;
  course: string;
  lesson: string | null;
  title: string;
  content: string;
}

type SaveOptions = Omit<
  UseMutationOptions<CourseNote, unknown, NoteDraft>,
  "mutationFn"
>;

export function useSaveNote(options: SaveOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<CourseNote, unknown, NoteDraft>({
    mutationFn: async ({ id, ...draft }) => {
      const body = { ...draft, lesson: draft.lesson || null };
      const { data } = id
        ? await api.patch<CourseNote>(`${ROOT}${id}/`, body)
        : await api.post<CourseNote>(ROOT, body);
      return data;
    },
    ...options,
    // Forwarded positionally rather than by name: the callback's arity is
    // TanStack's to change, and this stays correct when it does.
    onSuccess: (...args: Parameters<NonNullable<SaveOptions["onSuccess"]>>) => {
      // Every filtered list is affected: the note may have moved between
      // lessons, and a search that matched it may no longer.
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      options.onSuccess?.(...args);
    },
  });
}

type DeleteOptions = Omit<UseMutationOptions<void, unknown, string>, "mutationFn">;

export function useDeleteNote(options: DeleteOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, string>({
    mutationFn: async (id) => {
      await api.delete(`${ROOT}${id}/`);
    },
    ...options,
    onSuccess: (...args: Parameters<NonNullable<DeleteOptions["onSuccess"]>>) => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      options.onSuccess?.(...args);
    },
  });
}
