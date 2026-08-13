import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Cover art URL for a library item, served by the ABS server. */
export function getCoverUri(itemId: string | undefined, serverUrl: string, width = 400): string {
  if (!itemId || !serverUrl) return '';
  return `${serverUrl}/api/items/${itemId}/cover?format=webp&width=${width}`;
}

/** "20h 27m" style compact duration from seconds. */
export function formatDuration(seconds: number | undefined | null): string {
  if (!seconds || seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** "1:23:45" / "23:45" style clock time from seconds. */
export function formatClock(seconds: number | undefined | null): string {
  if (!seconds || seconds < 0) seconds = 0;
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function parseServerUrl(fullUrl: string | undefined): {
  protocol: 'http' | 'https';
  serverAddress: string;
  serverPort: string;
} {
  if (fullUrl === undefined) {
    return {
      protocol: 'https',
      serverAddress: '',
      serverPort: '',
    };
  }
  try {
    const url = new URL(fullUrl);

    const protocol = url.protocol.slice(0, -1);

    const serverAddress = url.hostname;

    const serverPort = url.port;

    const finalProtocol = protocol === 'http' ? 'http' : 'https';

    return {
      protocol: finalProtocol,
      serverAddress,
      serverPort,
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return {
      protocol: 'https',
      serverAddress: '',
      serverPort: '',
    };
  }
}
