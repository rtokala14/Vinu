import { LegendList } from '@legendapp/list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { customAxios } from '~/api/custom-axios';
import { GetLibraryItems200 } from '~/api/models';
import { Container } from '~/components/Container';
import { LibraryItem } from '~/components/library/LibraryItem';
import { Text } from '~/components/ui/text';
import { store$ } from '~/stores';

export default function AllPage() {
  const userLibraryId = store$.currentLibraryId.get();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [params, _] = useState({
    sort: 'media.metadata.title',
    desc: 0,
    filter: '',
    collapseseries: 0,
    include: '',
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['library', userLibraryId, params],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      customAxios<GetLibraryItems200>({
        url: `/api/libraries/${userLibraryId}/items?sort=${params.sort}&desc=${params.desc}&limit=20&page=${pageParam}&minified=1&filter=${params.filter}&collapseseries=${params.collapseseries}&include=${params.include}`,
        method: 'GET',
      }).then((res) => res),
    getNextPageParam: (lastPage, allPages) => {
      const lp = lastPage as GetLibraryItems200;
      const nextPage = allPages.length;
      return lp.results && lp.results.length === 20 ? nextPage : undefined;
    },
  });

  const libraryItems = data
    ? data.pages.flatMap((page) => (page as GetLibraryItems200).results || [])
    : [];
  // const total = data?.pages[0] ? (data.pages[0] as GetLibraryItems200).total : 0;

  return (
    <Container>
      {isLoading ? (
        <View className=" flex flex-1 items-center justify-center rounded-lg bg-card">
          <ActivityIndicator color="#B45309" size="large" />
        </View>
      ) : !libraryItems.length ? (
        <View className=" flex flex-1 items-center justify-center rounded-lg bg-card">
          <Text>No items found</Text>
        </View>
      ) : (
        <LegendList
          data={libraryItems}
          renderItem={({ item }) => <LibraryItem item={item} />}
          numColumns={2}
          recycleItems
          keyExtractor={(item) => item.id!}
          contentContainerStyle={{ padding: 4 }}
          columnWrapperStyle={{ columnGap: 8, rowGap: 8 }}
          estimatedItemSize={160}
          onEndReachedThreshold={2}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
        />
      )}
    </Container>
  );
}
