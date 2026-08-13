import * as FileSystem from 'expo-file-system';

import {
  DownloadedFile,
  DownloadItemMeta,
  downloadDirForItem,
  downloads$,
  localProgress$,
  resolveDownloadUri,
} from './state';

import { customAxios } from '~/api/custom-axios';
import { BookChapter } from '~/api/models';
import { player$, stopPlayback } from '~/lib/player';
import { store$ } from '~/stores';

// ---------------------------------------------------------------------------
// Expanded item response (minimal shape we consume — validated on ABS 2.32.1)
// ---------------------------------------------------------------------------

type ExpandedAudioFile = {
  ino?: string;
  index?: number;
  duration?: number;
  mimeType?: string;
  metadata?: { size?: number; filename?: string; ext?: string };
};

type ExpandedItemResponse = {
  id: string;
  mediaType?: string;
  media?: {
    duration?: number;
    chapters?: BookChapter[];
    audioFiles?: ExpandedAudioFile[];
    metadata?: { title?: string; authorName?: string };
  };
};

// ---------------------------------------------------------------------------
// FIFO queue — one item downloads at a time, files sequential within an item.
// ---------------------------------------------------------------------------

const queue: string[] = [];
let activeItemId: string | undefined;
let activeResumable: FileSystem.DownloadResumable | undefined;
let activeCancelled = false;

/** Extra headroom (bytes) required beyond the item size before starting. */
const FREE_SPACE_MARGIN = 64 * 1024 * 1024;

/**
 * Queues an item for download (books and podcast episodes' parent items).
 * Also serves as retry: an errored entry is re-queued from scratch. No-op if
 * the item is already queued, downloading, or complete.
 */
export function downloadItem(itemId: string): void {
  const existing = downloads$[itemId].peek();
  if (existing && (existing.status === 'complete' || existing.status === 'downloading')) return;
  if (queue.includes(itemId) || activeItemId === itemId) return;

  downloads$[itemId].set({
    status: 'queued',
    progress: 0,
    itemMeta: existing?.itemMeta ?? {
      title: '',
      authorName: '',
      duration: 0,
      chapters: [],
      size: 0,
    },
    files: [],
  });
  queue.push(itemId);
  void processQueue();
}

/**
 * Cancels a queued or in-flight download and removes any partial files.
 * For completed downloads use deleteDownload instead.
 */
export async function cancelDownload(itemId: string): Promise<void> {
  const queueIndex = queue.indexOf(itemId);
  if (queueIndex !== -1) queue.splice(queueIndex, 1);

  if (activeItemId === itemId) {
    activeCancelled = true;
    await activeResumable?.cancelAsync().catch(() => {});
  }

  downloads$[itemId].delete();
  await FileSystem.deleteAsync(downloadDirForItem(itemId), { idempotent: true }).catch(() => {});
}

/**
 * Deletes a completed download: removes the item directory, its registry
 * entry, and stops playback first if the player is currently playing this
 * item from local files.
 */
export async function deleteDownload(itemId: string): Promise<void> {
  const np = player$.nowPlaying.peek();
  if (np?.libraryItemId === itemId && player$.sourceMode.peek() === 'local') {
    await stopPlayback().catch(() => {});
  }

  const queueIndex = queue.indexOf(itemId);
  if (queueIndex !== -1) queue.splice(queueIndex, 1);
  if (activeItemId === itemId) {
    activeCancelled = true;
    await activeResumable?.cancelAsync().catch(() => {});
  }

  downloads$[itemId].delete();
  await FileSystem.deleteAsync(downloadDirForItem(itemId), { idempotent: true }).catch(() => {});
}

/**
 * Startup reconciliation: verifies that every 'complete' entry still has its
 * files on disk (stored URIs are re-based onto the current app container via
 * resolveDownloadUri, so iOS container moves don't count as missing), and
 * marks entries interrupted by an app kill as 'error' so the user can retry.
 * Call once from app startup.
 */
export async function reconcileDownloads(): Promise<void> {
  const entries = downloads$.peek();
  for (const [itemId, entry] of Object.entries(entries)) {
    if (!entry) continue;

    if (entry.status === 'queued' || entry.status === 'downloading') {
      // In-flight state that survived an app kill — partial files remain.
      await FileSystem.deleteAsync(downloadDirForItem(itemId), { idempotent: true }).catch(
        () => {}
      );
      downloads$[itemId].status.set('error');
      downloads$[itemId].error.set('Download was interrupted');
      downloads$[itemId].progress.set(0);
      continue;
    }

    if (entry.status !== 'complete') continue;

    let intact = entry.files.length > 0;
    for (const file of entry.files) {
      const resolved = resolveDownloadUri(file.localUri);
      const info = await FileSystem.getInfoAsync(resolved).catch(() => ({ exists: false }));
      if (!info.exists) {
        intact = false;
        break;
      }
    }

    if (!intact) {
      downloads$[itemId].status.set('error');
      downloads$[itemId].error.set('Downloaded files are missing');
      downloads$[itemId].progress.set(0);
    }
  }
}

// ---------------------------------------------------------------------------
// Queue worker
// ---------------------------------------------------------------------------

async function processQueue(): Promise<void> {
  if (activeItemId !== undefined) return;
  const itemId = queue.shift();
  if (!itemId) return;

  activeItemId = itemId;
  activeCancelled = false;
  try {
    await runDownload(itemId);
  } catch (err) {
    if (!activeCancelled) {
      const message = friendlyDownloadError(err);
      // Entry may have been deleted by a concurrent cancel.
      if (downloads$[itemId].peek()) {
        downloads$[itemId].status.set('error');
        downloads$[itemId].error.set(message);
      }
      await FileSystem.deleteAsync(downloadDirForItem(itemId), { idempotent: true }).catch(
        () => {}
      );
      console.warn(`Download failed for ${itemId}:`, err);
    }
  } finally {
    activeItemId = undefined;
    activeResumable = undefined;
    activeCancelled = false;
    void processQueue();
  }
}

function friendlyDownloadError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/ENOSPC|no space|disk full|not enough/i.test(raw)) {
    return 'Not enough free storage on this device';
  }
  if (/network|timeout|connection|abort/i.test(raw)) {
    return 'Network error — check your connection and retry';
  }
  return raw || 'Download failed';
}

async function runDownload(itemId: string): Promise<void> {
  const serverUrl = store$.settings.serverUrl.peek();
  const token = store$.userToken.peek() ?? '';
  if (!serverUrl || !token) throw new Error('Not connected to a server');

  // 1. Fetch the expanded item for audio file inodes, sizes and chapters.
  const item = await customAxios<ExpandedItemResponse>({
    url: `/api/items/${itemId}`,
    method: 'GET',
    params: { expanded: 1 },
    timeout: 20_000,
  });

  const audioFiles = (item.media?.audioFiles ?? [])
    .filter((f): f is ExpandedAudioFile & { ino: string } => !!f.ino)
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  if (audioFiles.length === 0) throw new Error('Item has no audio files');

  const totalSize = audioFiles.reduce((sum, f) => sum + (f.metadata?.size ?? 0), 0);
  const chapters = (item.media?.chapters ?? []).filter((ch) => ch != null);
  const meta: DownloadItemMeta = {
    title: item.media?.metadata?.title ?? 'Unknown title',
    authorName: item.media?.metadata?.authorName ?? '',
    duration: item.media?.duration ?? audioFiles.reduce((sum, f) => sum + (f.duration ?? 0), 0),
    chapters,
    size: totalSize,
  };

  if (activeCancelled) return;
  downloads$[itemId].assign({
    status: 'downloading',
    progress: 0,
    error: undefined,
    itemMeta: meta,
  });

  // 2. Fail fast when the device clearly lacks space.
  const freeSpace = await FileSystem.getFreeDiskStorageAsync().catch(() => undefined);
  if (freeSpace !== undefined && totalSize + FREE_SPACE_MARGIN > freeSpace) {
    throw new Error('Not enough free storage on this device');
  }

  const dir = downloadDirForItem(itemId);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  // 3. Cover (best effort — playback works without it).
  const coverUrl = `${serverUrl}/api/items/${itemId}/cover?format=webp&width=800&token=${encodeURIComponent(token)}`;
  const coverUri = `${dir}cover.webp`;
  try {
    const coverResult = await FileSystem.downloadAsync(coverUrl, coverUri);
    if (coverResult.status === 200) {
      downloads$[itemId].itemMeta.coverLocalUri.set(coverUri);
    }
  } catch {
    // Ignore — cover is cosmetic.
  }

  // 4. Audio files, sequential, with size-weighted overall progress.
  const files: DownloadedFile[] = [];
  let startOffset = 0;
  let bytesCompleted = 0;
  let lastProgressUpdate = 0;

  for (const file of audioFiles) {
    if (activeCancelled) return;

    const ext = extensionFor(file);
    const fileUri = `${dir}${file.ino}${ext}`;
    const url = `${serverUrl}/api/items/${itemId}/file/${file.ino}/download?token=${encodeURIComponent(token)}`;
    const fileSize = file.metadata?.size ?? 0;

    const resumable = FileSystem.createDownloadResumable(
      url,
      fileUri,
      { headers: { Authorization: `Bearer ${token}` } },
      (progress) => {
        const now = Date.now();
        if (now - lastProgressUpdate < 400) return;
        lastProgressUpdate = now;
        const overall =
          totalSize > 0 ? (bytesCompleted + progress.totalBytesWritten) / totalSize : 0;
        if (downloads$[itemId].status.peek() === 'downloading') {
          downloads$[itemId].progress.set(Math.min(overall, 0.999));
        }
      }
    );
    activeResumable = resumable;

    const result = await resumable.downloadAsync();
    activeResumable = undefined;
    if (activeCancelled) return;
    if (!result) throw new Error('Download did not complete');
    if (result.status !== 200 && result.status !== 206) {
      throw new Error(`Server responded with status ${result.status}`);
    }

    // Trust the bytes on disk over the catalog size.
    const info = await FileSystem.getInfoAsync(fileUri);
    const actualSize = info.exists && !info.isDirectory ? (info.size ?? fileSize) : fileSize;

    files.push({
      ino: file.ino,
      localUri: fileUri,
      startOffset,
      duration: file.duration ?? 0,
      mimeType: file.mimeType ?? 'audio/mpeg',
      size: actualSize,
    });
    startOffset += file.duration ?? 0;
    bytesCompleted += fileSize;
  }

  if (activeCancelled) return;
  downloads$[itemId].assign({
    status: 'complete',
    progress: 1,
    error: undefined,
    files,
    downloadedAt: Date.now(),
    itemMeta: { ...meta, size: files.reduce((sum, f) => sum + f.size, 0) },
  });
}

function extensionFor(file: ExpandedAudioFile): string {
  const ext = file.metadata?.ext;
  if (ext) return ext.startsWith('.') ? ext : `.${ext}`;
  const filename = file.metadata?.filename;
  const dot = filename?.lastIndexOf('.') ?? -1;
  if (filename && dot > 0) return filename.slice(dot);
  return '.mp3';
}

// ---------------------------------------------------------------------------
// Aggregates for the downloads screen
// ---------------------------------------------------------------------------

/** Total bytes across completed downloads + count. */
export function downloadTotals(): { count: number; bytes: number } {
  let count = 0;
  let bytes = 0;
  for (const entry of Object.values(downloads$.peek())) {
    if (entry?.status === 'complete') {
      count += 1;
      bytes += entry.itemMeta.size;
    }
  }
  return { count, bytes };
}

/** Clears any stale local progress for items that no longer exist on disk. */
export function pruneLocalProgress(): void {
  const downloads = downloads$.peek();
  const progress = localProgress$.peek();
  const STALE_MS = 1000 * 60 * 60 * 24 * 90; // 90 days
  for (const [itemId, p] of Object.entries(progress)) {
    if (!downloads[itemId] && p && Date.now() - p.updatedAt > STALE_MS) {
      localProgress$[itemId].delete();
    }
  }
}
