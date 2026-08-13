import { observable } from '@legendapp/state';
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import { syncObservable } from '@legendapp/state/sync';
import * as FileSystem from 'expo-file-system';

import { BookChapter } from '~/api/models';

// ---------------------------------------------------------------------------
// Downloads registry — persisted map of everything on disk (or on its way).
// Keep every value JSON-serializable: this whole tree round-trips via MMKV.
// ---------------------------------------------------------------------------

export type DownloadStatus = 'queued' | 'downloading' | 'complete' | 'error';

export type DownloadedFile = {
  /** ABS inode id of the audio file — download URL is derived from it. */
  ino: string;
  /** file:// URI as written at download time. Resolve via resolveDownloadUri(). */
  localUri: string;
  /** Global book position (sec) at which this file starts. */
  startOffset: number;
  /** Duration of this file in seconds. */
  duration: number;
  mimeType: string;
  /** Size in bytes (from ABS file metadata). */
  size: number;
};

export type DownloadItemMeta = {
  title: string;
  authorName: string;
  /** Total duration in seconds across all audio files. */
  duration: number;
  chapters: BookChapter[];
  /** file:// URI of the downloaded cover, if the cover download succeeded. */
  coverLocalUri?: string;
  /** Total size in bytes across all audio files. */
  size: number;
};

export type DownloadEntry = {
  status: DownloadStatus;
  /** 0..1 across all files of the item, weighted by file size. */
  progress: number;
  error?: string;
  itemMeta: DownloadItemMeta;
  files: DownloadedFile[];
  /** Epoch ms when the download completed. */
  downloadedAt?: number;
};

/** Persisted map keyed by libraryItemId. */
export const downloads$ = observable<Record<string, DownloadEntry>>({});

syncObservable(downloads$, {
  persist: {
    name: 'vinu-downloads',
    plugin: ObservablePersistMMKV,
  },
});

// ---------------------------------------------------------------------------
// Local playback progress — last-known position per item, kept in BOTH
// streaming and local modes so offline playback can resume without a server.
// ---------------------------------------------------------------------------

export type LocalProgress = {
  /** Global book position in seconds. */
  currentTime: number;
  /** Epoch ms of the last progress write. */
  updatedAt: number;
  /** Epoch ms of the last pause — drives smart rewind. */
  lastPauseAt?: number;
};

export const localProgress$ = observable<Record<string, LocalProgress>>({});

syncObservable(localProgress$, {
  persist: {
    name: 'vinu-local-progress',
    plugin: ObservablePersistMMKV,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DOWNLOADS_SEGMENT = 'downloads/';

/** Root directory that all item downloads live under. */
export function downloadsRootDir(): string {
  return `${FileSystem.documentDirectory ?? ''}${DOWNLOADS_SEGMENT}`;
}

/** Directory for a single item's downloaded files. */
export function downloadDirForItem(itemId: string): string {
  return `${downloadsRootDir()}${itemId}/`;
}

/**
 * Re-bases a stored file:// URI onto the CURRENT document directory. On iOS
 * the app container path changes across app updates, which would break
 * absolute URIs persisted at download time.
 */
export function resolveDownloadUri(storedUri: string): string {
  const idx = storedUri.lastIndexOf(DOWNLOADS_SEGMENT);
  if (idx === -1) return storedUri;
  return `${downloadsRootDir()}${storedUri.slice(idx + DOWNLOADS_SEGMENT.length)}`;
}

/** True when the item is fully downloaded and playable from disk. */
export function isDownloaded(itemId: string): boolean {
  return downloads$[itemId].status.peek() === 'complete';
}

/** "1.2 GB" / "348 MB" style size from bytes. */
export function formatBytes(bytes: number | undefined | null): string {
  if (!bytes || bytes <= 0) return '0 MB';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${Math.round(mb)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
