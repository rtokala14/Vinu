import * as Network from 'expo-network';
import { Alert } from 'react-native';
import TrackPlayer, { type AddTrack, State } from 'react-native-track-player';

import { getDeviceId } from './deviceId';
import { ensurePlayerSetup } from './setup';
import { getCurrentChapter, player$ } from './state';

import { customAxios } from '~/api/custom-axios';
import { BookChapter } from '~/api/models';
import {
  flushLocalSessions,
  hasPendingSessionsFor,
  setActiveLocalSession,
  startLocalSession,
  updateLocalSession,
} from '~/lib/downloads/offlineSessions';
import {
  type DownloadEntry,
  downloads$,
  localProgress$,
  resolveDownloadUri,
} from '~/lib/downloads/state';
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
/** Open ABS server session id (streaming OR local-source-with-live-sync). */
let sessionId: string | undefined;
/** Offline ledger session id — set instead of sessionId when unreachable. */
let localSessionId: string | undefined;
/** Epoch ms of the last pause of the loaded item — drives smart rewind. */
let lastPauseAt: number | undefined;
/** True while playLibraryItem is loading a new item (drops re-entrant calls). */
let loadInFlight = false;

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

/**
 * Persists the last-known position for the loaded item to the local progress
 * map — kept in BOTH streaming and local modes so offline playback can resume
 * without the server. Called at every sync point (15s loop, pause, seek).
 */
function recordLocalProgress(extra?: { lastPauseAt?: number }): void {
  const np = player$.nowPlaying.peek();
  if (!np) return;
  const prev = localProgress$[np.libraryItemId].peek();
  localProgress$[np.libraryItemId].set({
    ...prev,
    currentTime: player$.position.peek(),
    updatedAt: Date.now(),
    ...(extra?.lastPauseAt !== undefined ? { lastPauseAt: extra.lastPauseAt } : {}),
  });
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
 * Fire-and-forget progress sync, split by session mode: a live ABS server
 * session posts to /api/session/:id/sync; an offline session accumulates in
 * the persisted local ledger. Never throws — server failures keep the
 * listened time and retry on the next sync. Local position is persisted in
 * both modes.
 */
export async function syncNow(): Promise<void> {
  if (syncInFlight) return;
  if (!sessionId && !localSessionId) return;
  syncInFlight = true;
  flushListened();
  const timeListened = listenedSec;
  listenedSec = 0;
  recordLocalProgress();
  try {
    if (sessionId) {
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
        // Server is reachable — cheap hook point to drain the offline ledger.
        void flushLocalSessions();
      } catch {
        // Offline / server hiccup: re-accumulate so the time isn't lost —
        // but only if this session is still the active one, so a failed
        // sync can't credit its time to the next book's session.
        if (sessionId === id) listenedSec += timeListened;
      }
    } else if (localSessionId) {
      updateLocalSession(localSessionId, {
        currentTime: player$.position.peek(),
        deltaListened: timeListened,
      });
    }
  } finally {
    syncInFlight = false;
  }
}

/** Final sync + close of the currently open session, then clears session state. */
async function closeSession(): Promise<void> {
  stopSyncLoop();
  flushListened();
  playingSince = undefined;
  const timeListened = listenedSec;
  listenedSec = 0;
  recordLocalProgress();

  // Offline session: final update, leave it in the ledger for the next flush.
  const localId = localSessionId;
  localSessionId = undefined;
  if (localId) {
    updateLocalSession(localId, {
      currentTime: player$.position.peek(),
      deltaListened: timeListened,
    });
    setActiveLocalSession(undefined);
    player$.isOfflineSession.set(false);
    void flushLocalSessions();
    return;
  }

  const id = sessionId;
  sessionId = undefined;
  if (!id) return;
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
 * Loads the item and starts playback. If the same item (and episode) is
 * already loaded, simply resumes (with smart rewind) instead.
 *
 * Source selection: a fully downloaded book plays from local files. When the
 * server is reachable a normal server session is STILL opened for live
 * progress sync (local bytes + live sync); when it is not, progress goes to
 * the persisted offline ledger and position resumes from the local progress
 * map. Podcast episodes and non-downloaded items stream as before.
 */
export async function playLibraryItem(
  itemId: string,
  opts?: { episodeId?: string; startAtTime?: number }
): Promise<void> {
  const current = player$.nowPlaying.peek();
  if (
    current &&
    (sessionId || localSessionId) &&
    current.libraryItemId === itemId &&
    current.episodeId === opts?.episodeId
  ) {
    if (opts?.startAtTime !== undefined) {
      await seekTo(opts.startAtTime);
    } else if (!player$.isPlaying.peek()) {
      if (player$.position.peek() >= current.duration - 1) {
        // Finished book: restart from the top instead of resuming a dead queue.
        await seekTo(0);
      } else {
        await applySmartRewind();
      }
    }
    duckPaused = false;
    await TrackPlayer.play();
    return;
  }

  // A load is already in progress (e.g. a double-tap) — drop this call
  // instead of interleaving two queue builds / opening two sessions.
  if (loadInFlight) return;
  loadInFlight = true;
  player$.isLoading.set(true);
  try {
    await ensurePlayerSetup();

    // A sleep timer armed for the previous book must not carry over.
    cancelSleepTimer();

    // Tear down any previous session with a final sync before switching.
    if (sessionId || localSessionId) {
      await TrackPlayer.pause().catch(() => {});
      await closeSession();
    }

    const download = opts?.episodeId ? undefined : downloads$[itemId].peek();
    if (download?.status === 'complete' && download.files.length > 0) {
      await startLocalPlayback(itemId, download, opts?.startAtTime);
    } else {
      await startStreamingPlayback(itemId, opts);
    }

    startSyncLoop();
    await TrackPlayer.play();
  } catch (err) {
    console.warn('playLibraryItem failed:', err);
    Alert.alert(
      'Playback failed',
      "Couldn't start playback. Check your connection to the server and try again."
    );
  } finally {
    loadInFlight = false;
    player$.isLoading.set(false);
  }
}

/** Opens the standard streaming play session and loads the RNTP queue from it. */
async function startStreamingPlayback(
  itemId: string,
  opts?: { episodeId?: string; startAtTime?: number }
): Promise<void> {
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
  localSessionId = undefined;
  activeTrackIndex = index;
  listenedSec = 0;
  playingSince = undefined;
  duckPaused = false;
  lastPauseAt = localProgress$[itemId].lastPauseAt.peek();

  player$.sourceMode.set('stream');
  player$.isOfflineSession.set(false);
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
}

/**
 * Loads the RNTP queue from downloaded files — zero bandwidth. Opens a live
 * server session when reachable (for real-time sync) and falls back to an
 * offline ledger session otherwise.
 */
async function startLocalPlayback(
  itemId: string,
  download: DownloadEntry,
  startAtTime?: number
): Promise<void> {
  const meta = download.itemMeta;
  loadedTracks = download.files.map((f) => ({
    startOffset: f.startOffset,
    duration: f.duration,
  }));
  const totalDuration = meta.duration || loadedTracks.reduce((sum, t) => sum + t.duration, 0);

  // Session mode: try a normal server session (live sync + local bytes).
  // Quick connectivity check first, then a short-timeout open with fallback.
  let session: PlaySessionResponse | undefined;
  const network = await Network.getNetworkStateAsync().catch(() => undefined);
  const maybeOnline = network?.isConnected !== false;
  if (maybeOnline) {
    session = await customAxios<PlaySessionResponse>({
      url: `/api/items/${itemId}/play`,
      method: 'POST',
      timeout: 6_000,
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
    }).catch(() => undefined);
  }

  // Resume position: server progress when we have it and nothing newer is
  // waiting in the offline ledger; otherwise the locally persisted position.
  const localResume = localProgress$[itemId].currentTime.peek();
  let resumeFrom: number;
  if (startAtTime !== undefined) {
    resumeFrom = startAtTime;
  } else if (session && !hasPendingSessionsFor(itemId)) {
    resumeFrom = session.currentTime ?? localResume ?? 0;
  } else {
    resumeFrom = localResume ?? session?.currentTime ?? 0;
  }
  const startTime = clamp(resumeFrom, 0, totalDuration);

  const chapters = meta.chapters.filter((ch): ch is NonNullable<BookChapter> => ch != null);
  const coverUri = meta.coverLocalUri
    ? resolveDownloadUri(meta.coverLocalUri)
    : getCoverUri(itemId, store$.settings.serverUrl.peek());
  const rate = store$.settings.playbackRate.peek() || 1;

  const queue: AddTrack[] = download.files.map((f) => ({
    url: resolveDownloadUri(f.localUri),
    contentType: f.mimeType,
    title: meta.title,
    artist: meta.authorName,
    album: meta.title,
    artwork: coverUri || undefined,
    duration: f.duration,
  }));

  const { index, offset } = trackForPosition(startTime);

  await TrackPlayer.reset();
  await TrackPlayer.add(queue);
  await TrackPlayer.skip(index, offset);
  await TrackPlayer.setRate(rate);

  if (session) {
    sessionId = session.id;
    localSessionId = undefined;
    player$.isOfflineSession.set(false);
  } else {
    sessionId = undefined;
    localSessionId = startLocalSession({
      libraryItemId: itemId,
      mediaType: 'book',
      displayTitle: meta.title,
      displayAuthor: meta.authorName,
      duration: totalDuration,
      currentTime: startTime,
    });
    setActiveLocalSession(localSessionId);
    player$.isOfflineSession.set(true);
  }

  activeTrackIndex = index;
  listenedSec = 0;
  playingSince = undefined;
  duckPaused = false;
  lastPauseAt = localProgress$[itemId].lastPauseAt.peek();

  player$.sourceMode.set('local');
  player$.nowPlaying.set({
    libraryItemId: itemId,
    title: meta.title,
    authorName: meta.authorName,
    coverUri,
    duration: totalDuration,
    chapters,
    sessionId: sessionId ?? localSessionId ?? '',
  });
  player$.position.set(startTime);
  player$.playbackRate.set(rate);
}

export async function togglePlayPause(): Promise<void> {
  if (!player$.nowPlaying.peek()) return;
  if (player$.isPlaying.peek()) {
    await TrackPlayer.pause();
    void syncNow();
  } else {
    await resumePlayback();
  }
}

/**
 * Resumes playback of the loaded item, applying smart rewind first so the
 * position is already correct when the notification/lockscreen updates. Also
 * used by the remote-play (notification) handler.
 */
export async function resumePlayback(): Promise<void> {
  if (player$.nowPlaying.peek() && !player$.isPlaying.peek()) {
    await applySmartRewind();
  }
  duckPaused = false;
  await TrackPlayer.play();
}

// ---------------------------------------------------------------------------
// Smart rewind — rewind on resume, scaled by how long the pause lasted.
// ---------------------------------------------------------------------------

/** Seconds to rewind for a pause of the given length. */
function smartRewindSeconds(pausedForMs: number): number {
  const MINUTE = 60_000;
  if (pausedForMs < MINUTE) return 0;
  if (pausedForMs < 10 * MINUTE) return 5;
  if (pausedForMs < 60 * MINUTE) return 12;
  if (pausedForMs < 24 * 60 * MINUTE) return 20;
  return 30;
}

/**
 * When enabled, seeks backwards before resuming based on the time since the
 * last pause (module state, falling back to the persisted per-item value so
 * it survives app restarts). No-op mid-duck or when nothing was paused.
 */
async function applySmartRewind(): Promise<void> {
  if (!store$.settings.smartRewind.peek()) return;
  if (duckPaused) return;
  const np = player$.nowPlaying.peek();
  if (!np) return;
  const pausedAt = lastPauseAt ?? localProgress$[np.libraryItemId].lastPauseAt.peek();
  if (!pausedAt) return;
  const rewind = smartRewindSeconds(Date.now() - pausedAt);
  // Consume the pause (module state AND the persisted fallback) so a rapid
  // pause/play cycle or a second tap before RNTP reports Playing can't
  // stack a second rewind.
  lastPauseAt = undefined;
  localProgress$[np.libraryItemId].lastPauseAt.set(undefined);
  if (rewind <= 0) return;
  const target = Math.max(0, player$.position.peek() - rewind);
  await seekTo(target).catch(() => {});
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
  // An armed end-of-chapter sleep timer tracks the chapter at the NEW
  // position, not the one captured when it was armed.
  if (player$.sleepTimer.endOfChapter.peek()) {
    sleepChapterEnd = getCurrentChapter()?.end ?? np.duration;
  }
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
  lastPauseAt = undefined;
  player$.nowPlaying.set(undefined);
  player$.isPlaying.set(false);
  player$.position.set(0);
  player$.sourceMode.set('stream');
  player$.isOfflineSession.set(false);
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
    // Remember when we paused (module + persisted) for smart rewind, and
    // capture the position so offline resume is exact even after an app kill.
    lastPauseAt = Date.now();
    recordLocalProgress({ lastPauseAt });
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
