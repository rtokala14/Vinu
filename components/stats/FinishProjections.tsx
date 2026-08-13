import { Image } from 'expo-image';
import { Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import type { GetListeningStats200Items, MediaProgress } from '~/api/models';
import {
  averageDailyListening,
  formatFinishDate,
  projectFinishDate,
} from '~/components/stats/insights';
import { Card } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';
import { formatDuration, getCoverUri } from '~/lib/utils';
import { store$ } from '~/stores';

const MAX_BOOKS = 3;
const MIN_PROGRESS = 0.005;
/** Don't show a projected date further out than a year — too speculative. */
const MAX_PROJECTION_DAYS = 365;

type Row = {
  itemId: string;
  title: string;
  author?: string;
  progress: number;
  /** Listening time left at the current playback rate, in seconds. */
  remainingListenSeconds: number;
  finishLabel: string | null;
};

/**
 * "On pace" — remaining time and projected finish date for in-progress books.
 * Data: user.mediaProgress (GET /api/me) for progress/currentTime/duration,
 * cross-referenced with the listening-stats items map for titles; `days`
 * (listening-stats) drives the average-daily-pace projection.
 * Remaining = (duration − currentTime) ÷ playbackRate; finish date =
 * today + ceil(remaining ÷ avg daily listening over the last 14 days with
 * listening (min 3 such days, else remaining time only)).
 */
export function FinishProjections({
  mediaProgress,
  items,
  days,
  playbackRate,
}: {
  mediaProgress: MediaProgress[] | undefined;
  items: GetListeningStats200Items | undefined;
  days: Record<string, number>;
  playbackRate: number;
}) {
  const router = useRouter();
  const serverUrl = store$.settings.serverUrl.peek();
  const token = store$.userToken.peek();
  const rate = playbackRate > 0 ? playbackRate : 1;

  const rows = useMemo<Row[]>(() => {
    const avgDaily = averageDailyListening(days);
    return (mediaProgress ?? [])
      .filter(
        (mp) =>
          !mp.isFinished &&
          !mp.episodeId &&
          (mp.progress ?? 0) > MIN_PROGRESS &&
          (mp.duration ?? 0) > 0 &&
          !!mp.libraryItemId
      )
      .sort((a, b) => (b.lastUpdate ?? 0) - (a.lastUpdate ?? 0))
      .slice(0, MAX_BOOKS)
      .map((mp) => {
        const itemId = mp.libraryItemId as string;
        const meta = items?.[itemId]?.mediaMetadata;
        const remainingContent = Math.max(0, (mp.duration ?? 0) - (mp.currentTime ?? 0));
        const remainingListenSeconds = remainingContent / rate;
        let finishLabel: string | null = null;
        if (avgDaily !== null && remainingListenSeconds / avgDaily <= MAX_PROJECTION_DAYS) {
          finishLabel = formatFinishDate(projectFinishDate(remainingListenSeconds, avgDaily));
        }
        return {
          itemId,
          title: meta?.title ?? 'Unknown title',
          author: meta?.authorName ?? undefined,
          progress: Math.min(1, mp.progress ?? 0),
          remainingListenSeconds,
          finishLabel,
        };
      });
  }, [mediaProgress, items, days, rate]);

  if (rows.length === 0) return null;

  return (
    <Card className="p-4">
      <Text className="text-base font-semibold">On pace</Text>
      <View className="mt-2">
        {rows.map((row, index) => (
          <View key={row.itemId}>
            {index > 0 && <Separator className="my-1" />}
            <Pressable
              className="flex-row items-center gap-3 py-2 active:opacity-70"
              onPress={() => router.push(`/item/${row.itemId}` as Href)}>
              <Image
                source={{
                  uri: getCoverUri(row.itemId, serverUrl, 200),
                  headers: { Authorization: `Bearer ${token}` },
                }}
                style={{ width: 40, height: 60, borderRadius: 6 }}
                className="bg-muted"
                contentFit="cover"
                recyclingKey={row.itemId}
                transition={200}
              />
              <View className="min-w-0 flex-1">
                <View className="flex-row items-baseline justify-between gap-2">
                  <Text numberOfLines={1} className="flex-1 text-sm font-medium">
                    {row.title}
                  </Text>
                  <Muted className="text-xs font-medium">{Math.round(row.progress * 100)}%</Muted>
                </View>
                <View className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <View
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, Math.round(row.progress * 100))}%` }}
                  />
                </View>
                <View className="mt-1.5 flex-row items-baseline justify-between gap-2">
                  <Text className="text-xs font-medium">
                    {formatDuration(row.remainingListenSeconds)} left
                    {rate !== 1 ? ` at ${rate}×` : ''}
                  </Text>
                  {row.finishLabel && (
                    <Muted className="text-xs">≈ finishes {row.finishLabel}</Muted>
                  )}
                </View>
              </View>
            </Pressable>
          </View>
        ))}
      </View>
    </Card>
  );
}
