import { LegendList } from '@legendapp/list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { customAxios } from '~/api/custom-axios';
import { GetLibraryItems200 } from '~/api/models';
import { Container } from '~/components/Container';
import { LibraryItem } from '~/components/LibraryItem';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { store$ } from '~/stores';

export default function AllPage() {
  const userLibraryId = store$.currentLibraryId.get();
  const [params, setParams] = useState({
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
  const total = data?.pages[0] ? (data.pages[0] as GetLibraryItems200).total : 0;

  if (isLoading) {
    return <Text>Loading</Text>;
  }

  if (!libraryItems.length) {
    return <Text>No items found</Text>;
  }

  return (
    <Container>
      <LegendList
        data={libraryItems}
        renderItem={({ item }) => <LibraryItem item={item} />}
        numColumns={2}
        recycleItems
        keyExtractor={(item) => item.id!}
        contentContainerStyle={{ padding: 4 }}
        columnWrapperStyle={{ columnGap: 8, rowGap: 8 }}
        estimatedItemSize={180}
        onEndReachedThreshold={2}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
      />
      <View className="-my-3 flex flex-row items-center justify-center gap-2">
        <Button
          onPress={() =>
            setParams((oldParams) => ({ ...oldParams, desc: oldParams.desc === 0 ? 1 : 0 }))
          }>
          <Text>{params.desc === 0 ? 'Asc' : 'Desc'}</Text>
        </Button>
      </View>
    </Container>
  );
}
