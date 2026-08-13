import { use$ } from '@legendapp/state/react';
import { useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGetLibraries, useGetPersonalizedLibrary } from '~/api/queries/libraries/libraries';
import { OfflineBanner } from '~/components/downloads/OfflineBanner';
import { CARD_WIDTH } from '~/components/home/BookCard';
import { LibrarySwitcher } from '~/components/home/LibrarySwitcher';
import { ShelfRow } from '~/components/home/ShelfRow';
import { Text } from '~/components/ui/text';
import { H2, Muted } from '~/components/ui/typography';
import { LibraryBig } from '~/lib/icons/LibraryBig';
import { store$ } from '~/stores';

function greetingForHour(hour: number): string {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function SkeletonShelf() {
  return (
    <View className="gap-3">
      <View className="mx-6 h-5 w-36 rounded-md bg-muted" />
      <View className="flex-row gap-4 px-6">
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ width: CARD_WIDTH }}>
            <View
              className="rounded-lg bg-muted"
              style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.5 }}
            />
            <View className="mt-2 h-3.5 w-24 rounded bg-muted" />
            <View className="mt-1.5 h-3 w-16 rounded bg-muted" />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function HomePage() {
  const libraryId = use$(store$.currentLibraryId);
  const user = use$(store$.user);
  const { data: librariesData } = useGetLibraries();

  // Fall back to the first library when none is selected yet.
  useEffect(() => {
    const firstId = librariesData?.libraries?.[0]?.id;
    if (!store$.currentLibraryId.peek() && firstId) {
      store$.currentLibraryId.set(firstId);
    }
  }, [librariesData]);

  const {
    data: shelves,
    isLoading,
    refetch,
    isRefetching,
  } = useGetPersonalizedLibrary(libraryId ?? '', { limit: 10 });

  // libraryItemId -> 0..1 progress for the continue-listening / listen-again hairlines.
  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const mp of user?.mediaProgress ?? []) {
      if (mp.libraryItemId && typeof mp.progress === 'number') {
        map[mp.libraryItemId] = mp.progress;
      }
    }
    return map;
  }, [user]);

  const visibleShelves = (shelves ?? []).filter((shelf) => shelf.entities?.length);
  const greeting = greetingForHour(new Date().getHours());
  const username = user?.username;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-6 pb-4 pt-2">
        <View className="flex-1 pr-3">
          <H2 className="border-b-0 pb-0 text-3xl" numberOfLines={1}>
            {greeting}
            {username ? `, ${username}` : ''}
          </H2>
        </View>
        <LibrarySwitcher />
      </View>
      <OfflineBanner />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor="#B45309"
            colors={['#B45309']}
          />
        }>
        {isLoading || !libraryId ? (
          <>
            <SkeletonShelf />
            <SkeletonShelf />
          </>
        ) : !visibleShelves.length ? (
          <View className="mx-6 mt-10 items-center gap-3 rounded-lg bg-card p-8">
            <LibraryBig size={32} className="text-muted-foreground" />
            <Text className="text-lg font-semibold">Nothing here yet</Text>
            <Muted className="text-center">
              Start listening to something and your shelves will show up here.
            </Muted>
          </View>
        ) : (
          visibleShelves.map((shelf) => (
            <ShelfRow key={shelf.id} shelf={shelf} progressMap={progressMap} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
