import { MMKV } from 'react-native-mmkv';
import TrackPlayer, { type AddTrack, State } from 'react-native-track-player';

import { ensurePlayerSetup } from './setup';
import { getCurrentChapter, player$ } from './state';

import { customAxios } from '~/api/custom-axios';
import { BookChapter } from '~/api/models';
import { getCoverUri } from '~/lib/utils';
import { store$ } from '~/stores';

// ---------------------------------------------------------------------------
// ABS play-session response (minimal shape we consume)
// ---------------------------------------------------------------------------

type SessionAudioTrack = {
  index?: number;
  startOffset?: number;
  duration?: number;
  contentUrl?: string;
  mimeType?: string;
  title?: string;
};

type PlaySessionResponse = {
  id: string;
  currentTime?: number;
  playMethod?: number;
  displayTitle?: string;
  displayAuthor?: string;
  audioTracks?: SessionAudioTrack[];
  chapters?: BookChapter[];
  libraryItem?: {
    media?: {
      metadata?: { title?: string; authorName?: string; seriesName?: string };
      chapters?: BookChapter[];
      duration?: number;
    };
  };
};

// ---------------------------------------------------------------------------
// Module state (per loaded session)
// ---------------------------------------------------------------------------

type LoadedTrack = { startOffset: number; duration: number };

let loadedTracks: LoadedTrack[] = [];
let activeTrackIndex = 0;
let sessionId: string | undefined;

let syncTimer: ReturnType<typeof setInterval> | undefined;
let syncInFlight = false;
/** Wall-clock seconds listened since the last successful sync (NOT rate-scaled). */
let listenedSec = 0;
/** Epoch ms when playback last (re)started; undefined while paused. */
let playingSince: number | undefined;

let sleepTimeout: ReturnType<typeof setTimeout> | undefined;
/** Global book position (sec) at which an end-of-chapter sleep timer fires. */
let sleepChapterEnd: number | undefined;

/** True when we paused because of a transient audio-focus loss (RemoteDuck). */
let duckPaused = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const deviceStorage = new MMKV({ id: 'vinu-player' });

function getDeviceId(): string {
  let id = deviceStorage.getString('deviceId');
  if (!id) {
    id = `vinu-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    deviceStorage.set('deviceId', id);
  }
  return id;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Maps a global book position to the audio track containing it. */
function trackForPosition(globalSeconds: number): { index: number; offset: number } {
  for (let i = 0; i < loadedTracks.length; i++) {
    const t = loadedTracks[i];
    if (globalSeconds >= t.startOffset && globalSeconds < t.startOffset + t.duration) {
      return { index: i, offset: globalSeconds - t.startOffset };
    }
  }
  const last = loadedTracks.length - 1;
  if (last >= 0) {
    const t = loadedTracks[last];
    return { index: last, offset: clamp(globalSeconds - t.startOffset, 0, t.duration) };
  }
  return { index: 0, offset: 0 };
}

/** Accumulates wall-clock listened time up to now. */
function flushListened(): void {
  if (playingSince !== undefined) {
    listenedSec += (Date.now() - playingSince) / 1000;
    playingSince = Date.now();
  }
}

// ---------------------------------------------------------------------------
// Progress sync engine
// ---------------------------------------------------------------------------

const SYNC_INTERVAL_MS = 15_000;

function startSyncLoop(): void {
  stopSyncLoop();
  syncTimer = setInterval(() => {
    if (player$.isPlaying.peek()) void syncNow();
  }, SYNC_INTERVAL_MS);
}

function stopSyncLoop(): void {
  if (syncTimer !== undefined) {
    clearInterval(syncTimer);
    syncTimer = undefined;
  }
}

/**
 * Fire-and-forget progress sync to the open ABS session. Never throws —
 * offline failures keep the listened time and retry on the next sync.
 */
export async function syncNow(): Promise<void> {
  if (!sessionId || syncInFlight) return;
  syncInFlight = true;
  flushListened();
  const timeListened = listenedSec;
  listenedSec = 0;
  const id = sessionId;
  try {
    await customAxios({
      url: `/api/session/${id}/sync`,
      method: 'POST',
      data: {
        currentTime: player$.position.peek(),
        timeListened,
        duration: player$.nowPlaying.peek()?.duration ?? 0,
      },
    });
  } catch {
    // Offline / server hiccup: re-accumulate so the time isn't lost.
    listenedSec += timeListened;
  } finally {
    syncInFlight = false;
  }
}

/** Final sync + close of the currently open session, then clears session state. */
async function closeSession(): Promise<void> {
  stopSyncLoop();
  const id = sessionId;
  sessionId = undefined;
  if (!id) return;
  flushListened();
  playingSince = undefined;
  const timeListened = listenedSec;
  listenedSec = 0;
  try {
    await customAxios({
      url: `/api/session/${id}/close`,
      method: 'POST',
      data: {
        currentTime: player$.position.peek(),
        timeListened,
        duration: player$.nowPlaying.peek()?.duration ?? 0,
      },
    });
  } catch {
    // Best effort — ABS expires orphaned sessions on its own.
  }
}

// ---------------------------------------------------------------------------
// Public API (contract in lib/player/index.ts)
// ---------------------------------------------------------------------------

/**
 * Opens an ABS play session for the item and starts playback. If the same
 * item (and episode) is already loaded, simply resumes instead.
 */
export async function playLibraryItem(
  itemId: string,
  opts?: { episodeId?: string; startAtTime?: number }
): Promise<void> {
  const current = player$.nowPlaying.peek();
  if (
    current &&
    sessionId &&
    current.libraryItemId === itemId &&
    current.episodeId === opts?.episodeId
  ) {
    if (opts?.startAtTime !== undefined) await seekTo(opts.startAtTime);
    duckPaused = false;
    await TrackPlayer.play();
    return;
  }

  player$.isLoading.set(true);
  try {
    await ensurePlayerSetup();

    // Tear down any previous session with a final sync before switching.
    if (sessionId) {
      await TrackPlayer.pause().catch(() => {});
      await closeSession();
    }

    const serverUrl = store$.settings.serverUrl.peek();
    const token = store$.userToken.peek() ?? '';
    const path = opts?.episodeId
      ? `/api/items/${itemId}/play/${opts.episodeId}`
      : `/api/items/${itemId}/play`;

    const session = await customAxios<PlaySessionResponse>({
      url: path,
      method: 'POST',
      data: {
        deviceInfo: { clientName: 'Vinu', deviceId: getDeviceId() },
        supportedMimeTypes: [
          'audio/flac',
          'audio/mpeg',
          'audio/mp4',
          'audio/ogg',
          'audio/aac',
          'audio/webm',
        ],
        mediaPlayer: 'vinu',
        forceDirectPlay: true,
      },
    });

    const audioTracks = session.audioTracks ?? [];
    if (audioTracks.length === 0) {
      throw new Error('Play session returned no audio tracks');
    }

    loadedTracks = audioTracks.map((t) => ({
      startOffset: t.startOffset ?? 0,
      duration: t.duration ?? 0,
    }));
    const totalDuration = loadedTracks.reduce((sum, t) => sum + t.duration, 0);

    const chapters = (session.libraryItem?.media?.chapters ?? session.chapters ?? []).filter(
      (ch): ch is NonNullable<BookChapter> => ch != null
    );
    const metadata = session.libraryItem?.media?.metadata;
    const title = metadata?.title ?? session.displayTitle ?? 'Unknown title';
    const authorName = metadata?.authorName ?? session.displayAuthor ?? '';
    const coverUri = getCoverUri(itemId, serverUrl);
    const artwork = coverUri ? `${coverUri}&token=${encodeURIComponent(token)}` : undefined;
    const rate = store$.settings.playbackRate.peek() || 1;

    const queue: AddTrack[] = audioTracks.map((t) => ({
      url: `${serverUrl}${t.contentUrl}?token=${encodeURIComponent(token)}`,
      contentType: t.mimeType,
      title,
      artist: authorName,
      album: title,
      artwork,
      duration: t.duration,
      headers: { Authorization: `Bearer ${token}` },
    }));

    const startTime = clamp(opts?.startAtTime ?? session.currentTime ?? 0, 0, totalDuration);
    const { index, offset } = trackForPosition(startTime);

    await TrackPlayer.reset();
    await TrackPlayer.add(queue);
    await TrackPlayer.skip(index, offset);
    await TrackPlayer.setRate(rate);

    sessionId = session.id;
    activeTrackIndex = index;
    listenedSec = 0;
    playingSince = undefined;
    duckPaused = false;

    player$.nowPlaying.set({
      libraryItemId: itemId,
      episodeId: opts?.episodeId,
      title,
      authorName,
      coverUri,
      duration: totalDuration,
      chapters,
      sessionId: session.id,
    });
    player$.position.set(startTime);
    player$.playbackRate.set(rate);

    startSyncLoop();
    await TrackPlayer.play();
  } catch (err) {
    console.warn('playLibraryItem failed:', err);
    throw err;
  } finally {
    player$.isLoading.set(false);
  }
}

export async function togglePlayPause(): Promise<void> {
  if (!player$.nowPlaying.peek()) return;
  if (player$.isPlaying.peek()) {
    await TrackPlayer.pause();
    void syncNow();
  } else {
    duckPaused = false;
    await TrackPlayer.play();
  }
}

/** Seeks to a global book position (seconds), crossing tracks when needed. */
export async function seekTo(globalSeconds: number): Promise<void> {
  const np = player$.nowPlaying.peek();
  if (!np) return;
  const target = clamp(globalSeconds, 0, np.duration);
  const { index, offset } = trackForPosition(target);
  if (index !== activeTrackIndex) {
    activeTrackIndex = index;
    await TrackPlayer.skip(index, offset);
  } else {
    await TrackPlayer.seekTo(offset);
  }
  player$.position.set(target);
  void syncNow();
}

export async function jumpForward(): Promise<void> {
  const jump = store$.settings.jumpForwardSec.peek() || 30;
  await seekTo(player$.position.peek() + jump);
}

export async function jumpBackward(): Promise<void> {
  const jump = store$.settings.jumpBackwardsSec.peek() || 30;
  await seekTo(player$.position.peek() - jump);
}

/** Applies the rate to the player and persists it as the user's preference. */
export async function setPlaybackRate(rate: number): Promise<void> {
  const clamped = clamp(rate, 0.5, 3);
  player$.playbackRate.set(clamped);
  store$.settings.playbackRate.set(clamped);
  await TrackPlayer.setRate(clamped).catch(() => {});
}

// ---------------------------------------------------------------------------
// Sleep timer
// ---------------------------------------------------------------------------

export function startSleepTimer(opts: { minutes?: number; endOfChapter?: boolean }): void {
  cancelSleepTimer();
  if (opts.endOfChapter) {
    const np = player$.nowPlaying.peek();
    sleepChapterEnd = getCurrentChapter()?.end ?? np?.duration;
    player$.sleepTimer.set({ endsAt: undefined, endOfChapter: true });
  } else if (opts.minutes && opts.minutes > 0) {
    const ms = opts.minutes * 60_000;
    sleepTimeout = setTimeout(() => void fireSleepTimer(), ms);
    player$.sleepTimer.set({ endsAt: Date.now() + ms, endOfChapter: false });
  }
}

export function cancelSleepTimer(): void {
  if (sleepTimeout !== undefined) {
    clearTimeout(sleepTimeout);
    sleepTimeout = undefined;
  }
  sleepChapterEnd = undefined;
  player$.sleepTimer.set({ endsAt: undefined, endOfChapter: false });
}

async function fireSleepTimer(): Promise<void> {
  cancelSleepTimer();
  await TrackPlayer.pause().catch(() => {});
  void syncNow();
}

// ---------------------------------------------------------------------------
// Stop / teardown
// ---------------------------------------------------------------------------

/** Final sync, closes the ABS session, resets RNTP and clears player state. */
export async function stopPlayback(): Promise<void> {
  cancelSleepTimer();
  await TrackPlayer.pause().catch(() => {});
  await closeSession();
  await TrackPlayer.reset().catch(() => {});
  loadedTracks = [];
  activeTrackIndex = 0;
  duckPaused = false;
  player$.nowPlaying.set(undefined);
  player$.isPlaying.set(false);
  player$.position.set(0);
}

// ---------------------------------------------------------------------------
// Internal handlers — wired up by the playback service (lib/player/service.ts)
// ---------------------------------------------------------------------------

/** Keeps player$.isPlaying and the listened-time accounting in sync. */
export function handlePlaybackState(state: State): void {
  const playing = state === State.Playing;
  const wasPlaying = player$.isPlaying.peek();
  if (playing && !wasPlaying) {
    playingSince = Date.now();
  } else if (!playing && wasPlaying) {
    flushListened();
    playingSince = undefined;
  }
  player$.isPlaying.set(playing);
}

/**
 * Progress tick (fires ~1/s while playing). Maintains the GLOBAL book
 * position and drives the end-of-chapter sleep timer.
 */
export function handleProgress(event: { position: number; track: number }): void {
  if (!player$.nowPlaying.peek()) return;
  activeTrackIndex = event.track;
  const offset = loadedTracks[event.track]?.startOffset ?? 0;
  const globalPos = offset + event.position;
  player$.position.set(globalPos);

  if (
    player$.sleepTimer.endOfChapter.peek() &&
    sleepChapterEnd !== undefined &&
    globalPos >= sleepChapterEnd - 0.25
  ) {
    void fireSleepTimer();
  }
}

/** Multi-file books: keep position bookkeeping correct across track changes. */
export async function handleActiveTrackChanged(index: number | undefined): Promise<void> {
  if (index === undefined || !player$.nowPlaying.peek()) return;
  activeTrackIndex = index;
  try {
    const progress = await TrackPlayer.getProgress();
    const offset = loadedTracks[index]?.startOffset ?? 0;
    player$.position.set(offset + progress.position);
  } catch {
    // Player might be resetting; ignore.
  }
}

/** Book finished — snap position to the end and sync it. */
export function handleQueueEnded(): void {
  const np = player$.nowPlaying.peek();
  if (!np) return;
  player$.position.set(np.duration);
  void syncNow();
}

/** Audio focus changes (phone call, other app playing, unplugged headphones). */
export async function handleRemoteDuck(event: {
  paused: boolean;
  permanent: boolean;
}): Promise<void> {
  if (event.permanent) {
    duckPaused = false;
    await TrackPlayer.pause().catch(() => {});
    void syncNow();
  } else if (event.paused) {
    if (player$.isPlaying.peek()) {
      duckPaused = true;
      await TrackPlayer.pause().catch(() => {});
      void syncNow();
    }
  } else if (duckPaused) {
    duckPaused = false;
    await TrackPlayer.play().catch(() => {});
  }
}

/** Notification seek bar — position is relative to the active track. */
export async function handleRemoteSeek(trackPosition: number): Promise<void> {
  const offset = loadedTracks[activeTrackIndex]?.startOffset ?? 0;
  await seekTo(offset + trackPosition);
}
