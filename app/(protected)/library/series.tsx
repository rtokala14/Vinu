import { LegendList } from '@legendapp/list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { FlatList, View } from 'react-native';

import { customAxios } from '~/api/custom-axios';
import { GetLibrarySeries200 } from '~/api/models';
import { Container } from '~/components/Container';
import { SeriesItem } from '~/components/SeriesItem';
import SeriesItemSkeleton from '~/components/SeriesItemSkeleton';
import { Text } from '~/components/ui/text';
import { store$ } from '~/stores';

export default function SeriesPage() {
  const userLibraryId = store$.currentLibraryId.get();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['series', userLibraryId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      customAxios<GetLibrarySeries200>({
        url: `/api/libraries/${userLibraryId}/series?sort=name&desc=0&filter=all&limit=20&page=${pageParam}&minified=1&include=rssfeed,numEpisodesIncomplete,share`,
        method: 'GET',
      }).then((res) => res),
    getNextPageParam: (lastPage, allPages) => {
      const lp = lastPage as GetLibrarySeries200;
      const nextPage = allPages.length;
      return lp.results && lp.results.length === 20 ? nextPage : undefined;
    },
  });

  const seriesItems = data
    ? data.pages.flatMap((page) => (page as GetLibrarySeries200).results || [])
    : [];
  const total = data?.pages[0] ? (data.pages[0] as GetLibrarySeries200).total : 0;

  if (isLoading) {
    return (
      <Container>
        <FlatList
          data={Array(10).fill({})}
          renderItem={() => <SeriesItemSkeleton />}
          keyExtractor={(_item, index) => `skeleton-series-${index}`}
          numColumns={1}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: 4,
            width: 'auto',
          }}
        />
      </Container>
    );
  }

  if (!seriesItems.length) {
    return <Text>No series found</Text>;
  }

  return (
    <Container>
      {/* <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <Text>{total}</Text>
      </View> */}
      <LegendList
        data={seriesItems}
        renderItem={({ item }: { item: any }) => <SeriesItem item={item} />}
        numColumns={2}
        recycleItems
        keyExtractor={(item: any) => item.id!}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 4 }}
        columnWrapperStyle={{ columnGap: 8, rowGap: 8 }}
        estimatedItemSize={180}
        onEndReachedThreshold={2}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
      />
    </Container>
  );
}
