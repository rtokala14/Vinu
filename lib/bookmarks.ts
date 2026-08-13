import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { customAxios } from '~/api/custom-axios';
import type { Bookmark, User } from '~/api/models';

/**
 * Bookmarks live on the ABS user object (`user.bookmarks`). The login-time
 * copy in store$.user goes stale as soon as a bookmark is created, so this
 * module keeps a fresh view via GET /api/me and invalidates it after every
 * mutation.
 */

export const BOOKMARKS_QUERY_KEY = ['me', 'bookmarks'] as const;

/** A bookmark with all fields present (raw API fields are optional). */
export type BookmarkEntry = {
  libraryItemId: string;
  title: string;
  /** Item-global position in whole seconds (spans multi-file books). */
  time: number;
  /** Epoch ms. */
  createdAt: number;
};

function toEntry(bm: Bookmark): BookmarkEntry | undefined {
  if (!bm.libraryItemId || bm.time == null) return undefined;
  return {
    libraryItemId: bm.libraryItemId,
    title: bm.title ?? '',
    time: bm.time,
    createdAt: bm.createdAt ?? 0,
  };
}

/**
 * Fresh bookmarks from the server, sorted by time ascending. Pass a
 * libraryItemId to get only that item's bookmarks.
 */
export function useBookmarks(libraryItemId?: string) {
  return useQuery({
    queryKey: BOOKMARKS_QUERY_KEY,
    queryFn: ({ signal }) => customAxios<User>({ url: '/api/me', method: 'GET', signal }),
    select: (user): BookmarkEntry[] =>
      (user.bookmarks ?? [])
        .map(toEntry)
        .filter((bm): bm is BookmarkEntry => bm !== undefined)
        .filter((bm) => !libraryItemId || bm.libraryItemId === libraryItemId)
        .sort((a, b) => a.time - b.time),
  });
}

function useInvalidateBookmarks() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY });
}

/** POST /api/me/item/{id}/bookmark — time is floored to whole seconds. */
export function useCreateBookmark() {
  const invalidate = useInvalidateBookmarks();
  return useMutation({
    mutationFn: ({
      libraryItemId,
      time,
      title,
    }: {
      libraryItemId: string;
      time: number;
      title: string;
    }) =>
      customAxios<Bookmark>({
        url: `/api/me/item/${libraryItemId}/bookmark`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { time: Math.floor(time), title },
      }),
    onSuccess: invalidate,
  });
}

/** PATCH /api/me/item/{id}/bookmark — bookmarks are keyed by (item, time). */
export function useUpdateBookmark() {
  const invalidate = useInvalidateBookmarks();
  return useMutation({
    mutationFn: ({
      libraryItemId,
      time,
      title,
    }: {
      libraryItemId: string;
      time: number;
      title: string;
    }) =>
      customAxios<Bookmark>({
        url: `/api/me/item/${libraryItemId}/bookmark`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        data: { time, title },
      }),
    onSuccess: invalidate,
  });
}

/** DELETE /api/me/item/{id}/bookmark/{time} */
export function useDeleteBookmark() {
  const invalidate = useInvalidateBookmarks();
  return useMutation({
    mutationFn: ({ libraryItemId, time }: { libraryItemId: string; time: number }) =>
      customAxios<void>({
        url: `/api/me/item/${libraryItemId}/bookmark/${time}`,
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}

/** "just now" / "5m ago" / "3h ago" / "2d ago" / "Mar 4" style created date. */
export function formatRelativeDate(epochMs: number): string {
  if (!epochMs) return '';
  const diff = Date.now() - epochMs;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const date = new Date(epochMs);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}
