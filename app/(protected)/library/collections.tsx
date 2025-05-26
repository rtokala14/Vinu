import { LegendList } from '@legendapp/list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ActivityIndicator, View } from 'react-native';

import { customAxios } from '~/api/custom-axios';
import { LibraryItem, LibraryItemExpanded } from '~/api/models';
import { Container } from '~/components/Container';
import { CollectionItemComponent } from '~/components/library/CollectionItem';
import { Text } from '~/components/ui/text';
import { store$ } from '~/stores';

type Collection = {
  id: string;
  libraryId: string;
  userId: string;
  name: string;
  description: string | null;
  books: LibraryItem[];
  lastUpdate: number;
  createdAt: number;
};

export type CollectionExpanded = Omit<Collection, 'books'> & {
  books: LibraryItemExpanded[];
};

type GetLibraryCollections200 = {
  results: CollectionExpanded[];
  total: number;
  limit: number;
  page: number;
};

export default function CollectionsPage() {
  const userLibraryId = store$.currentLibraryId.get();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<GetLibraryCollections200>({
      queryKey: ['collections', userLibraryId],
      initialPageParam: 0,
      queryFn: async ({ pageParam }) =>
        customAxios<GetLibraryCollections200>({
          url: `/api/libraries/${userLibraryId}/collections?limit=20&page=${pageParam}`,
          method: 'GET',
        }).then((res) => res),
      getNextPageParam: (lastPage, allPages) => {
        const lp = lastPage as GetLibraryCollections200;
        const nextPage = allPages.length;
        return lp.results && lp.results.length === 20 ? nextPage : undefined;
      },
    });

  const collections = data
    ? data.pages.flatMap((page) => (page as GetLibraryCollections200).results || [])
    : [];

  if (!isLoading && !collections.length) {
    return <Text>No collections found</Text>;
  }
  return (
    <Container>
      {isLoading ? (
        <View className=" flex flex-1 items-center justify-center rounded-lg bg-card">
          <ActivityIndicator color="#B45309" size="large" />
        </View>
      ) : (
        <LegendList
          data={collections}
          renderItem={({ item }) => <CollectionItemComponent item={item} />}
          numColumns={1}
          recycleItems
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 4 }}
          columnWrapperStyle={{ columnGap: 8, rowGap: 8 }}
          estimatedItemSize={180}
          onEndReachedThreshold={4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
        />
      )}
    </Container>
  );
}
