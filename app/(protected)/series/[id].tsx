import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { customAxios } from '~/api/custom-axios';
import type { GetLibraryItems200 } from '~/api/models';
import { BackButton } from '~/components/detail/BackButton';
import { SeriesBookRow } from '~/components/detail/SeriesBookRow';
import { base64Encode } from '~/components/detail/helpers';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';
import { formatDuration } from '~/lib/utils';
import { store$ } from '~/stores';

export default function SeriesScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const libraryId = store$.currentLibraryId.get();

  const query = useQuery({
    queryKey: ['series-items', libraryId, id],
    enabled: !!id && !!libraryId,
    queryFn: () =>
      customAxios<GetLibraryItems200>({
        url: `/api/libraries/${libraryId}/items?filter=series.${encodeURIComponent(
          base64Encode(id ?? '')
        )}&sort=media.metadata.series.sequence&limit=0&minified=1`,
        method: 'GET',
      }),
  });

  const books = query.data?.results ?? [];
  const totalDuration = books.reduce((sum, book) => {
    const media = book.media as { duration?: number } | undefined;
    return sum + (media?.duration ?? 0);
  }, 0);
  const seriesName = name || books[0]?.media?.metadata?.seriesName || 'Series';

  if (query.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <BackButton />
        <ActivityIndicator color="#B45309" size="large" />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <BackButton />
        <Text className="text-center text-muted-foreground">Could not load this series.</Text>
        <Button variant="outline" onPress={() => query.refetch()}>
          <Text>Retry</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <BackButton />
      <FlatList
        data={books}
        keyExtractor={(item, index) => item.id ?? String(index)}
        contentContainerStyle={{
          paddingTop: insets.top + 56,
          paddingBottom: insets.bottom + 32,
        }}
        ListHeaderComponent={
          <View className="px-5 pb-4">
            <Text className="text-2xl font-bold">{seriesName}</Text>
            <Muted className="mt-1">
              {books.length} {books.length === 1 ? 'book' : 'books'}
              {totalDuration > 0 ? ` · ${formatDuration(totalDuration)}` : ''}
            </Muted>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center px-8 pt-12">
            <Text className="text-center text-muted-foreground">
              No books found in this series.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SeriesBookRow
            item={item}
            onPress={() =>
              item.id && router.push({ pathname: '/item/[id]', params: { id: item.id } })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
