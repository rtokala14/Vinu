import { observable } from '@legendapp/state';

import { BookChapter } from '~/api/models';

/** Metadata for the media currently loaded in the player. */
export type NowPlaying = {
  libraryItemId: string;
  /** Set when playing a podcast episode. */
  episodeId?: string;
  title: string;
  authorName: string;
  coverUri: string;
  /** Total duration in seconds across all audio tracks. */
  duration: number;
  chapters: BookChapter[];
  /** ABS playback session id — progress is synced against this. */
  sessionId: string;
};

export type SleepTimerState = {
  /** Epoch ms when the timer fires; undefined when inactive. */
  endsAt: number | undefined;
  /** True when the timer should stop at the end of the current chapter. */
  endOfChapter: boolean;
};

export const player$ = observable({
  nowPlaying: undefined as NowPlaying | undefined,
  isPlaying: false,
  /** True while a play session is being opened / tracks are loading. */
  isLoading: false,
  /** Current position in seconds across the whole book (not per-track). */
  position: 0,
  playbackRate: 1,
  sleepTimer: {
    endsAt: undefined,
    endOfChapter: false,
  } as SleepTimerState,
});

/** The chapter containing the current playback position, if any. */
export function getCurrentChapter(): BookChapter | undefined {
  const np = player$.nowPlaying.peek();
  const pos = player$.position.peek();
  if (!np?.chapters?.length) return undefined;
  return np.chapters.find(
    (ch) => (ch.start ?? 0) <= pos && pos < (ch.end ?? Number.MAX_SAFE_INTEGER)
  );
}
