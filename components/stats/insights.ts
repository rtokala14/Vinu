import type { DeviceInfo, PlaybackSession } from '~/api/models';

/**
 * Live ABS servers (2.x) return more session fields than the generated
 * OpenAPI types declare. Extend locally instead of editing generated code.
 */
export type SessionWithExtras = PlaybackSession & {
  /** Epoch ms when the session started (present on live servers). */
  startedAt?: number;
  deviceInfo?: DeviceInfo & { deviceName?: string };
};

/** Local YYYY-MM-DD key matching the ABS `days` map. */
export function dateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD key as a LOCAL date (never UTC). */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Quartile thresholds (q1, q2, q3) of a list of positive values. */
export function quartileThresholds(nonzero: number[]): [number, number, number] {
  if (nonzero.length === 0) return [0, 0, 0];
  const sorted = [...nonzero].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return [at(0.25), at(0.5), at(0.75)];
}

/** 0..3 intensity step for a positive value against quartile thresholds. */
export function intensityStep(
  value: number,
  [q1, q2, q3]: [number, number, number]
): 0 | 1 | 2 | 3 {
  if (value <= q1) return 0;
  if (value <= q2) return 1;
  if (value <= q3) return 2;
  return 3;
}

/** Sum of listening seconds per LOCAL hour-of-day (24 buckets) from sessions. */
export function bucketSessionsByHour(sessions: SessionWithExtras[]): number[] {
  const buckets = new Array<number>(24).fill(0);
  for (const s of sessions) {
    const startedAt = s.startedAt;
    const seconds = s.timeListening ?? 0;
    if (!startedAt || seconds <= 0) continue;
    buckets[new Date(startedAt).getHours()] += seconds;
  }
  return buckets;
}

/** "12 am", "9 am", "12 pm", "11 pm". */
export function formatHour(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${hour < 12 ? 'am' : 'pm'}`;
}

/**
 * Average seconds listened per ACTIVE day over the last `lookbackDays`
 * (today inclusive). Returns null when fewer than `minActiveDays` days
 * had any listening — too little signal for a projection.
 */
export function averageDailyListening(
  days: Record<string, number>,
  lookbackDays = 14,
  minActiveDays = 3
): number | null {
  let sum = 0;
  let active = 0;
  const cursor = new Date();
  for (let i = 0; i < lookbackDays; i++) {
    const seconds = days[dateKey(cursor)] ?? 0;
    if (seconds > 0) {
      sum += seconds;
      active += 1;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return active >= minActiveDays ? sum / active : null;
}

/**
 * Date the remaining listening finishes, assuming `avgDailySeconds` of
 * listening per day from today: today + ceil(remaining / avgDaily).
 */
export function projectFinishDate(remainingListenSeconds: number, avgDailySeconds: number): Date {
  const daysNeeded = Math.ceil(remainingListenSeconds / avgDailySeconds);
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + Math.max(0, daysNeeded));
  return d;
}

/** "today" / "tomorrow" / "Tue, Aug 19". */
export function formatFinishDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
