import { observable } from '@legendapp/state';
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import { syncObservable } from '@legendapp/state/sync';
import * as Crypto from 'expo-crypto';
import * as Network from 'expo-network';
import { AppState } from 'react-native';

import { customAxios } from '~/api/custom-axios';
import { getDeviceId } from '~/lib/player/deviceId';
import { store$ } from '~/stores';

// ---------------------------------------------------------------------------
// LocalSession — the shape ABS accepts on POST /api/session/local-all
// (validated live against ABS 2.32.1).
// ---------------------------------------------------------------------------

export type LocalSession = {
  /** Client-generated UUID (v4). */
  id: string;
  userId: string | null;
  libraryItemId: string;
  episodeId: string | null;
  mediaType: 'book' | 'podcast';
  mediaMetadata: null;
  chapters: never[];
  displayTitle: string;
  displayAuthor: string;
  coverPath: null;
  duration: number;
  /** 3 = local playback. */
  playMethod: number;
  mediaPlayer: string;
  deviceInfo: { clientName: string; deviceId: string };
  serverVersion: null;
  /** YYYY-MM-DD (local time at session start). */
  date: string;
  dayOfWeek: string;
  /** Total seconds listened during this session. */
  timeListening: number;
  /** Position (sec) when the session started. */
  startTime: number;
  /** Latest position (sec). */
  currentTime: number;
  /** Epoch ms. */
  startedAt: number;
  /** Epoch ms. */
  updatedAt: number;
};

type OfflineSessionsState = {
  sessions: LocalSession[];
  /** Message from the most recent failed flush, cleared on success. */
  lastError?: string;
  /** Epoch ms of the last successful flush. */
  lastFlushAt?: number;
};

/** Persisted ledger of offline listening sessions awaiting upload. */
export const offlineSessions$ = observable<OfflineSessionsState>({ sessions: [] });

syncObservable(offlineSessions$, {
  persist: {
    name: 'vinu-offline-sessions',
    plugin: ObservablePersistMMKV,
  },
});

// ---------------------------------------------------------------------------
// Ledger API
// ---------------------------------------------------------------------------

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export type LocalSessionMeta = {
  libraryItemId: string;
  episodeId?: string;
  mediaType: 'book' | 'podcast';
  displayTitle: string;
  displayAuthor: string;
  /** Total media duration in seconds. */
  duration: number;
  /** Position (sec) at session start. */
  currentTime: number;
};

/** Creates and persists a new local listening session; returns its id. */
export function startLocalSession(meta: LocalSessionMeta): string {
  const now = new Date();
  const session: LocalSession = {
    id: Crypto.randomUUID(),
    userId: null,
    libraryItemId: meta.libraryItemId,
    episodeId: meta.episodeId ?? null,
    mediaType: meta.mediaType,
    mediaMetadata: null,
    chapters: [],
    displayTitle: meta.displayTitle,
    displayAuthor: meta.displayAuthor,
    coverPath: null,
    duration: meta.duration,
    playMethod: 3,
    mediaPlayer: 'vinu',
    deviceInfo: { clientName: 'Vinu', deviceId: getDeviceId() },
    serverVersion: null,
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`,
    dayOfWeek: DAY_NAMES[now.getDay()],
    timeListening: 0,
    startTime: meta.currentTime,
    currentTime: meta.currentTime,
    startedAt: now.getTime(),
    updatedAt: now.getTime(),
  };
  offlineSessions$.sessions.push(session);
  return session.id;
}

/**
 * Accumulates listened time and bumps position on a pending local session.
 * Cheap — every update persists straight to MMKV.
 */
export function updateLocalSession(
  id: string,
  update: { currentTime: number; deltaListened: number }
): void {
  const sessions = offlineSessions$.sessions.peek();
  const index = sessions.findIndex((s) => s.id === id);
  if (index === -1) return;
  const session$ = offlineSessions$.sessions[index];
  session$.timeListening.set(session$.timeListening.peek() + Math.max(0, update.deltaListened));
  session$.currentTime.set(update.currentTime);
  session$.updatedAt.set(Date.now());
}

/** True when any item has a pending (unsynced) offline session. */
export function hasPendingSessionsFor(libraryItemId: string): boolean {
  return offlineSessions$.sessions.peek().some((s) => s.libraryItemId === libraryItemId);
}

// ---------------------------------------------------------------------------
// Flushing — upload pending sessions whenever the server is reachable.
// ---------------------------------------------------------------------------

type LocalAllResponse = {
  results?: { id?: string; success?: boolean; progressSynced?: boolean }[];
};

const FLUSH_BATCH_SIZE = 10;

let flushInFlight = false;

/**
 * Id of the local session currently being written by the player, if any.
 * Flushes still UPLOAD it (ABS upserts local sessions by id) but never remove
 * it from the ledger — the final state goes up after the player closes it.
 */
let activeSessionId: string | undefined;

export function setActiveLocalSession(id: string | undefined): void {
  activeSessionId = id;
}

/**
 * Uploads pending offline sessions to /api/session/local-all in batches.
 * Sessions confirmed by the server are removed; failures stay in the ledger
 * for the next attempt. Never throws.
 */
export async function flushLocalSessions(): Promise<void> {
  if (flushInFlight) return;
  if (offlineSessions$.sessions.peek().length === 0) return;
  if (!store$.userToken.peek() || !store$.settings.serverUrl.peek()) return;

  flushInFlight = true;
  try {
    const network = await Network.getNetworkStateAsync().catch(() => undefined);
    if (network && network.isConnected === false) return;

    // Snapshot the ledger up-front; the active session is uploaded with its
    // state as of now (ABS upserts by id, later flushes update it).
    const pending = [...offlineSessions$.sessions.peek()];
    const deviceInfo = { clientName: 'Vinu', deviceId: getDeviceId() };

    for (let i = 0; i < pending.length; i += FLUSH_BATCH_SIZE) {
      const batch = pending.slice(i, i + FLUSH_BATCH_SIZE);
      const response = await customAxios<LocalAllResponse>({
        url: '/api/session/local-all',
        method: 'POST',
        data: { sessions: batch, deviceInfo },
        timeout: 15_000,
      });

      const syncedIds = new Set(
        (response.results ?? []).filter((r) => r.success && r.id).map((r) => r.id as string)
      );
      if (syncedIds.size > 0) {
        // Never remove the session the player is still writing to — it keeps
        // accruing time and is re-uploaded (upserted) on a later flush.
        offlineSessions$.sessions.set(
          offlineSessions$.sessions
            .peek()
            .filter((s) => !syncedIds.has(s.id) || s.id === activeSessionId)
        );
      }
    }

    offlineSessions$.lastError.set(undefined);
    offlineSessions$.lastFlushAt.set(Date.now());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    offlineSessions$.lastError.set(message);
  } finally {
    flushInFlight = false;
  }
}

// ---------------------------------------------------------------------------
// Wiring — call initOfflineSessionSync() once at app startup.
// ---------------------------------------------------------------------------

let syncWired = false;

/**
 * Wires automatic flushing: on network regain, on app foreground, and once at
 * startup. Safe to call more than once. The player additionally kicks a flush
 * after every successful ONLINE progress sync (see lib/player/actions.ts).
 */
export function initOfflineSessionSync(): void {
  if (syncWired) return;
  syncWired = true;

  Network.addNetworkStateListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void flushLocalSessions();
    }
  });

  AppState.addEventListener('change', (status) => {
    if (status === 'active') void flushLocalSessions();
  });

  void flushLocalSessions();
}
