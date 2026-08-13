import { use$ } from '@legendapp/state/react';
import { useQuery } from '@tanstack/react-query';
import { Href, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getListeningSessions, useGetListeningStats, useGetMe } from '~/api/queries/me/me';
import { FinishProjections } from '~/components/stats/FinishProjections';
import { GoalRing } from '~/components/stats/GoalRing';
import { Heatmap } from '~/components/stats/Heatmap';
import { HourClock } from '~/components/stats/HourClock';
import { SpeedDividend } from '~/components/stats/SpeedDividend';
import { StatTile } from '~/components/stats/StatTile';
import { DayBar, WeekBars } from '~/components/stats/WeekBars';
import { dateKey, type SessionWithExtras } from '~/components/stats/insights';
import { Card } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { Text } from '~/components/ui/text';
import { H1, Muted } from '~/components/ui/typography';
import { CalendarDays } from '~/lib/icons/CalendarDays';
import { Clock } from '~/lib/icons/Clock';
import { Headphones } from '~/lib/icons/Headphones';
import { TrendingUp } from '~/lib/icons/TrendingUp';
import { formatDuration } from '~/lib/utils';
import { store$ } from '~/stores';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SESSIONS_PER_PAGE = 100;
const SESSION_PAGES = 3; // ~300 recent sessions is plenty for hour-of-day insight

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

/** First `SESSION_PAGES` pages of recent sessions (newest first). */
async function fetchRecentSessions(): Promise<SessionWithExtras[]> {
  const first = await getListeningSessions({ itemsPerPage: SESSIONS_PER_PAGE, page: 0 });
  const extraPages = Math.max(0, Math.min(SESSION_PAGES - 1, (first.numPages ?? 1) - 1));
  const rest = await Promise.all(
    Array.from({ length: extraPages }, (_, i) =>
      getListeningSessions({ itemsPerPage: SESSIONS_PER_PAGE, page: i + 1 })
    )
  );
  return [first, ...rest].flatMap((p) => (p.sessions ?? []) as SessionWithExtras[]);
}

export default function StatsPage() {
  const router = useRouter();
  const goalMinutesPerDay = use$(store$.settings.goalMinutesPerDay);
  const playbackRate = use$(store$.settings.playbackRate);

  const { data: stats, isLoading, refetch: refetchStats, isRefetching } = useGetListeningStats();
  // Fresh /api/me for mediaProgress (finish projections); store$.user can be stale.
  const { data: me, refetch: refetchMe } = useGetMe();
  const { data: recentSessionPages, refetch: refetchSessions } = useQuery({
    queryKey: ['stats', 'recent-sessions'],
    queryFn: fetchRecentSessions,
  });

  const onRefresh = useCallback(() => {
    refetchStats();
    refetchMe();
    refetchSessions();
  }, [refetchStats, refetchMe, refetchSessions]);

  // Merge `today` into the days map: right after midnight the server's days
  // map can lag behind the `today` field, and every chart reads from `days`.
  const days = useMemo(() => {
    const map = { ...((stats?.days ?? {}) as Record<string, number>) };
    const todayKey = dateKey(new Date());
    map[todayKey] = Math.max(map[todayKey] ?? 0, stats?.today ?? 0);
    return map;
  }, [stats]);
  const weekBars = useMemo(() => lastSevenDays(days), [days]);
  const streak = useMemo(() => computeStreak(days), [days]);
  const daysListened = useMemo(() => Object.values(days).filter((s) => s > 0).length, [days]);

  const topItems = useMemo(
    () =>
      Object.values(stats?.items ?? {})
        .sort((a, b) => (b.timeListening ?? 0) - (a.timeListening ?? 0))
        .slice(0, 5),
    [stats]
  );
  const topItemMax = topItems[0]?.timeListening ?? 0;

  const totalHours = Math.floor(((stats?.totalTime as number | undefined) ?? 0) / 3600);
  const todaySeconds = stats?.today ?? 0;
  const recentSessions = (stats?.recentSessions ?? []) as SessionWithExtras[];
  const hourSessions = recentSessionPages ?? [];

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
              onRefresh={onRefresh}
              tintColor="#B45309"
              colors={['#B45309']}
            />
          }>
          <View className="flex-row gap-3">
            {goalMinutesPerDay > 0 ? (
              <GoalRing todaySeconds={todaySeconds} goalMinutes={goalMinutesPerDay} />
            ) : (
              <StatTile icon={Clock} label="Today" value={formatDuration(todaySeconds)} />
            )}
            <StatTile icon={Headphones} label="Total" value={`${totalHours.toLocaleString()}h`} />
          </View>
          <View className="flex-row gap-3">
            <StatTile
              icon={CalendarDays}
              label="Days listened"
              value={daysListened.toLocaleString()}
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

          <Heatmap days={days} />

          <FinishProjections
            mediaProgress={me?.mediaProgress ?? store$.user.peek()?.mediaProgress}
            items={stats?.items}
            days={days}
            playbackRate={playbackRate}
          />

          <HourClock sessions={hourSessions} />

          <SpeedDividend playbackRate={playbackRate} />

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
                      <View className="min-w-0 flex-1">
                        <Text numberOfLines={1} className="text-sm font-medium">
                          {item.mediaMetadata?.title}
                        </Text>
                        <Muted numberOfLines={1} className="text-xs">
                          {item.mediaMetadata?.authorName}
                        </Muted>
                        {/* Proportional hairline: time vs. the #1 item (single-hue magnitude). */}
                        {topItemMax > 0 && (
                          <View className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                            <View
                              className="h-full rounded-full bg-primary/60"
                              style={{
                                width: `${Math.max(2, Math.round(((item.timeListening ?? 0) / topItemMax) * 100))}%`,
                              }}
                            />
                          </View>
                        )}
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
                      <View className="min-w-0 flex-1">
                        <Text numberOfLines={1} className="text-sm font-medium">
                          {session.displayTitle}
                        </Text>
                        <Muted numberOfLines={1} className="text-xs">
                          {session.displayAuthor}
                        </Muted>
                        {!!session.deviceInfo?.deviceName && (
                          <Muted numberOfLines={1} className="text-[10px]">
                            via {session.deviceInfo.deviceName}
                          </Muted>
                        )}
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
