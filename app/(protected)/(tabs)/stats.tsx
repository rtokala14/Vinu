import { Href, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGetListeningStats } from '~/api/queries/me/me';
import { StatTile } from '~/components/stats/StatTile';
import { DayBar, WeekBars } from '~/components/stats/WeekBars';
import { Card } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { Text } from '~/components/ui/text';
import { H1, Muted } from '~/components/ui/typography';
import { CalendarDays } from '~/lib/icons/CalendarDays';
import { Clock } from '~/lib/icons/Clock';
import { Headphones } from '~/lib/icons/Headphones';
import { TrendingUp } from '~/lib/icons/TrendingUp';
import { formatDuration } from '~/lib/utils';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Local YYYY-MM-DD key matching the ABS days map. */
function dateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Consecutive listening days ending today (or yesterday, if today is still empty). */
function computeStreak(days: Record<string, number>): number {
  const cursor = new Date();
  if (!((days[dateKey(cursor)] ?? 0) > 0)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while ((days[dateKey(cursor)] ?? 0) > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function lastSevenDays(days: Record<string, number>): DayBar[] {
  const bars: DayBar[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = dateKey(date);
    bars.push({
      date: key,
      label: WEEKDAY_LABELS[date.getDay()],
      seconds: days[key] ?? 0,
      isToday: i === 0,
    });
  }
  return bars;
}

function relativeDate(epochMs: number | undefined): string {
  if (!epochMs) return '';
  const diffSec = Math.max(0, (Date.now() - epochMs) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  const diffDays = Math.floor(diffSec / 86400);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(epochMs).toLocaleDateString();
}

export default function StatsPage() {
  const router = useRouter();
  const { data: stats, isLoading, refetch, isRefetching } = useGetListeningStats();

  const days = useMemo(() => (stats?.days ?? {}) as Record<string, number>, [stats]);
  const weekBars = useMemo(() => lastSevenDays(days), [days]);
  const streak = useMemo(() => computeStreak(days), [days]);

  const topItems = useMemo(
    () =>
      Object.values(stats?.items ?? {})
        .sort((a, b) => (b.timeListening ?? 0) - (a.timeListening ?? 0))
        .slice(0, 5),
    [stats]
  );

  const totalHours = Math.floor(((stats?.totalTime as number | undefined) ?? 0) / 3600);
  const recentSessions = stats?.recentSessions ?? [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="px-6 pb-4 pt-2">
        <H1 className="text-3xl">Stats</H1>
      </View>
      {isLoading ? (
        <View className="mx-6 flex-1 items-center justify-center rounded-lg bg-card">
          <ActivityIndicator color="#B45309" size="large" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-6 pb-8"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor="#B45309"
              colors={['#B45309']}
            />
          }>
          <View className="flex-row gap-3">
            <StatTile icon={Clock} label="Today" value={formatDuration(stats?.today)} />
            <StatTile icon={Headphones} label="Total" value={`${totalHours.toLocaleString()}h`} />
          </View>
          <View className="flex-row gap-3">
            <StatTile
              icon={CalendarDays}
              label="Days listened"
              value={Object.keys(days).length.toLocaleString()}
            />
            <StatTile
              icon={TrendingUp}
              label="Streak"
              value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
            />
          </View>

          <Card className="p-4">
            <Text className="text-base font-semibold">Last 7 days</Text>
            <View className="mt-3">
              <WeekBars days={weekBars} />
            </View>
          </Card>

          {topItems.length > 0 && (
            <Card className="p-4">
              <Text className="text-base font-semibold">Most listened</Text>
              <View className="mt-2">
                {topItems.map((item, index) => (
                  <View key={item.id ?? index}>
                    {index > 0 && <Separator className="my-1" />}
                    <Pressable
                      className="flex-row items-center gap-3 py-2 active:opacity-70"
                      onPress={() => item.id && router.push(`/item/${item.id}` as Href)}>
                      <Text className="w-6 text-center text-base font-bold text-primary">
                        {index + 1}
                      </Text>
                      <View className="flex-1">
                        <Text numberOfLines={1} className="text-sm font-medium">
                          {item.mediaMetadata?.title}
                        </Text>
                        <Muted numberOfLines={1} className="text-xs">
                          {item.mediaMetadata?.authorName}
                        </Muted>
                      </View>
                      <Muted className="text-xs font-medium">
                        {formatDuration(item.timeListening)}
                      </Muted>
                    </Pressable>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {recentSessions.length > 0 && (
            <Card className="p-4">
              <Text className="text-base font-semibold">Recent sessions</Text>
              <View className="mt-2">
                {recentSessions.map((session, index) => (
                  <View key={session.id ?? index}>
                    {index > 0 && <Separator className="my-1" />}
                    <Pressable
                      className="flex-row items-center gap-3 py-2 active:opacity-70"
                      onPress={() =>
                        session.libraryItemId &&
                        router.push(`/item/${session.libraryItemId}` as Href)
                      }>
                      <View className="flex-1">
                        <Text numberOfLines={1} className="text-sm font-medium">
                          {session.displayTitle}
                        </Text>
                        <Muted numberOfLines={1} className="text-xs">
                          {session.displayAuthor}
                        </Muted>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs font-medium">
                          {formatDuration(session.timeListening)}
                        </Text>
                        <Muted className="text-xs">{relativeDate(session.updatedAt)}</Muted>
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
